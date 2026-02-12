# 认证系统架构设计：Magic Link + Passkey

> 在 BlocTop PWA 上实现无密码认证：邮箱 Magic Link 注册/恢复 + Passkey 日常登录

---

## 核心原则

- **完全无密码**：用户永远不需要记密码
- **最小侵入**：不改现有页面的公开访问模式，认证为渐进式增强
- **PWA 优先**：Passkey 在 PWA standalone 模式下原生体验
- **复用现有基础设施**：MongoDB Atlas + Vercel + 现有 Rate Limiting

---

## 一、技术选型

### 1.1 框架：better-auth

| 组件 | 选型 | 理由 |
|------|------|------|
| 认证框架 | **better-auth** | Magic Link + Passkey 双插件原生支持 |
| 数据库适配器 | `better-auth/adapters/mongodb` | 复用现有 MongoDB Atlas |
| 邮件服务 | **Resend** | 3000 封/月免费，API 简洁 |
| Passkey 库 | `@better-auth/passkey`（内部用 SimpleWebAuthn） | 封装了 WebAuthn 底层 |
| Session 存储 | MongoDB `sessions` collection | Cookie-based session |

### 1.2 排除方案

| 方案 | 排除理由 |
|------|---------|
| Auth.js (NextAuth) | Passkey 仍标记 experimental，不推荐生产 |
| DIY SimpleWebAuthn | 开发量大，session/token 管理全要自建 |
| Clerk / Auth0 | 外部 SaaS 依赖，增加成本和延迟 |

### 1.3 新增依赖

```bash
npm install better-auth @better-auth/passkey resend
```

### 1.4 新增环境变量

| 变量 | 必需 | 说明 | 示例 |
|------|------|------|------|
| `BETTER_AUTH_SECRET` | ✅ | Session 签名密钥 | 32+ 字符随机字符串 |
| `RESEND_API_KEY` | ✅ | Resend API 密钥 | `re_xxxx` |
| `NEXT_PUBLIC_APP_URL` | ✅ | 应用 URL（用于 rpID origin） | `https://bouldering.top` |

---

## 二、认证流程

### 2.1 首次注册

```
用户打开 App → 点击「登录/注册」
        ↓
输入邮箱 → [发送登录链接]
        ↓
收到邮件 → 点击 Magic Link
        ↓
better-auth 自动：
  - 新邮箱 → 创建 User + 登录 → 重定向 /auth/passkey-setup
  - 已有邮箱 → 直接登录 → 重定向首页
        ↓
Passkey 引导页：
  [🔐 设置指纹/面容登录]   [稍后设置 →]
        ↓
调用 addPasskey() → 系统生物识别弹窗 → 注册成功
```

### 2.2 日常登录（Passkey）

```
用户打开 App
        ↓
登录页自动调用 signIn.passkey({ autoFill: true })
        ↓
系统弹出 Passkey 选择 → 指纹/面容验证 → 登录成功
        ↓
重定向到首页（或来源页面）
```

### 2.3 换设备 / Passkey 丢失

```
新设备打开 App → 无本地 Passkey
        ↓
输入邮箱 → [发送登录链接] → Magic Link 登录
        ↓
登录成功 → 引导注册新设备的 Passkey
```

### 2.4 Identifier-First 智能路由

```typescript
// 登录页逻辑伪代码
async function handleLogin(email: string) {
  // 1. 检测当前设备是否有可用 Passkey
  const hasPasskey = await isConditionalMediationAvailable()

  if (hasPasskey) {
    // Conditional UI 已在后台运行，等用户选择 Passkey
    return
  }

  // 2. 无 Passkey → 发送 Magic Link
  await authClient.signIn.magicLink({ email, callbackURL: '/' })
  // 显示 "请查收邮件" 提示
}
```

---

## 三、数据库 Schema

> better-auth 的 `npx @better-auth/cli migrate` 会自动创建 collection 和索引。
> 以下列出最终 schema 供参考。

### 3.1 users Collection

