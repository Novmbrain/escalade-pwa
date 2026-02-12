# Implementation Plan: Magic Link + Passkey Authentication

> Architecture doc: `doc/plans/2026-02-12-auth-magic-link-passkey.md`
> Created: 2026-02-12
> Status: Draft — Awaiting Approval

---

## Overview

在 BlocTop PWA 中实现无密码认证系统。用户通过 Magic Link 注册/恢复，Passkey 日常登录。
编辑器从客户端硬编码密码迁移到 server-side session + role 检查。

### Scope Boundary

**IN scope:** better-auth 集成、Magic Link 登录、Passkey 注册/认证、编辑器权限迁移、i18n、Profile 页面改造
**OUT of scope:** OAuth (GitHub/Google)、密码认证、OTP 短信、用户头像上传、现有页面的 auth 检查

---

## Pre-flight Checks

在开始实施前需要确认的事项：

- [ ] Resend 账号已注册，域名 `bouldering.top` 已验证（DNS 记录已配置）
- [ ] Vercel 环境变量 `BETTER_AUTH_SECRET`、`RESEND_API_KEY`、`NEXT_PUBLIC_APP_URL` 已准备好
- [ ] 管理员邮箱已确定（用于 MongoDB 设置 admin role）

---

## Phase 1: Core Auth Infrastructure (Magic Link MVP)

**Goal:** 邮箱输入 → 收到 Magic Link → 点击登录 → Session 建立

### Step 1.1 — Install Dependencies & Environment Config

**Files:**
- `package.json` — add `better-auth`, `@better-auth/passkey`, `resend`
- `.env.example` — add 3 new vars
- `.env.local` — add local dev values

**Actions:**
```bash
npm install better-auth @better-auth/passkey resend
```

**Append to `.env.example`:**
```
BETTER_AUTH_SECRET=        # Session signing secret (32+ chars)
RESEND_API_KEY=            # Resend API key (re_xxxx)
NEXT_PUBLIC_APP_URL=       # App URL (https://bouldering.top)
```

**Verify:** `npm run build` still succeeds (no breaking changes from deps)

---

### Step 1.2 — Server Auth Config

**New file:** `src/lib/auth.ts`

**Key design decisions:**
- `getDatabase()` returns `Promise<Db>` — better-auth's `mongodbAdapter` expects a `Db` instance
- Need to handle top-level await: use factory function pattern or dynamic import
- Phase 1 only enables `magicLink` plugin (Passkey added in Phase 2)
- `rpID` set to `"bouldering.top"` in production, `"localhost"` in dev
- Session: 30-day expiry, daily refresh, 5-minute cookie cache
- Rate limit: 10 req/60s window (better-auth built-in)

**Implementation outline:**
```typescript
// src/lib/auth.ts
import { betterAuth } from "better-auth"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import { magicLink } from "better-auth/plugins"
import { Resend } from "resend"
import { getDatabase } from "@/lib/mongodb"
import { magicLinkEmailTemplate } from "@/lib/email-templates"

const resend = new Resend(process.env.RESEND_API_KEY)

export const auth = betterAuth({
  database: mongodbAdapter(await getDatabase()),
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "user" },
    },
  },
  plugins: [
    magicLink({
      expiresIn: 600,
      sendMagicLink: async ({ email, url }) => {
        await resend.emails.send({
          from: "寻岩记 <noreply@bouldering.top>",
          to: email,
          subject: "登录寻岩记 BlocTop",
          html: magicLinkEmailTemplate(url),
        })
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  rateLimit: { window: 60, max: 10 },
})
```

**Risk: top-level await in `auth.ts`**
- `await getDatabase()` at module scope requires ESM or Next.js bundler support
- If it fails: fallback to lazy init pattern where `auth` is a function returning Promise
- Alternative: pass `clientPromise` directly to adapter if it accepts a Promise<Db>
- **Research needed:** Check better-auth's mongodbAdapter signature — does it accept `Db` or `MongoClient`?

**Verify:** TypeScript compiles, no runtime errors on import

---

### Step 1.3 — Auth Client Config

**New file:** `src/lib/auth-client.ts`

