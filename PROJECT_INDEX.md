# Project Index: 罗源野抱 TOPO

> 福州罗源攀岩线路分享 PWA 应用（野外抱石攀岩指南）

**Generated:** 2026-01-17 | **Codebase:** ~5,800 lines TypeScript/TSX

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router (页面层)
│   ├── layout.tsx         # 根布局 (fonts, ThemeProvider, PWA)
│   ├── page.tsx           # 首页 - 岩场列表 (SSR)
│   ├── home-client.tsx    # 首页客户端组件
│   ├── sw.ts              # Serwist Service Worker
│   ├── crag/[id]/         # 岩场详情页
│   ├── route/             # 线路列表页 (带筛选)
│   ├── route/[id]/        # 线路详情页
│   ├── profile/           # 用户资料页
│   └── api/beta/          # Beta 视频提交 API
├── components/            # React 组件 (18个)
│   ├── ui/                # shadcn/ui 基础组件
│   │   ├── button.tsx, card.tsx, skeleton.tsx
│   │   ├── drawer.tsx     # 通用抽屉 (手势关闭)
│   │   └── image-viewer.tsx # 全屏图片 (双指缩放)
│   ├── app-tabbar.tsx     # 底部导航栏 (毛玻璃)
│   ├── filter-*.tsx       # 筛选组件
│   ├── beta-*.tsx         # Beta 视频组件
│   ├── *-prompt.tsx       # PWA 提示组件
│   └── grade-range-selector.tsx # 难度色谱条选择器 (NEW)
├── lib/
│   ├── db/index.ts        # 数据访问层 (CRUD)
│   ├── mongodb.ts         # MongoDB 连接
│   ├── themes/            # 主题系统 (minimal/outdoor)
│   ├── filter-constants.ts # 筛选配置常量
│   ├── beta-constants.ts  # Beta 平台配置
│   ├── tokens.ts          # 设计令牌
│   └── utils.ts           # cn() 工具
├── types/index.ts         # TypeScript 类型定义
├── data/                  # 静态数据备份
└── hooks/                 # 自定义 Hooks
scripts/
├── seed.ts                # 数据库迁移脚本
└── seed-beta.ts           # Beta 数据迁移
```

---

## 🚀 Entry Points

| 入口 | 路径 | 说明 |
|------|------|------|
| **App** | `src/app/layout.tsx` | 根布局，初始化 fonts/themes/PWA |
| **Home** | `src/app/page.tsx` | 岩场列表首页 (Server Component) |
| **Routes** | `src/app/route/page.tsx` | 线路列表 (带筛选) |
| **API** | `src/app/api/beta/route.ts` | Beta 视频提交 POST 端点 |
| **SW** | `src/app/sw.ts` | Service Worker (离线缓存) |
| **DB Seed** | `scripts/seed.ts` | 数据库迁移脚本 |

---

## 📦 Core Modules

### 数据层 (`src/lib/db/index.ts`)
```typescript
getAllCrags(): Promise<Crag[]>
getCragById(id: string): Promise<Crag | null>
getAllRoutes(): Promise<Route[]>
getRouteById(id: number): Promise<Route | null>
getRoutesByCragId(cragId: string): Promise<Route[]>
```

### 类型定义 (`src/types/index.ts`)
```typescript
interface Crag { id, name, location, approach, coverImages }
interface Route { id, name, grade, cragId, area, betaLinks }
interface BetaLink { platform, url, author, climberHeight }
type BetaPlatform = 'xiaohongshu'  // 目前仅支持小红书
const GRADE_LEVELS = ['V0'...'V13']
```

### 主题系统 (`src/lib/themes/`)
- `minimal` - 极简专业主题 (黑白灰，默认)
- `outdoor` - 户外探险主题 (大地色)
- 通过 `data-theme` 属性和 `next-themes` 切换

### 筛选系统 (`src/lib/filter-constants.ts`)
- `GRADE_GROUPS` - 难度分组 (入门/进阶/高级/专家)
- `FILTER_PARAMS` - URL 参数名 (crag, grade, q)
- `getGradesByValues()` - 分组值转难度数组

---

## 🧩 Key Components

| 组件 | 功能 |
|------|------|
| `AppTabbar` | 底部导航栏 (毛玻璃效果) |
| `Drawer` | 通用抽屉 (下滑手势关闭) |
| `ImageViewer` | 全屏图片查看器 (双指缩放) |
| `FilterChip` | 筛选芯片 (单选/多选模式) |
| `FilterDrawer` | 筛选面板抽屉 |
| `GradeRangeSelector` | 难度色谱条 (点击/拖动选择) |
| `RouteDetailDrawer` | 线路详情抽屉 |
| `BetaListDrawer` | Beta 视频列表 |
| `BetaSubmitDrawer` | Beta 提交表单 |
| `ThemeSwitcher` | 主题切换器 |

---

## 🔧 Configuration

| 文件 | 用途 |
|------|------|
| `package.json` | 依赖和脚本 |
| `components.json` | shadcn/ui 配置 (new-york style) |
| `vercel.json` | Vercel 部署配置 |
| `public/manifest.json` | PWA Manifest |
| `.env.local` | 环境变量 (MONGODB_URI) |

---

## 🔗 Tech Stack

| 类别 | 技术 | 版本 |
|------|------|------|
| Framework | Next.js + App Router | 16.1.2 |
| React | React | 19.2.3 |
| Database | MongoDB Atlas | 7.0 |
| Styling | Tailwind CSS v4 | 4.x |
| UI Library | shadcn/ui | new-york |
| Theming | next-themes | 0.4.6 |
| PWA | Serwist | 9.5.0 |
| Icons | lucide-react | 0.562 |

---

## 🎨 Design System

### 主题变量 (`--theme-*`)
```css
--theme-primary / --theme-on-primary
--theme-surface / --theme-on-surface
--theme-radius-sm/md/lg/xl
--theme-shadow-sm/md/lg
--theme-transition
```

### 动画类 (`globals.css`)
- `.animate-fade-in-up` - 淡入上移
- `.animate-scale-in` - 缩放淡入
- `.animate-drawer-in` - 抽屉底部滑入
- `.skeleton-shimmer` - 骨架屏闪烁

---

## 📝 Quick Commands

```bash
npm run dev           # Turbopack 开发服务器
npm run build         # Webpack 生产构建
npm run db:seed       # 开发环境迁移
npm run db:seed:prod  # 生产环境迁移
npx shadcn@latest add <component>  # 添加 UI 组件
```

---

## 🗺️ URL Routes

| URL | 页面 | 数据源 |
|-----|------|--------|
| `/` | 岩场列表 | `getAllCrags()` |
| `/crag/[id]` | 岩场详情 | `getCragById()` + `getRoutesByCragId()` |
| `/route` | 线路列表 | `getAllRoutes()` + `getAllCrags()` |
| `/route/[id]` | 线路详情 | `getRouteById()` |
| `/profile` | 用户资料 | - |
| `POST /api/beta` | Beta 提交 | Request Body |

---

## 📱 PWA Features

- **离线缓存**: Serwist Service Worker
- **图片缓存**: COS 图片 30 天，最多 200 张
- **安装提示**: `InstallPrompt` 组件
- **更新提示**: `SWUpdatePrompt` 组件
- **离线指示**: `OfflineIndicator` 顶部横幅

---

## 📚 Documentation

| 文档 | 说明 |
|------|------|
| `CLAUDE.md` | AI 开发指南 (简洁，供 AI 快速参考) |
| `doc/PROJECT_OVERVIEW.md` | 技术详细文档 (供开发者学习) |
| `PROJECT_INDEX.md` | 本索引文件 |

---

**Token 效率**: 本索引 ~3KB，读取全部源码 ~58KB (节省 94%)