```typescript
{
  _id: ObjectId,
  email: string,           // 唯一索引，账号标识
  emailVerified: boolean,  // Magic Link 验证后自动设为 true
  name: string,            // 显示名称（默认取邮箱前缀）
  image: string | null,    // 头像 URL
  role: string,            // "user" | "admin"（替代硬编码密码）
  createdAt: Date,
  updatedAt: Date,
}
// 索引: { email: 1 } unique
```

### 3.2 sessions Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId,        // → users._id
  token: string,           // session token（唯一索引）
  expiresAt: Date,         // 过期时间（30 天）
  ipAddress: string | null,
  userAgent: string | null,
  createdAt: Date,
  updatedAt: Date,
}
// 索引: { token: 1 } unique, { expiresAt: 1 } TTL
```

### 3.3 accounts Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId,        // → users._id
  accountId: string,       // provider 内的用户 ID
  providerId: string,      // "magic-link" | "passkey"
  createdAt: Date,
  updatedAt: Date,
}
// 索引: { userId: 1 }
```

### 3.4 passkeys Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId,        // → users._id
  name: string,            // 设备名称 ("iPhone", "MacBook")
  credentialID: string,    // base64url，唯一索引
  publicKey: string,       // base64url 编码的公钥
  counter: number,         // 签名计数器（防重放）
  deviceType: string,      // "singleDevice" | "multiDevice"
  backedUp: boolean,       // 是否已云同步
  transports: string[],    // ["internal", "hybrid"]
  aaguid: string,          // 认证器型号标识
  createdAt: Date,
}
// 索引: { credentialID: 1 } unique, { userId: 1 }
```

### 3.5 verifications Collection（Magic Link Token）

```typescript
{
  _id: ObjectId,
  identifier: string,      // 邮箱
  value: string,           // 哈希后的 token
  expiresAt: Date,
  createdAt: Date,
  updatedAt: Date,
}
// 索引: { expiresAt: 1 } TTL (自动清理过期 token)
```

### 3.6 现有 Collection 不变

`crags`、`routes`、`feedbacks`、`visits` — 不添加 userId 字段。
未来如需关联用户数据（收藏、历史），新建 collection 而非修改现有结构。

---

## 四、服务端配置

### 4.1 Auth 核心配置

```
新建文件: src/lib/auth.ts
```

```typescript
import { betterAuth } from "better-auth"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import { passkey } from "@better-auth/passkey"
import { magicLink } from "better-auth/plugins"
import { Resend } from "resend"
import { getDatabase } from "@/lib/mongodb"

const resend = new Resend(process.env.RESEND_API_KEY)

export const auth = betterAuth({
  database: mongodbAdapter(await getDatabase()),

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
      },
    },
  },

  plugins: [
    magicLink({
      expiresIn: 600,                // 10 分钟
      storeToken: "hashed",          // 哈希存储
      sendMagicLink: async ({ email, url }) => {
        await resend.emails.send({
          from: "寻岩记 <noreply@bouldering.top>",
          to: email,
          subject: "登录寻岩记 BlocTop",
          html: magicLinkEmailTemplate(url),
        })
      },
    }),

    passkey({
      rpID: process.env.NODE_ENV === "production"
        ? "bouldering.top"
        : "localhost",
      rpName: "寻岩记 BlocTop",
      origin: process.env.NEXT_PUBLIC_APP_URL!,
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "required",
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 30,   // 30 天
    updateAge: 60 * 60 * 24,         // 每天刷新一次
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,                // 5 分钟缓存减少 DB 查询
    },
  },

  rateLimit: {
    window: 60,                      // 60 秒窗口
    max: 10,                         // 最多 10 次请求
  },
})
```

### 4.2 Auth Client 配置

```
新建文件: src/lib/auth-client.ts
```

```typescript
import { createAuthClient } from "better-auth/client"
import { passkeyClient } from "@better-auth/passkey/client"
import { magicLinkClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    passkeyClient(),
    magicLinkClient(),
  ],
})