```typescript
import { createAuthClient } from "better-auth/client"
import { magicLinkClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [magicLinkClient()],
})

export const { signIn, signOut, useSession, getSession } = authClient
```

**Note:** `passkeyClient()` added in Phase 2. Keep this file minimal for MVP.

**Verify:** Client-side import works, no SSR errors

---

### Step 1.4 — API Route Handler

**New file:** `src/app/api/auth/[...all]/route.ts`

```typescript
import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth)
```

**Verify:**
- `GET /api/auth/session` returns `{ session: null }` (not logged in)
- No 500 errors in Vercel logs

---

### Step 1.5 — Email Template

**New file:** `src/lib/email-templates.ts`

Simple HTML template with inline styles for maximum email client compatibility.
No external CSS, no images (to pass spam filters).

**Verify:** Send a test email via Resend dashboard — renders correctly in Gmail, Outlook

---

### Step 1.6 — Database Migration

**Action:**
```bash
npx @better-auth/cli migrate
```

This creates MongoDB collections: `users`, `sessions`, `accounts`, `verifications`
with appropriate indexes.

**Verify:**
- Collections exist in MongoDB Atlas
- Indexes match schema from architecture doc (Section 三)
- **Existing collections** (`crags`, `routes`, `feedbacks`, `visits`) are untouched

---

### Step 1.7 — Login Page (Magic Link Only)

**New file:** `src/app/[locale]/login/page.tsx`

**Component structure:**
- Client Component (`'use client'`)
- Email input with `autocomplete="email"` (add `webauthn` in Phase 2)
- "发送登录链接" button → calls `authClient.signIn.magicLink({ email, callbackURL: '/' })`
- Success state: "请查收邮箱" message + countdown timer for resend (60s)
- Error handling: rate limit toast, invalid email toast

**UI follows existing design system:**
- Uses `var(--theme-*)` CSS variables
- Uses `<Input>` from `@/components/ui/input` (not raw `<input>`)
- Mobile-first, centered layout within `--app-shell-width`

**Verify:**
- Page renders at `/zh/login`
- Enter email → see "链接已发送" state
- Check email → click link → redirected to home with session cookie
- Repeat with same email → logs in (not duplicate user)

---

### Step 1.8 — Magic Link Verify Page

**New file:** `src/app/[locale]/auth/verify/page.tsx`

Intermediate page shown when Magic Link is clicked:
- Shows "验证中..." spinner
- better-auth handles token validation via API
- On success: redirect to `/` or `/auth/passkey-setup` (Phase 2)
- On failure: show "链接已过期或无效" with retry button

**Note:** This page may not be strictly necessary if better-auth handles redirect automatically. Research better-auth's magic link flow to determine if a custom verify page is needed or if the callback URL is sufficient.

**Verify:** Full flow end-to-end: email → click → verify → session established

---

### Phase 1 Checkpoint

At this point we should have:
- [x] `npm run build` passes
- [x] `npm run lint` passes
- [x] Login page renders, sends magic link email
- [x] Clicking magic link creates session
- [x] `GET /api/auth/session` returns user data when logged in
- [x] Existing functionality (crags, routes, offline) unaffected
- [x] No changes to `middleware.ts`

**User contribution opportunity:** Login page UI — the visual design and error states have multiple valid approaches. You may want to shape the look and feel.

---

## Phase 2: Passkey Integration

**Goal:** Users can register Passkey after Magic Link login, then use biometrics for future logins

### Step 2.1 — Add Passkey Plugin to Server Config

**Modify:** `src/lib/auth.ts`

Add `passkey()` to plugins array:
```typescript
import { passkey } from "@better-auth/passkey"

plugins: [
  magicLink({ ... }),
  passkey({
    rpID: process.env.NODE_ENV === "production" ? "bouldering.top" : "localhost",
    rpName: "寻岩记 BlocTop",
    origin: process.env.NEXT_PUBLIC_APP_URL!,
    authenticatorAttachment: "platform",
    userVerification: "required",
    residentKey: "required",
  }),
],
```

**Verify:** `npx @better-auth/cli migrate` creates `passkeys` collection

