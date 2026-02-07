# City Backend Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the city architecture to eliminate hardcoded values, add API-level city filtering, and dynamize weather coordinates before adding Xiamen crag data.

**Architecture:** Use `as const` for type-safe auto-derivation of `CityId` from `CITIES` array, add `getCragsByCityId()` database function with MongoDB `cityId` filter, replace hardcoded `LUOYUAN_DEFAULT_COORDS` with `getCityById()` lookup, and create a migration script for `cityId` index.

**Tech Stack:** TypeScript (as const assertion), MongoDB (index creation), Next.js API Routes, Vitest

---

### Task 1: CityId Type Auto-Derivation

**Files:**
- Modify: `src/lib/city-config.ts:15-59`
- Modify: `src/lib/city-config.test.ts:107-118`

**Step 1: Update `CITIES` to use `as const satisfies`**

Replace the current `CITIES` array and `CityId` type in `src/lib/city-config.ts`:

```typescript
// 删除手动维护的 CityId 类型:
// export type CityId = 'luoyuan' | 'xiamen'

// 改为 as const satisfies，让 TypeScript 自动推导 CityId
const CITIES_DATA = [
  {
    id: 'luoyuan',
    name: '罗源',
    shortName: '罗源',
    adcode: '350123',
    coordinates: { lng: 119.549, lat: 26.489 },
    available: true,
  },
  {
    id: 'xiamen',
    name: '厦门',
    shortName: '厦门',
    adcode: '350200',
    coordinates: { lng: 118.089, lat: 24.479 },
    available: false,
  },
] as const satisfies readonly CityConfigInput[]

// 从数组中自动推导 CityId 类型
export type CityId = typeof CITIES_DATA[number]['id']

// CityConfig 接口保持不变（供外部使用）
export interface CityConfig { ... }

// 导出时转换为 mutable CityConfig[]（保持 API 兼容）
export const CITIES: CityConfig[] = [...CITIES_DATA]
```

> **注意**: 需要一个 `CityConfigInput` helper 类型（不含 `CityId` 约束的版本），因为 `as const` 不能引用自身推导的类型。具体实现方案见 Step 3。

**Step 2: Refine the implementation approach**

实际上更简单的方案 — 不需要 `satisfies`，只需 `as const` + 类型提取：

```typescript
// src/lib/city-config.ts

import type { Coordinates } from '@/types'

// ==================== 类型定义 ====================

/**
 * 城市配置原始数据（as const 保留字面量类型）
 */
const CITIES_DATA = [
  {
    id: 'luoyuan',
    name: '罗源',
    shortName: '罗源',
    adcode: '350123',
    coordinates: { lng: 119.549, lat: 26.489 } as Coordinates,
    available: true as boolean,
  },
  {
    id: 'xiamen',
    name: '厦门',
    shortName: '厦门',
    adcode: '350200',
    coordinates: { lng: 118.089, lat: 24.479 } as Coordinates,
    available: false as boolean,
  },
] as const

/**
 * 城市 ID 类型（自动从 CITIES_DATA 推导，新增城市时无需手动维护）
 */
export type CityId = typeof CITIES_DATA[number]['id']

/**
 * 城市配置接口
 */
export interface CityConfig {
  id: CityId
  name: string
  shortName: string
  adcode: string
  coordinates: Coordinates
  available: boolean
}

/**
 * 支持的城市列表
 */
export const CITIES: CityConfig[] = CITIES_DATA as unknown as CityConfig[]
```

**Step 3: Update test for `isCityAvailable`**

`src/lib/city-config.test.ts:107-118` — 当厦门 `available` 改为 `true` 时需要更新这个测试。但**目前无需修改**，因为厦门还没正式开放。等 Task 完成后跑测试验证即可。

**Step 4: Run tests to verify no regressions**

```bash
npm run test:run -- src/lib/city-config.test.ts
```

Expected: All 18 tests PASS (existing behavior unchanged)

**Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No type errors (all existing `CityId` usage sites should continue to work since `'luoyuan' | 'xiamen'` 的推导结果与手动定义完全相同)

**Step 6: Commit**

```bash
git add src/lib/city-config.ts
git commit -m "refactor(city): auto-derive CityId type from CITIES array"
```

