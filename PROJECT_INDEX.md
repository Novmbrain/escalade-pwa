# Project Index: 罗源野抱 TOPO

Generated: 2026-01-16

> 福州罗源攀岩线路分享 PWA 应用（野外抱石攀岩指南）

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router (页面)
│   ├── page.tsx           # 首页 - 岩场列表
│   ├── home-client.tsx    # 首页客户端组件
│   ├── layout.tsx         # 根布局
│   ├── sw.ts              # Service Worker (Serwist)
│   ├── crag/[id]/         # 岩场详情页
│   ├── route/             # 线路列表页 (带筛选)
│   ├── route/[id]/        # 线路详情页
│   └── profile/           # 用户页面
├── components/            # React 组件
│   ├── ui/                # shadcn/ui (button, card, skeleton)
│   ├── filter-chip.tsx    # 筛选芯片 (单选/多选)
│   ├── crag-card.tsx      # 岩场卡片
│   ├── app-tabbar.tsx     # 底部导航栏
│   └── *-prompt.tsx       # PWA 提示组件
├── lib/
│   ├── db/index.ts        # 数据访问层 (CRUD)
│   ├── mongodb.ts         # MongoDB 连接
│   ├── filter-constants.ts # 筛选配置常量
│   ├── tokens.ts          # 设计令牌
│   └── utils.ts           # cn() 工具
├── types/index.ts         # TypeScript 类型 (Crag, Route)
├── data/                  # 静态数据备份
└── hooks/                 # 自定义 Hooks
scripts/
└── seed.ts                # 数据库迁移脚本
public/
└── manifest.json          # PWA 清单
```

## 🚀 Entry Points

| 入口 | 路径 | 说明 |
|-----|------|-----|
| 首页 | `src/app/page.tsx` | 岩场列表 (Server Component + ISR) |
| 线路列表 | `src/app/route/page.tsx` | 带筛选功能 |
| 数据访问 | `src/lib/db/index.ts` | MongoDB CRUD |
| Service Worker | `src/app/sw.ts` | Serwist 配置 |

## 📦 Core Modules

### 数据层 (`src/lib/db/index.ts`)
- `getAllCrags()` - 获取所有岩场
- `getCragById(id)` - 获取单个岩场
- `getAllRoutes()` - 获取所有线路
- `getRouteById(id)` - 获取单条线路
- `getRoutesByCragId(cragId)` - 按岩场筛选线路

### 筛选常量 (`src/lib/filter-constants.ts`)
- `GRADE_GROUPS` - 难度分组配置 (入门/初级/中级/高级/精英)
- `FILTER_PARAMS` - URL 参数名常量 (crag, grade, q)
- `getGradesByValues()` - 根据分组获取难度数组

### 类型定义 (`src/types/index.ts`)
- `Crag` - 岩场 (id, name, location, approach, coverImages)
- `Route` - 线路 (id, name, grade, cragId, area, FA)

## 🔧 Configuration

| 文件 | 用途 |
|-----|-----|
| `package.json` | 依赖和脚本 |
| `tsconfig.json` | TypeScript 配置 |
| `components.json` | shadcn/ui 配置 |
| `vercel.json` | Vercel 部署配置 |
| `public/manifest.json` | PWA 清单 |

## 🎨 Design System

**Material 3 风格** - CSS 变量定义在 `globals.css`:
- 主色: `--m3-primary: #667eea`
- 表面: `--m3-surface`, `--m3-surface-variant`
- 文字: `--m3-on-surface`, `--m3-on-surface-variant`
- 轮廓: `--m3-outline`

**动画类**:
- `.animate-fade-in-up` - 淡入上移
- `.animate-scale-in` - 缩放淡入
- `.skeleton-shimmer` - 骨架屏
- `.scrollbar-hide` - 隐藏滚动条

## 🔗 Key Dependencies

| 依赖 | 版本 | 用途 |
|-----|------|-----|
| next | 16.1.2 | React 框架 + App Router |
| react | 19.2.3 | UI 库 |
| mongodb | 7.0.0 | 数据库驱动 |
| @serwist/next | 9.5.0 | PWA Service Worker |
| tailwindcss | 4.x | CSS 框架 |
| lucide-react | 0.562.0 | 图标库 |

## 📝 Quick Start

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 设置 MONGODB_URI

# 3. 数据迁移 (可选)
npm run db:seed

# 4. 启动开发服务器
npm run dev
# → http://localhost:3000

# 5. 生产构建
npm run build && npm start
```

## 📚 Documentation

| 文档 | 说明 |
|-----|-----|
| `CLAUDE.md` | AI 开发指南 (简洁) |
| `doc/PROJECT_OVERVIEW.md` | 技术详细文档 |
| `PROJECT_INDEX.md` | 本索引文件 |

## 🗂️ URL Routes

| 路径 | 页面 | 参数 |
|-----|-----|-----|
| `/` | 首页 - 岩场列表 | - |
| `/crag/[id]` | 岩场详情 | id: 岩场ID |
| `/route` | 线路列表 | ?crag=&grade=&q= |
| `/route/[id]` | 线路详情 | id: 线路ID |
| `/profile` | 用户页面 | - |

---

**Token 效率**: 本索引 ~2.5KB，读取全部源码 ~58KB (节省 96%)