---

### Step 2.2 — Add Passkey Client Plugin

**Modify:** `src/lib/auth-client.ts`

```typescript
import { passkeyClient } from "@better-auth/passkey/client"

plugins: [
  magicLinkClient(),
  passkeyClient(),
],
```

**Verify:** `authClient.passkey` namespace available

---

### Step 2.3 — Passkey Setup Page

**New file:** `src/app/[locale]/auth/passkey-setup/page.tsx`

- Only accessible after successful Magic Link login (redirect if no session)
- Shows: "设置快速登录 — 下次用指纹/面容直接登录"
- "设置 Passkey" button → calls `authClient.passkey.addPasskey()`
- "稍后设置" link → navigate to home
- Success state: confetti/checkmark → redirect to home

**Verify:**
- After Magic Link login → redirected here
- Click "设置 Passkey" → system biometric prompt → registered
- "稍后设置" → home page (no Passkey registered)

---

### Step 2.4 — Enhance Login Page with Passkey

**Modify:** `src/app/[locale]/login/page.tsx`

Add:
1. `autocomplete="email webauthn"` to email input
2. On mount: `signIn.passkey({ autoFill: true })` for Conditional UI
3. Explicit "Passkey 登录" button below email form
4. Button calls `signIn.passkey()` → system biometric prompt

**Verify:**
- Registered Passkey device → browser auto-suggests Passkey on page load
- Click "Passkey 登录" → biometric → session established → redirected home
- New device (no Passkey) → Magic Link flow still works

---

### Step 2.5 — Passkey Management Hook

**New file:** `src/hooks/use-passkey-management.ts`

Provides: `passkeys`, `isLoading`, `addPasskey(name?)`, `deletePasskey(id)`

**Verify:** Unit test — mock `authClient.passkey.*` methods, verify state transitions

---

### Phase 2 Checkpoint

- [x] Register Passkey after Magic Link login
- [x] Login with Passkey on registered device
- [x] Fallback to Magic Link on new device
- [x] Conditional UI works (browser auto-suggests Passkey)
- [x] `npm run test:run` — all existing tests pass + new hook tests

---

## Phase 3: Profile Page + Editor Permissions

**Goal:** Replace hardcoded password with session-based auth, manage Passkeys in Profile

### Step 3.1 — Create Editor Layout with Auth Guard

**New file:** `src/app/[locale]/editor/layout.tsx`

```typescript
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "@/i18n/navigation"

export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session || session.user.role !== "admin") {
    redirect("/login")
  }

  return <>{children}</>
}
```

**Critical consideration:**
- Current editor pages are `'use client'` components
- Adding a Server Component layout.tsx is compatible — children remain client components
- The layout runs server-side, checks session, then renders client children
- No change needed to existing editor page files

**Verify:**
- Not logged in → `/editor` redirects to `/login`
- Logged in as `role: "user"` → `/editor` redirects to `/login`
- Logged in as `role: "admin"` → `/editor` renders normally
- All editor sub-pages (`/editor/faces`, `/editor/routes`, `/editor/betas`) protected

---

### Step 3.2 — Set Admin Role in MongoDB

**One-time manual operation:**
```javascript
db.users.updateOne(
  { email: "admin@bouldering.top" },
  { $set: { role: "admin" } }
)
```

**Consider:** Create a `scripts/set-admin.ts` script for reproducibility.

**Verify:** `db.users.findOne({ email: "admin@..." })` shows `role: "admin"`

---

### Step 3.3 — Refactor Profile Page

**Modify:** `src/app/[locale]/profile/page.tsx`

**Changes:**
1. **Remove** editor password drawer (lines 494-561)
2. **Remove** all password-related state (`editorPassword`, `editorPasswordError`, `passwordInputRef`, `handleEditorPasswordSubmit`)
3. **Add** auth status section at top of page:
   - Logged in: show email, "退出登录" button, link to Passkey management
   - Not logged in: show "登录/注册" button → navigate to `/login`
4. **Replace** editor entry button:
   - Logged in as admin: show direct link to `/editor` (no password)
   - Not admin or not logged in: hide editor entry entirely