---

### Task 2: Database Layer — Add `getCragsByCityId()`

**Files:**
- Modify: `src/lib/db/index.ts` (在 `getAllCrags` 后添加新函数)

**Step 1: Add `getCragsByCityId` function**

在 `src/lib/db/index.ts:68` (紧跟 `getAllCrags` 之后) 添加:

```typescript
/**
 * 根据城市 ID 获取岩场列表
 */
export async function getCragsByCityId(cityId: string): Promise<Crag[]> {
  const start = Date.now()

  try {
    const db = await getDatabase()
    const docs = await db
      .collection('crags')
      .find({ cityId })
      .sort({ createdAt: -1 })
      .toArray()

    log.info(`Fetched ${docs.length} crags for city: ${cityId}`, {
      action: 'getCragsByCityId',
      duration: Date.now() - start,
      metadata: { cityId },
    })

    return docs.map(toCrag)
  } catch (error) {
    log.error(`Failed to fetch crags for city: ${cityId}`, error, {
      action: 'getCragsByCityId',
      duration: Date.now() - start,
      metadata: { cityId },
    })
    throw error
  }
}
```

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No type errors

**Step 3: Commit**

```bash
git add src/lib/db/index.ts
git commit -m "feat(db): add getCragsByCityId for city-level crag filtering"
```

---

### Task 3: API Route — Support `?cityId=` query parameter

**Files:**
- Modify: `src/app/api/crags/route.ts`

**Step 1: Update GET handler to accept cityId**

Replace `src/app/api/crags/route.ts` entirely:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getAllCrags, getCragsByCityId } from '@/lib/db'
import { isValidCityId } from '@/lib/city-config'
import { createModuleLogger } from '@/lib/logger'

const log = createModuleLogger('API:Crags')

/**
 * GET /api/crags
 * GET /api/crags?cityId=luoyuan
 * 获取岩场列表（可选按城市过滤）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cityId = searchParams.get('cityId')

    const crags = cityId && isValidCityId(cityId)
      ? await getCragsByCityId(cityId)
      : await getAllCrags()

    return NextResponse.json({
      success: true,
      crags,
    })
  } catch (error) {
    log.error('Failed to get crags', error, {
      action: 'GET /api/crags',
    })
    return NextResponse.json(
      { success: false, error: '获取岩场列表失败' },
      { status: 500 }
    )
  }
}
```

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No type errors

**Step 3: Commit**

```bash
git add src/app/api/crags/route.ts
git commit -m "feat(api): support cityId query param in GET /api/crags"
```

> **Note:** 首页 Server Component (`page.tsx`) 目前直接调用 `getAllCrags()` 而不经过 API route。客户端过滤逻辑在 `home-client.tsx` 中。此改进使得 API 调用方（如编辑器、未来的 SSR 优化）可以按城市过滤，但**不改变首页的数据流**（那是一个更大的重构，涉及 ISR 策略调整）。

---

### Task 4: Weather Coordinates — Remove Hardcoded `LUOYUAN_DEFAULT_COORDS`

**Files:**
- Modify: `src/lib/weather-constants.ts:203-209`
- Modify: `src/app/api/weather/route.ts:4,213-214`

**Step 1: Replace hardcoded coords in `weather-constants.ts`**

在 `src/lib/weather-constants.ts` 中，将:

```typescript
/**
 * 罗源县默认坐标 (用于区域天气)
 */
export const LUOYUAN_DEFAULT_COORDS = {
  lng: 119.5495,
  lat: 26.4893,
}
```

替换为:

```typescript
import { getCityById, DEFAULT_CITY_ID } from './city-config'

/**
 * 默认天气查询坐标（从城市配置读取，不再硬编码）
 */
export const DEFAULT_WEATHER_COORDS = (() => {
  const city = getCityById(DEFAULT_CITY_ID)
  return city?.coordinates ?? { lng: 119.5495, lat: 26.4893 }
})()
```

> **注意**: 添加 import 到文件顶部。IIFE 确保只计算一次。保留 fallback 值防御 undefined。

**Step 2: Update weather API route import**

在 `src/app/api/weather/route.ts` 中更新:

```typescript
// 旧:
import { LUOYUAN_DEFAULT_COORDS } from '@/lib/weather-constants'

