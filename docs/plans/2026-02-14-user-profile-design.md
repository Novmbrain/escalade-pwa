# User Profile Implementation Plan — Nickname, Height, Reach, Ape Index

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add user profile fields (nickname, height, reach) to better-auth user schema, with a one-time nickname prompt and profile editing UI.

**Architecture:** Extend better-auth's `additionalFields` with `name`/`height`/`reach`. A lightweight Drawer prompt reminds first-time users to set a nickname (shown once, dismissed via localStorage). Profile page gets a personal info section with ape index display. `use-climber-body-data.ts` upgraded to sync localStorage data to DB when logged in.

**Tech Stack:** Next.js App Router, better-auth, MongoDB, Tailwind CSS, next-intl

---

### Task 1: Extend better-auth user schema with `name`, `height`, `reach`

**Files:**
- Modify: `src/lib/auth.ts`

**Step 1: Add additionalFields**

In `src/lib/auth.ts`, update the `user.additionalFields` object (line 52-58):

```typescript
user: {
  additionalFields: {
    role: {
      type: 'string',
      defaultValue: 'user',
    },
    name: {
      type: 'string',
      required: false,
    },
    height: {
      type: 'number',
      required: false,
    },
    reach: {
      type: 'number',
      required: false,
    },
  },
},
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors (existing warnings OK).

**Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat(auth): add name, height, reach to user additionalFields"
```

---

### Task 2: Add i18n keys for nickname prompt and profile sections

**Files:**
- Modify: `messages/zh.json`
- Modify: `messages/en.json`
- Modify: `messages/fr.json`

**Step 1: Add Profile personal info keys + nickname prompt keys**

Add to the existing `"Profile"` namespace in each locale:

**zh.json (in Profile):**
```json
"personalInfo": "个人信息",
"nickname": "昵称",
"nicknamePlaceholder": "输入昵称",
"heightLabel": "身高 (cm)",
"reachLabel": "臂展 (cm)",
"apeIndex": "臂展指数",
"apeIndexPositive": "+{value} cm",
"apeIndexNegative": "{value} cm",
"saveProfile": "保存",
"profileSaved": "个人信息已更新",
"profileSaveFailed": "保存失败，请重试",
"nicknamePromptTitle": "设置昵称",
"nicknamePromptSubtitle": "给自己起个攀岩代号吧",
"nicknamePromptSave": "确定",
"nicknamePromptSkip": "稍后再说"
```

**en.json (in Profile):**
```json
"personalInfo": "Personal Info",
"nickname": "Nickname",
"nicknamePlaceholder": "Enter nickname",
"heightLabel": "Height (cm)",
"reachLabel": "Reach (cm)",
"apeIndex": "Ape Index",
"apeIndexPositive": "+{value} cm",
"apeIndexNegative": "{value} cm",
"saveProfile": "Save",
"profileSaved": "Profile updated",
"profileSaveFailed": "Failed to save, please retry",
"nicknamePromptTitle": "Set Your Nickname",
"nicknamePromptSubtitle": "Give yourself a climbing alias",
"nicknamePromptSave": "Save",
"nicknamePromptSkip": "Later"
```

**fr.json (in Profile):**
```json
"personalInfo": "Informations personnelles",
"nickname": "Pseudo",
"nicknamePlaceholder": "Entrez un pseudo",
"heightLabel": "Taille (cm)",
"reachLabel": "Envergure (cm)",
"apeIndex": "Indice d'envergure",
"apeIndexPositive": "+{value} cm",
"apeIndexNegative": "{value} cm",
"saveProfile": "Enregistrer",
"profileSaved": "Profil mis à jour",
"profileSaveFailed": "Échec de la sauvegarde, réessayez",
"nicknamePromptTitle": "Choisir un pseudo",
"nicknamePromptSubtitle": "Donnez-vous un alias d'escalade",
"nicknamePromptSave": "Enregistrer",
"nicknamePromptSkip": "Plus tard"
```

**Step 2: Commit**

```bash
git add messages/zh.json messages/en.json messages/fr.json
git commit -m "i18n: add profile personal info and nickname prompt translations"
```

---