5. **Add** Passkey management section (uses `usePasskeyManagement` hook):
   - List registered Passkeys with device name and date
   - "添加新设备" button
   - Delete button per Passkey (with confirmation)

**User contribution opportunity:** The Profile page redesign involves significant UX decisions — how to present auth status, what information to show, and how to organize the Passkey management UI. This is where your design input matters most.

**Verify:**
- Not logged in → shows "登录/注册" button, no editor entry
- Logged in as user → shows email, logout, no editor entry
- Logged in as admin → shows email, logout, direct editor link
- Passkey list shows registered devices
- Add/delete Passkey works

---

### Step 3.4 — Auth Error Codes

**Modify:** `src/lib/api-error-codes.ts`

Add to `API_ERROR_CODES`:
```typescript
// Auth 相关
AUTH_REQUIRED: 'AUTH_REQUIRED',
AUTH_INVALID_SESSION: 'AUTH_INVALID_SESSION',
AUTH_INSUFFICIENT_ROLE: 'AUTH_INSUFFICIENT_ROLE',
AUTH_MAGIC_LINK_EXPIRED: 'AUTH_MAGIC_LINK_EXPIRED',
AUTH_PASSKEY_FAILED: 'AUTH_PASSKEY_FAILED',
AUTH_EMAIL_SEND_FAILED: 'AUTH_EMAIL_SEND_FAILED',
```

**Verify:** TypeScript compiles

---

### Phase 3 Checkpoint

- [x] Editor requires admin session (no more hardcoded password)
- [x] Profile shows auth status and Passkey management
- [x] Existing functionality unaffected
- [x] `npm run lint` + `npm run test:run` pass

---

## Phase 4: i18n + Polish

**Goal:** Full internationalization, error handling, and production readiness

### Step 4.1 — i18n Translation Keys

**Modify:** `messages/zh.json`, `messages/en.json`, `messages/fr.json`

Add `Auth` namespace with all keys from architecture doc Section 九.

Also update `Profile` namespace:
- Remove password-related keys (`editorPasswordTitle`, `editorPasswordPlaceholder`, `editorPasswordWrong`, `editorPasswordConfirm`)
- Add auth-related keys (`loggedInAs`, `logout`, `loginOrRegister`, `passkeyManagement`, etc.)

**Verify:** No missing translation warnings in dev console

---

### Step 4.2 — Error Handling & Toast Integration

**Modify:** Login page, Passkey setup page, Profile page

Add toast notifications for:
- Magic Link sent successfully
- Magic Link send failed (rate limit, invalid email)
- Passkey registration success/failure
- Passkey deletion success
- Logout success
- Session expired → redirect to login with message

Uses existing toast system from `@/components/ui/toast`.

**Verify:** Each error state shows appropriate toast

---

### Step 4.3 — Email Template Polish

**Modify:** `src/lib/email-templates.ts`