// 新:
import { DEFAULT_WEATHER_COORDS } from '@/lib/weather-constants'
```

以及更新第 213-214 行的使用:

```typescript
// 旧:
const lng = parseFloat(searchParams.get('lng') || String(LUOYUAN_DEFAULT_COORDS.lng))
const lat = parseFloat(searchParams.get('lat') || String(LUOYUAN_DEFAULT_COORDS.lat))

// 新:
const lng = parseFloat(searchParams.get('lng') || String(DEFAULT_WEATHER_COORDS.lng))
const lat = parseFloat(searchParams.get('lat') || String(DEFAULT_WEATHER_COORDS.lat))
```

**Step 3: Check for other usages of `LUOYUAN_DEFAULT_COORDS`**

```bash
# 搜索所有引用，确保全部更新
rg "LUOYUAN_DEFAULT_COORDS" --type ts
```

Expected: 只有 `weather-constants.ts` 和 `weather/route.ts` 两处。如果有其他引用也需一并更新。

**Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No type errors

**Step 5: Commit**

```bash
git add src/lib/weather-constants.ts src/app/api/weather/route.ts
git commit -m "refactor(weather): derive default coords from city config instead of hardcoding"
```

---

### Task 5: Database Index — Create `cityId` index script

**Files:**
- Create: `scripts/migrate-cityid-index.ts`

**Step 1: Write migration script**

```typescript
/**
 * 数据库迁移脚本：为 crags 集合的 cityId 字段创建索引
 *
 * MongoDB 会自动跳过已存在的索引，所以此脚本可安全重复执行
 *
 * 使用方式:
 *   npx tsx scripts/migrate-cityid-index.ts           # 开发环境
 *   npx tsx scripts/migrate-cityid-index.ts production # 生产环境
 */

import { MongoClient } from 'mongodb'
import * as dotenv from 'dotenv'
import path from 'path'

const env = process.argv[2] || 'development'
const envFile = env === 'production' ? '.env.production.local' : '.env.local'

console.log(`\n📦 加载环境配置: ${envFile}`)
dotenv.config({ path: path.resolve(process.cwd(), envFile) })

async function migrate() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB_NAME

  if (!uri || !dbName) {
    console.error('❌ 缺少环境变量 MONGODB_URI 或 MONGODB_DB_NAME')
    process.exit(1)
  }

  console.log(`\n🔗 正在连接到 ${env} 环境数据库: ${dbName}`)

  const client = new MongoClient(uri)

  try {
    await client.connect()
    console.log('✓ 数据库连接成功')

    const db = client.db(dbName)

    // 创建 crags.cityId 索引
    console.log('\n📝 创建 crags.cityId 索引...')
    const indexName = await db.collection('crags').createIndex(
      { cityId: 1 },
      { name: 'idx_cityId', background: true }
    )
    console.log(`✓ 索引创建成功: ${indexName}`)

    // 列出所有索引
    console.log('\n📋 crags 集合当前索引:')
    const indexes = await db.collection('crags').indexes()
    indexes.forEach((idx) => {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`)
    })

    console.log('\n✅ 迁移完成!\n')
  } catch (error) {
    console.error('\n❌ 迁移失败:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

migrate()
```

**Step 2: Run locally to test**

```bash
npx tsx scripts/migrate-cityid-index.ts
```

Expected: Index created successfully (or already exists)

**Step 3: Run on production**

```bash
npx tsx scripts/migrate-cityid-index.ts production
```

Expected: Same result on production database

**Step 4: Commit**

```bash
git add scripts/migrate-cityid-index.ts
git commit -m "feat(db): add cityId index migration script for crags collection"
```

---

### Task 6: Final Verification

**Step 1: Run full test suite**

```bash
npm run test:run
```

Expected: All tests pass

**Step 2: Run lint**

```bash
npm run lint
```

Expected: No errors

**Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No type errors

**Step 4: Manual smoke test (optional)**

```bash
npm run dev
```

Verify:
- 首页加载正常，城市选择器工作
- 天气数据正常显示
- 切换到厦门显示"敬请期待"

**Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "chore: city backend improvements - final fixes"
```