// 导出常用方法
export const {
  signIn,
  signOut,
  useSession,       // React hook
  getSession,       // 非 hook 版本
} = authClient
```

### 4.3 API Route Handler

```
新建文件: src/app/api/auth/[...all]/route.ts
```

```typescript
import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth)
```

> better-auth 的 catch-all route 自动处理所有认证端点：
> `/api/auth/magic-link/sign-in`, `/api/auth/passkey/register`,
> `/api/auth/passkey/authenticate`, `/api/auth/session`, 等

---

## 五、中间件集成

### 5.1 策略：不拦截，渐进增强

当前 App 所有页面都是公开的，认证不应该改变这一点。
**不在 middleware 中做 auth 拦截**，而是：

- 公开页面照常访问
- 需要登录的功能（未来的收藏、评论等）在组件层检查 session
- 编辑器页面在 Server Component 层检查 session + role

### 5.2 middleware.ts 不改动

```typescript
// src/middleware.ts — 保持不变
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|sw\\.js|swe-worker-.*\\.js|manifest\\.json|.*\\..*).*)',
}
```

### 5.3 编辑器保护（Server Component 层）

```typescript
// src/app/[locale]/editor/layout.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "@/i18n/navigation"

export default async function EditorLayout({ children }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session || session.user.role !== "admin") {
    redirect("/login")
  }

  return <>{children}</>
}
```

---

## 六、前端组件架构

### 6.1 Provider 层级（layout.tsx）

```diff
  <NextIntlClientProvider messages={messages}>
    <ThemeProvider>
      <ToastProvider>
+       {/* better-auth 不需要 Provider 包裹 */}
+       {/* useSession() 直接从 auth-client.ts 导入使用 */}
        <OfflineDownloadProvider>
          <FaceImageProvider>
            ...
          </FaceImageProvider>
        </OfflineDownloadProvider>
      </ToastProvider>
    </ThemeProvider>
  </NextIntlClientProvider>
```

> better-auth 的 `useSession()` 是独立的 React hook，不依赖 Context Provider。
> 内部通过 HTTP 请求 `/api/auth/session` 获取 session 状态。

### 6.2 新增页面

| 路径 | 文件 | 说明 |
|------|------|------|
| `/[locale]/login` | `src/app/[locale]/login/page.tsx` | 登录页（Magic Link + Passkey） |
| `/[locale]/auth/passkey-setup` | `src/app/[locale]/auth/passkey-setup/page.tsx` | Passkey 设置引导页 |
| `/[locale]/auth/verify` | `src/app/[locale]/auth/verify/page.tsx` | Magic Link 验证中间页 |

### 6.3 登录页设计

```
┌─────────────────────────────┐
│         🧗 寻岩记            │
│                             │
│  ┌───────────────────────┐  │
│  │  邮箱地址              │  │  ← autocomplete="email webauthn"
│  └───────────────────────┘  │
│                             │
│  [ 发送登录链接 ]           │  ← Magic Link
│                             │
│  或                         │
│                             │
│  [ 🔐 Passkey 登录 ]       │  ← 显式按钮
│                             │
│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄     │
│  首次使用？输入邮箱即可注册  │
│                             │
└─────────────────────────────┘
```

**关键交互：**
1. 页面加载时调用 `signIn.passkey({ autoFill: true })`，激活 Conditional UI
2. 邮箱输入框设 `autocomplete="email webauthn"`
3. 如果有已注册 Passkey，浏览器自动弹出选择框
4. 无 Passkey 时，用户输入邮箱点击「发送登录链接」
5. 发送成功后显示 "请查收邮箱" 提示 + 倒计时重发

### 6.4 Passkey 设置引导页

```
┌─────────────────────────────┐
│                             │
│  ✅ 登录成功！               │
│                             │
│  🔐 设置快速登录            │
│                             │
│  下次打开直接用指纹/面容    │
│  登录，无需邮箱             │
│                             │
│  [ 设置 Passkey ]           │  ← authClient.passkey.addPasskey()
│                             │
│  [ 稍后设置 → ]             │  ← 跳过，回首页
│                             │
└─────────────────────────────┘
```

### 6.5 Profile 页面改造

```diff
  // 现有 Profile 页面改造