- Add multi-language support (based on user's locale preference)
- Improve visual design while keeping inline-only CSS
- Add plain text fallback

**Verify:** Email renders correctly in Gmail, Outlook, Apple Mail

---

### Step 4.4 — Cache & SW Considerations

**Verify (no code changes needed):**
- `/api/auth/*` responses are NOT cached by Service Worker
- Auth cookies have correct attributes (`httpOnly`, `secure`, `sameSite: lax`)
- CSP headers don't block auth API calls

---

### Step 4.5 — Documentation Updates

**Modify:** `CLAUDE.md`
- Add `src/lib/auth.ts`, `src/lib/auth-client.ts` to Project Structure
- Add new pages to directory listing
- Add new env vars to Environment Variables table
- Add auth-related API routes to API Routes table
- Update editor section to mention session-based auth

**Modify:** `doc/PROJECT_OVERVIEW.md`
- Add authentication architecture section

---

### Phase 4 Checkpoint (Ship Ready)

- [x] All 3 languages have complete Auth translations
- [x] Error states handled with toast feedback
- [x] Email template looks professional
- [x] `npm run build` passes
- [x] `npm run lint` passes
- [x] `npm run test:run` — all tests pass
- [x] Manual E2E: Magic Link flow, Passkey flow, Editor access, Profile page
- [x] Documentation updated

---

## File Change Summary

### New Files (8)

| File | Phase | Description |
|------|-------|-------------|
| `src/lib/auth.ts` | 1.2 | better-auth server config |
| `src/lib/auth-client.ts` | 1.3 | better-auth client config |
| `src/lib/email-templates.ts` | 1.5 | Magic Link email HTML |
| `src/app/api/auth/[...all]/route.ts` | 1.4 | Auth catch-all route |
| `src/app/[locale]/login/page.tsx` | 1.7 | Login page |
| `src/app/[locale]/auth/verify/page.tsx` | 1.8 | Magic Link verify (if needed) |
| `src/app/[locale]/auth/passkey-setup/page.tsx` | 2.3 | Passkey setup guide |
| `src/hooks/use-passkey-management.ts` | 2.5 | Passkey CRUD hook |

### Modified Files (7)

| File | Phase | Changes |
|------|-------|---------|
| `package.json` | 1.1 | +3 deps |
| `.env.example` | 1.1 | +3 env vars |
| `src/lib/auth.ts` | 2.1 | Add passkey plugin |
| `src/lib/auth-client.ts` | 2.2 | Add passkeyClient plugin |
| `src/app/[locale]/profile/page.tsx` | 3.3 | Remove password, add auth UI |
| `src/lib/api-error-codes.ts` | 3.4 | Add auth error codes |
| `messages/*.json` (×3) | 4.1 | Add Auth translations |

### New Files (1, Phase 3)

| File | Phase | Description |
|------|-------|-------------|
| `src/app/[locale]/editor/layout.tsx` | 3.1 | Server-side auth guard |

### Untouched Files

| File | Reason |
|------|--------|
| `src/middleware.ts` | Auth not in middleware layer |
| `src/app/[locale]/layout.tsx` | better-auth needs no Provider |
| `src/lib/db/index.ts` | Auth uses separate collections |
| `src/app/sw.ts` | /api/auth/* not cached by default |
| `src/lib/mongodb.ts` | adapter consumes getDatabase() directly |
| All existing pages | Public access preserved |
| All existing editor pages | Protected by new layout.tsx |

---

## Open Questions & Risks

### Q1: better-auth MongoDB adapter initialization
- Does `mongodbAdapter()` accept `Db` or `MongoClient`?
- Can it handle `Promise<Db>` or does it need resolved value?
- **Mitigation:** Check better-auth docs/source before Step 1.2

### Q2: Top-level await in `auth.ts`
- Next.js App Router supports top-level await in server modules
- But does it work reliably in all bundler contexts?
- **Mitigation:** If fails, use lazy init with `let authInstance: ReturnType<typeof betterAuth> | null = null`

### Q3: Magic Link verify flow
- Does better-auth auto-redirect after token validation?
- Or do we need a custom verify page?
- **Mitigation:** Test with default behavior first, add custom page only if needed

### Q4: Passkey Conditional UI in PWA standalone mode
- `isConditionalMediationAvailable()` may behave differently in PWA vs browser
- iOS Safari and Android Chrome have different Passkey UX
- **Mitigation:** Test on both platforms; fallback to explicit button

### Q5: Resend domain verification
- `bouldering.top` domain needs DNS records for Resend email delivery
- SPF + DKIM records must be configured
- **Mitigation:** Verify before Phase 1 implementation begins (pre-flight check)

---

## Testing Strategy

| Layer | Tool | What to Test |
|-------|------|-------------|
| Unit | Vitest | `use-passkey-management` hook, email template function |
| Integration | Vitest | Auth error code mapping, session parsing |
| E2E (Manual) | Browser | Full Magic Link flow, Passkey registration/login |
| E2E (Manual) | iPhone Safari | Passkey in PWA standalone mode |
| E2E (Manual) | Android Chrome | Passkey in PWA standalone mode |

**Note:** Automated E2E for WebAuthn is complex (requires virtual authenticator). Manual testing is sufficient for MVP. Consider Playwright with `cdp.send('WebAuthn.enable')` for Phase 4 if needed.