### Task 3: Create nickname prompt Drawer component

**Files:**
- Create: `src/components/nickname-prompt.tsx`
- Modify: `src/app/[locale]/layout.tsx`

**Approach:** A lightweight Drawer that appears once when a logged-in user has no `name`. Dismissed state tracked in localStorage (`nickname-prompt-dismissed`). User can type a nickname and save, or click "Later" to dismiss.

**Step 1: Create the component**

```tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Drawer } from '@/components/ui/drawer'
import { useToast } from '@/components/ui/toast'
import { authClient, useSession } from '@/lib/auth-client'

const DISMISSED_KEY = 'nickname-prompt-dismissed'

export function NicknamePrompt() {
  const t = useTranslations('Profile')
  const { showToast } = useToast()
  const sessionHook = useSession()
  const session = sessionHook.data

  const [isOpen, setIsOpen] = useState(false)
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)

  // Show prompt if: logged in, no name, not dismissed before
  useEffect(() => {
    if (!session) return
    const userName = (session.user as { name?: string }).name
    if (userName) return
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时检测条件
    setIsOpen(true)
  }, [session])

  const dismiss = useCallback(() => {
    setIsOpen(false)
    try { localStorage.setItem(DISMISSED_KEY, '1') } catch {}
  }, [])

  const handleSave = useCallback(async () => {
    const trimmed = nickname.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await authClient.updateUser({ name: trimmed })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sessionHook as any).refetch?.({ query: { disableCookieCache: true } })
      showToast(t('profileSaved'), 'success')
      dismiss()
    } catch {
      showToast(t('profileSaveFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }, [nickname, sessionHook, showToast, t, dismiss])

  return (
    <Drawer
      isOpen={isOpen}
      onClose={dismiss}
      height="auto"
      showHandle
    >
      <div className="px-6 pb-6 pt-2">
        <div className="text-center mb-5">
          <h2
            className="text-lg font-bold mb-1"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            {t('nicknamePromptTitle')}
          </h2>
          <p
            className="text-sm"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            {t('nicknamePromptSubtitle')}
          </p>
        </div>

        <Input
          value={nickname}
          onChange={setNickname}
          placeholder={t('nicknamePlaceholder')}
          variant="form"
          maxLength={20}
          autoFocus
        />

        <div className="flex gap-3 mt-4">
          <button
            onClick={dismiss}
            className="flex-1 p-2.5 text-sm font-medium transition-all active:scale-[0.98]"
            style={{
              color: 'var(--theme-on-surface-variant)',
              borderRadius: 'var(--theme-radius-lg)',
            }}
          >
            {t('nicknamePromptSkip')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !nickname.trim()}
            className="flex-1 p-2.5 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-40"
            style={{
              backgroundColor: 'var(--theme-primary)',
              color: 'var(--theme-on-primary)',
              borderRadius: 'var(--theme-radius-lg)',
            }}
          >
            {t('nicknamePromptSave')}
          </button>
        </div>
      </div>
    </Drawer>
  )
}
```

**Step 2: Add to layout**

In `src/app/[locale]/layout.tsx`, import and render `<NicknamePrompt />` inside the providers:

```tsx
import { NicknamePrompt } from '@/components/nickname-prompt'

// Inside the JSX, after other providers:
<NicknamePrompt />
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 4: Commit**

```bash
git add src/components/nickname-prompt.tsx src/app/\\[locale\\]/layout.tsx
git commit -m "feat(profile): add one-time nickname prompt drawer for new users"
```

---

### Task 4: Add personal info section to Profile page

**Files:**
- Modify: `src/app/[locale]/profile/page.tsx`

**Step 1: Add personal info section**

In `src/app/[locale]/profile/page.tsx`, after the "Preferences" section (line ~223), before the "Data & Storage" section, add a "Personal Info" section visible only when logged in.

Add necessary imports at the top: `useMemo` from react, `authClient` from auth-client, `useToast`.

Create a `PersonalInfoSection` component in the same file:

```tsx
function PersonalInfoSection({ session }: { session: { user: { email: string } } }) {
  const t = useTranslations('Profile')
  const { showToast } = useToast()
  const sessionHook = useSession()

  const user = session.user as {
    name?: string
    height?: number
    reach?: number
    email: string
  }

  const [nickname, setNickname] = useState(user.name ?? '')
  const [height, setHeight] = useState(user.height?.toString() ?? '')
  const [reach, setReach] = useState(user.reach?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  // Ape Index = reach - height (only when both present)
  const apeIndex = useMemo(() => {
    const h = parseFloat(height)
    const r = parseFloat(reach)
    if (isNaN(h) || isNaN(r)) return null
    return r - h
  }, [height, reach])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const updateData: Record<string, unknown> = {
        name: nickname.trim() || undefined,
      }
      const h = parseFloat(height)
      const r = parseFloat(reach)
      if (!isNaN(h) && h > 0) updateData.height = h
      if (!isNaN(r) && r > 0) updateData.reach = r

      await authClient.updateUser(updateData)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sessionHook as any).refetch?.({ query: { disableCookieCache: true } })
      showToast(t('profileSaved'), 'success')
    } catch {
      showToast(t('profileSaveFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }, [nickname, height, reach, showToast, t, sessionHook])

  return (
    <div className="glass mb-6" style={{ borderRadius: 'var(--theme-radius-xl)' }}>
      <div className="p-4 space-y-3">
        {/* Nickname */}
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--theme-on-surface-variant)' }}>
            {t('nickname')}
          </label>
          <Input
            value={nickname}
            onChange={setNickname}
            placeholder={t('nicknamePlaceholder')}
            variant="form"
            maxLength={20}
          />
        </div>

        {/* Height */}
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--theme-on-surface-variant)' }}>
            {t('heightLabel')}
          </label>
          {/* eslint-disable-next-line no-restricted-syntax -- type="number" exempt from IME */}
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="170"
            min={100}
            max={250}
            className="w-full p-2.5 text-sm"
            style={{
              backgroundColor: 'var(--theme-surface-variant)',
              color: 'var(--theme-on-surface)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--theme-radius-lg)',
            }}
          />
        </div>

        {/* Reach */}
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--theme-on-surface-variant)' }}>
            {t('reachLabel')}
          </label>
          {/* eslint-disable-next-line no-restricted-syntax -- type="number" exempt from IME */}
          <input
            type="number"
            value={reach}
            onChange={(e) => setReach(e.target.value)}
            placeholder="175"
            min={100}
            max={280}
            className="w-full p-2.5 text-sm"
            style={{
              backgroundColor: 'var(--theme-surface-variant)',
              color: 'var(--theme-on-surface)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--theme-radius-lg)',
            }}
          />
        </div>

        {/* Ape Index display */}
        {apeIndex !== null && (
          <div
            className="flex items-center justify-between p-3"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface))',
              borderRadius: 'var(--theme-radius-lg)',
            }}
          >
            <span className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
              {t('apeIndex')}
            </span>
            <span
              className="text-base font-bold"
              style={{ color: apeIndex >= 0 ? 'var(--theme-success)' : 'var(--theme-on-surface)' }}
            >
              {apeIndex >= 0
                ? t('apeIndexPositive', { value: apeIndex.toFixed(1) })
                : t('apeIndexNegative', { value: apeIndex.toFixed(1) })}
            </span>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full p-2.5 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50"
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: 'var(--theme-on-primary)',
            borderRadius: 'var(--theme-radius-lg)',
          }}
        >
          {t('saveProfile')}
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Wire into ProfilePage JSX**

After the Preferences section (~line 223), add:

```tsx
{/* === Personal Info (logged in only) === */}
{isLoggedIn && session && (
  <>
    <div className="flex items-center gap-2 mb-3">
      <User className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
      <span className="text-sm font-semibold" style={{ color: 'var(--theme-on-surface)' }}>
        {t('personalInfo')}
      </span>
    </div>
    <PersonalInfoSection session={session} />
  </>
)}
```

**Step 3: Update Profile Hero to show nickname**

In the profile hero section (line ~170-172), change from email-only to show nickname:

```tsx
// BEFORE
<p className="text-base font-medium" style={{ color: 'var(--theme-on-surface)' }}>
  {session.user.email}
</p>
<p className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
  {t('accountSecurityHint')}
</p>

// AFTER
<p className="text-base font-medium" style={{ color: 'var(--theme-on-surface)' }}>
  {(session.user as { name?: string }).name || session.user.email}
</p>
<p className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
  {(session.user as { name?: string }).name ? session.user.email : t('accountSecurityHint')}
</p>
```

**Step 4: Verify TypeScript compiles and ESLint passes**

Run: `npx tsc --noEmit 2>&1 | head -20`
Run: `npx eslint src/app/\\[locale\\]/profile/page.tsx 2>&1 | tail -10`

**Step 5: Commit**

```bash
git add src/app/\\[locale\\]/profile/page.tsx
git commit -m "feat(profile): add personal info section with nickname, height, reach, ape index"
```

---

### Task 5: Upgrade `use-climber-body-data.ts` to sync with DB

**Files:**
- Modify: `src/hooks/use-climber-body-data.ts`

**Step 1: Add DB sync logic**

The hook should:
1. Continue reading from localStorage as before (SSR safe)
2. Use `useSession` internally to detect login state
3. On first load, if logged in: prefer DB height/reach over localStorage
4. On save, if logged in: also update to DB via `authClient.updateUser()`
5. On login with empty DB but existing localStorage: migrate localStorage data to DB

Add imports:
```typescript
import { useSession, authClient } from '@/lib/auth-client'
```

Add after the hydration useEffect:
```typescript
const { data: session } = useSession()

// Sync: prefer DB values when logged in, migrate localStorage → DB if DB empty
useEffect(() => {
  if (!session) return
  const user = session.user as { height?: number; reach?: number }
  const dbHeight = user.height?.toString() ?? ''
  const dbReach = user.reach?.toString() ?? ''

  if (dbHeight || dbReach) {
    // DB has data — use it and sync to localStorage
    const dbData = {
      height: dbHeight || bodyData.height,
      reach: dbReach || bodyData.reach,
    }
    setBodyData(dbData)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dbData)) } catch {}
  } else if (bodyData.height || bodyData.reach) {
    // DB empty, localStorage has data — migrate to DB
    const h = parseFloat(bodyData.height)
    const r = parseFloat(bodyData.reach)
    const updateData: Record<string, number> = {}
    if (!isNaN(h) && h > 0) updateData.height = h
    if (!isNaN(r) && r > 0) updateData.reach = r
    if (Object.keys(updateData).length > 0) {
      authClient.updateUser(updateData).catch(() => {})
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在 session 变化时同步
}, [session])
```

Update `updateBodyData` to also sync to DB:
```typescript
const updateBodyData = useCallback((data: Partial<ClimberBodyData>) => {
  setBodyData((prev) => {
    const updated: ClimberBodyData = {
      height: data.height?.trim() || prev.height,
      reach: data.reach?.trim() || prev.reach,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.warn('[useClimberBodyData] Failed to save data:', error)
    }
    return updated
  })

  // Sync to DB if logged in (fire-and-forget)
  if (session) {
    const updateData: Record<string, number> = {}
    const h = parseFloat(data.height?.trim() ?? '')
    const r = parseFloat(data.reach?.trim() ?? '')
    if (!isNaN(h) && h > 0) updateData.height = h
    if (!isNaN(r) && r > 0) updateData.reach = r
    if (Object.keys(updateData).length > 0) {
      authClient.updateUser(updateData).catch(() => {})
    }
  }
}, [session])
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/hooks/use-climber-body-data.ts
git commit -m "feat(hooks): sync climber body data with DB when logged in"
```

---

### Task 6: Build verification and final testing

**Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Run ESLint on changed files**

Run: `npx eslint src/lib/auth.ts src/app/\\[locale\\]/profile/page.tsx src/hooks/use-climber-body-data.ts src/components/nickname-prompt.tsx`
Expected: No new errors

**Step 3: Run existing tests**

Run: `npm run test:run`
Expected: All existing tests pass

**Step 4: Run build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds

**Step 5: Commit design doc**

```bash
git add docs/plans/2026-02-14-user-profile-design.md
git commit -m "docs: add user profile implementation plan"
```