- // 硬编码密码 '1243' 验证编辑器入口
+ // 显示登录状态
+ // 已登录: 显示邮箱、Passkey 管理、登出按钮
+ // admin 角色: 显示编辑器入口（无需密码）
+ // 未登录: 显示登录/注册入口
```

**已登录状态的 Profile 页新增区块：**

```
┌─────────────────────────────┐
│ 👤 已登录                    │
│    user@example.com         │
│                             │
│ ── 安全设置 ──              │
│ 📱 已注册的 Passkey         │
│    iPhone 15    2026-02-10  │ [删除]
│    MacBook Pro  2026-02-12  │ [删除]
│    [ + 添加新设备 ]         │
│                             │
│ ── 管理 ──                  │ (仅 admin)
│ 🔧 编辑器入口               │
│                             │
│ [退出登录]                  │
└─────────────────────────────┘
```

### 6.6 Passkey 管理 Hook

```typescript
// src/hooks/use-passkey-management.ts
import { authClient } from "@/lib/auth-client"
import { useState, useEffect } from "react"

export function usePasskeyManagement() {
  const [passkeys, setPasskeys] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    authClient.passkey.listUserPasskeys({}).then(res => {
      setPasskeys(res.data ?? [])
      setIsLoading(false)
    })
  }, [])

  const addPasskey = async (name?: string) => {
    const result = await authClient.passkey.addPasskey({ name })
    if (result.data) {
      setPasskeys(prev => [...prev, result.data])
    }
    return result
  }

  const deletePasskey = async (id: string) => {
    await authClient.passkey.deletePasskey({ id })
    setPasskeys(prev => prev.filter(p => p.id !== id))
  }

  return { passkeys, isLoading, addPasskey, deletePasskey }
}
```

---

## 七、Relying Party ID 配置

| 环境 | rpID | origin | 说明 |
|------|------|--------|------|
| Production | `bouldering.top` | `https://bouldering.top` | 顶级域名，子域名可共享 |
| Development | `localhost` | `http://localhost:3000` | 本地开发 |

**为什么用顶级域名：**
- 未来 `app.bouldering.top`、`m.bouldering.top` 可共享 Passkey
- Passkey 注册在 `bouldering.top` 级别
- 从子域名登录时 rpID 匹配检查通过

---

## 八、邮件模板

### 8.1 Magic Link 邮件

```
新建文件: src/lib/email-templates.ts
```

纯文本 + 简洁 HTML，确保各邮件客户端兼容：

```typescript
export function magicLinkEmailTemplate(url: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">🧗 寻岩记 BlocTop</h2>
      <p>点击下方按钮登录：</p>
      <a href="${url}"
         style="display: inline-block; padding: 12px 24px;
                background-color: #667eea; color: white;
                text-decoration: none; border-radius: 8px;
                font-weight: bold;">
        登录寻岩记
      </a>
      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        此链接 10 分钟内有效。如果不是你发起的请求，请忽略此邮件。
      </p>
    </div>
  `
}
```

---

## 九、i18n 翻译键

```json
// messages/zh.json 新增
{
  "Auth": {
    "loginTitle": "登录 / 注册",
    "emailPlaceholder": "输入邮箱地址",
    "sendMagicLink": "发送登录链接",
    "or": "或",
    "passkeyLogin": "Passkey 登录",
    "firstTimeHint": "首次使用？输入邮箱即可注册",
    "magicLinkSent": "登录链接已发送到 {email}",
    "magicLinkSentHint": "请查收邮箱并点击链接",
    "resendIn": "{seconds} 秒后可重发",
    "resend": "重新发送",
    "passkeySetupTitle": "设置快速登录",
    "passkeySetupDesc": "下次打开直接用指纹/面容登录，无需邮箱",
    "setupPasskey": "设置 Passkey",
    "skipForNow": "稍后设置",
    "passkeyAdded": "Passkey 设置成功",
    "passkeyDeleted": "Passkey 已删除",
    "addDevice": "添加新设备",
    "registeredPasskeys": "已注册的 Passkey",
    "noPasskeys": "尚未设置 Passkey",
    "logout": "退出登录",
    "loggedInAs": "已登录",
    "securitySettings": "安全设置",
    "loginSuccess": "登录成功",
    "loginRequired": "请先登录",
    "close": "关闭"
  }
}
```

---

## 十、安全措施

### 10.1 Rate Limiting

| 端点 | 限制 | Key |
|------|------|-----|
| Magic Link 发送 | 3 次/邮箱/10 分钟 | `auth:magic:${email}` |
| Passkey 认证 | 10 次/IP/分钟 | `auth:passkey:${ip}` |
| Session 查询 | 30 次/IP/分钟 | `auth:session:${ip}` |

> better-auth 内置 rate limiting 配置，复用现有 `rate-limit.ts` 的内存方案即可。

### 10.2 Cookie 安全

```typescript
// better-auth 默认 cookie 配置
{
  httpOnly: true,          // 防 XSS
  secure: true,            // 仅 HTTPS (production)
  sameSite: "lax",         // 防 CSRF + 允许 Magic Link 跳转
  path: "/",
  maxAge: 60 * 60 * 24 * 30,  // 30 天
}
```

### 10.3 CSP 更新

```diff
  // next.config.ts CSP headers
  "connect-src 'self' https://img.bouldering.top https://restapi.amap.com",
+ // 无需改动：better-auth 使用同源 /api/auth/* 端点
```

---

## 十一、PWA 特别考量

### 11.1 离线行为

- **已登录 + 离线**：Session cookie 仍在，离线页面正常访问已缓存数据
- **Session 过期 + 离线**：显示缓存内容，不强制登录。上线后自动续期或提示重新登录
- **Passkey 验证需网络**：challenge 来自服务器，离线时无法使用 Passkey

### 11.2 Service Worker

不改动 `src/app/sw.ts`。认证相关的 `/api/auth/*` 请求不应被 SW 缓存（默认 API 路由不缓存）。

### 11.3 start_url

保持 `"start_url": "/"` 不变。首页是公开页面，登录是渐进式增强。

---

## 十二、编辑器权限迁移

### 12.1 当前状态

Profile 页面使用硬编码密码 `'1243'` 验证编辑器入口。

### 12.2 迁移方案

1. 在 MongoDB 中手动将管理员邮箱的 `role` 设为 `"admin"`
2. 编辑器 layout 检查 `session.user.role === "admin"`
3. Profile 页面移除密码输入抽屉，改为直接显示编辑器入口（仅 admin 可见）

```typescript
// 手动设置 admin（MongoDB shell 或脚本）
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

---

## 十三、文件变更清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/lib/auth.ts` | better-auth 服务端配置 |
| `src/lib/auth-client.ts` | better-auth 客户端配置 |
| `src/lib/email-templates.ts` | Magic Link 邮件模板 |
| `src/app/api/auth/[...all]/route.ts` | Auth catch-all API route |
| `src/app/[locale]/login/page.tsx` | 登录页 |
| `src/app/[locale]/auth/passkey-setup/page.tsx` | Passkey 设置引导页 |
| `src/app/[locale]/auth/verify/page.tsx` | Magic Link 验证中间页 |
| `src/hooks/use-passkey-management.ts` | Passkey 管理 hook |

### 修改文件

| 文件 | 改动内容 |
|------|---------|
| `package.json` | 新增 better-auth, @better-auth/passkey, resend |
| `.env.example` | 新增 BETTER_AUTH_SECRET, RESEND_API_KEY, NEXT_PUBLIC_APP_URL |
| `src/app/[locale]/profile/page.tsx` | 移除密码抽屉，添加登录状态 + Passkey 管理 |
| `src/app/[locale]/editor/layout.tsx` | 新增 session + role 检查（替代密码） |
| `src/lib/api-error-codes.ts` | 新增 auth 相关错误码 |
| `messages/zh.json` | 新增 Auth 翻译键 |
| `messages/en.json` | 新增 Auth 翻译键 |
| `messages/fr.json` | 新增 Auth 翻译键 |

### 不改动文件

| 文件 | 原因 |
|------|------|
| `src/middleware.ts` | Auth 不在中间件层拦截 |
| `src/app/[locale]/layout.tsx` | better-auth 不需要 Provider 包裹 |
| `src/lib/db/index.ts` | 认证用独立 collection，不改现有数据层 |
| `src/app/sw.ts` | /api/auth/* 默认不缓存 |
| `src/lib/mongodb.ts` | better-auth adapter 直接消费 getDatabase() |
| 所有现有页面 | 公开访问，不添加 auth 检查 |

---

## 十四、实现步骤

### Phase 1: 基础 Magic Link 登录（MVP）
1. 安装依赖 + 配置环境变量
2. 创建 `src/lib/auth.ts` + `src/lib/auth-client.ts`
3. 创建 API route handler
4. 运行 `npx @better-auth/cli migrate` 生成 DB collection
5. 创建登录页（仅 Magic Link）
6. 创建邮件模板 + 配置 Resend
7. 测试：邮箱注册 → 收到链接 → 点击登录 → session 建立

### Phase 2: Passkey 集成
1. 添加 Passkey 插件配置
2. 创建 Passkey 设置引导页
3. 登录页添加 Conditional UI + 显式 Passkey 按钮
4. 测试：注册 Passkey → 清除 session → Passkey 重新登录

### Phase 3: Profile 页面 + 编辑器权限
1. Profile 页面显示登录状态
2. Passkey 管理 UI（列表、添加、删除）
3. 编辑器 layout.tsx 添加 session + role 检查
4. 移除 Profile 页面的硬编码密码抽屉
5. MongoDB 手动设置 admin 用户

### Phase 4: i18n + 打磨
1. 三语翻译完善
2. 错误处理 + Toast 提示
3. 邮件模板美化
4. E2E 测试验证

---

## 十五、不做的事情

| 事项 | 原因 |
|------|------|
| OAuth (GitHub/Google) | MVP 不需要，Magic Link 足够 |
| 密码认证 | 设计理念是完全无密码 |
| 邮箱验证码 (OTP) | Magic Link 更简洁，点一下就好 |
| 短信验证 | 增加成本，邮箱足够 |
| 用户头像上传 | 独立功能，不在认证范围 |
| 现有页面加 auth 检查 | 渐进式增强，公开页面保持公开 |
| 修改现有 DB schema | 新功能用新 collection |
| 中间件 auth 拦截 | Server Component 层检查更灵活 |

---

## 十六、实施纪要

> 以下内容记录实际实施过程中的偏差、问题修复和关键决策。

### 16.1 Phase 完成状态

| Phase | 状态 | 说明 |
|-------|------|------|
| Phase 1: Magic Link MVP | ✅ 完成 | PR #217 + hotfix PRs #218-#220 |
| Phase 2: Passkey 集成 | ⚠️ 部分完成 | 服务端插件已配置，登录页按钮为占位 |
| Phase 3: Profile + 编辑器 | ✅ 完成 | Profile 页 Passkey 管理 + 编辑器 Server-side guard |
| Phase 4: i18n + 打磨 | ✅ 完成 | 三语 31 个翻译键，Toast 错误提示 |

### 16.2 与原始设计的关键偏差

#### ① Lazy Singleton 模式（非 top-level await）

**原始设计** (4.1):
```typescript
export const auth = betterAuth({
  database: mongodbAdapter(await getDatabase()),
  ...
})
```

**实际实现**:
```typescript
let _auth: ReturnType<typeof betterAuth> | null = null
let _promise: Promise<ReturnType<typeof betterAuth>> | null = null

export function getAuth(): Promise<ReturnType<typeof betterAuth>> {
  if (_auth) return Promise.resolve(_auth)
  if (!_promise) {
    _promise = (async () => {
      const db = await getDatabase()
      const instance = betterAuth({ database: mongodbAdapter(db, { client }), ... })
      _auth = instance
      return instance
    })()
  }
  return _promise
}
```

**偏差原因**: Vercel 构建时 bundler 会执行 top-level await，而构建环境缺少 `BETTER_AUTH_SECRET` 导致 better-auth 直接抛异常。Lazy singleton 将初始化延迟到第一个运行时请求。

**影响范围**: 所有消费 auth 的代码从 `import { auth }` 改为 `const auth = await getAuth()`。

#### ② 移除 baseURL 配置

**原始设计** (4.1 + 4.2):
```typescript
// 服务端
baseURL: process.env.NEXT_PUBLIC_APP_URL
// 客户端
baseURL: process.env.NEXT_PUBLIC_APP_URL
```

**实际实现**: 两端均不设 `baseURL`。

**偏差原因**:
- **客户端**: `NEXT_PUBLIC_*` 变量在 build 时内联。如果 build 时设为 `https://bouldering.top`，但用户通过 `https://www.bouldering.top` 访问，客户端会向非同源地址发请求 → CORS 阻断。不设 baseURL 时 better-auth 自动使用相对路径。
- **服务端**: better-auth 用 `baseURL` 做 origin 校验。hardcode 为 `https://bouldering.top` 时，来自 `www.bouldering.top` 的请求被拒绝（"Invalid origin"）。不设 baseURL 时 better-auth 从请求的 Host header 自动推断。

#### ③ 新增 trustedOrigins 配置

**原始设计**: 未涉及。

**实际实现**:
```typescript
trustedOrigins: [
  'https://bouldering.top',
  'https://www.bouldering.top',
]
```

**偏差原因**: 用户可能通过 `bouldering.top` 或 `www.bouldering.top` 两个域名访问，better-auth 需要显式信任这两个 origin。

#### ④ Passkey origin 固定为 www 子域名

**原始设计** (4.1):
```typescript
origin: process.env.NEXT_PUBLIC_APP_URL!
```

**实际实现**:
```typescript
origin: process.env.NODE_ENV === 'production'
  ? 'https://www.bouldering.top'
  : 'http://localhost:3000'
```

**偏差原因**: WebAuthn origin 必须与用户浏览器的实际 origin 精确匹配。用户统一通过 `www.bouldering.top` 访问（Vercel 的 DNS 配置），所以 hardcode 为 www 子域名更可靠。

#### ⑤ 邮件发送人改为环境变量驱动

**原始设计** (4.1):
```typescript
from: "寻岩记 <noreply@bouldering.top>"
```

**实际实现**:
```typescript
const from = process.env.RESEND_FROM_EMAIL
  ? `寻岩记 <${process.env.RESEND_FROM_EMAIL}>`
  : '寻岩记 <onboarding@resend.dev>'
```

**偏差原因**: 域名 `bouldering.top` 在 Resend 尚未完成 DNS 验证（SPF/DKIM），无法作为发件人。环境变量驱动允许在验证完成前使用 Resend 测试域名。

### 16.3 生产环境调试时间线

| 时间 | 问题 | 修复 | PR |
|------|------|------|-----|
| 14:10 | Vercel build 失败 — top-level await | 重构为 lazy singleton | #217 (修复 commit) |
| 14:31 | Magic Link 发送失败 — 客户端无 error log | 添加 debug logging + env-driven sender | #218 |
| 14:49 | 请求未到达服务端 — baseURL CORS | 移除客户端 baseURL | #219 |
| 14:55 | "Invalid origin: www.bouldering.top" | 移除服务端 baseURL + trustedOrigins | #220 |

### 16.4 未完成 / 待办

| 任务 | 优先级 | 说明 |
|------|--------|------|
| Resend 域名验证 | 🔴 高 | 完成 SPF/DKIM/MX DNS 记录，启用 `noreply@bouldering.top` 发件 |
| Login 页 Passkey 真实接入 | 🟡 中 | 当前 Passkey 按钮为占位 toast，需调用 `signIn.passkey()` |
| 邮件模板多语言 | 🟢 低 | 根据用户 locale 切换邮件语言 |
| 环境变量 `RESEND_FROM_EMAIL` | 🔴 高 | 域名验证完成后在 Vercel 设置 |
| 确认生产 Magic Link 可用 | 🔴 高 | PR #220 已合并，等待用户验证 |
