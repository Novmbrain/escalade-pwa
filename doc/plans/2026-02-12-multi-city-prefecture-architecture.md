# 多城市架构：地级市分组层设计

> 在现有区/县级数据隔离架构上叠加地级市 (Prefecture) 分组层，实现两级城市选择。

---

## 核心原则

- **数据隔离粒度不变**：后端查询、R2 存储、缓存、Cookie 仍以 `CityId`（区/县级）为主键
- **地级市仅为 UI 分组**：`Prefecture` 配置纯前端，不进入数据库
- **最小改动量**：不改 DB schema、不改 API 接口、不改 `useCitySelection` 返回值

---

## 一、数据模型（city-config.ts）

### 1.1 新增 PrefectureConfig

```typescript
interface PrefectureConfig {
  id: string            // 'fuzhou', 'xiamen'
  name: string          // '福州', '厦门'
  shortName: string     // '福州', '厦门'
  /** 该地级市下的区/县 CityId 列表（有序） */
  districts: CityId[]
  /** IP 定位命中市级 adcode 时默认选中的区 */
  defaultDistrict: CityId
}

export const PREFECTURES: PrefectureConfig[] = [
  {
    id: 'fuzhou',
    name: '福州',
    shortName: '福州',
    districts: ['luoyuan', 'changle'],
    defaultDistrict: 'luoyuan',
  },
  {
    id: 'xiamen',
    name: '厦门',
    shortName: '厦门',
    districts: ['xiamen'],
    defaultDistrict: 'xiamen',
  },
]
```

### 1.2 新增工具函数

```typescript
/** 根据 CityId 反查所属地级市 */
export function getPrefectureByDistrictId(districtId: CityId): PrefectureConfig | undefined {
  return PREFECTURES.find(p => p.districts.includes(districtId))
}

/** 根据市级 adcode 前缀查找地级市 */
export function getPrefectureByAdcodePrefix(prefix: string): PrefectureConfig | undefined {
  // 查找 districts 中任意一个区的 adcode 以该前缀开头的地级市
  return PREFECTURES.find(p =>
    p.districts.some(d => getCityById(d)?.adcode.startsWith(prefix))
  )
}
```

### 1.3 现有 CityId / CITIES_DATA 不变

`CityId` 仍为 `'luoyuan' | 'xiamen' | 'changle'`，数据库 `crag.cityId` 字段不变。

---

## 二、城市选择器 UI（city-selector.tsx）

### 2.1 交互设计

```
点击「福州 · 罗源 ▾」→ 下拉菜单：

  ┌──────────────────────┐
  │ 福州            ▸    │  ← 多区域：点击展开子级
  │   ✓ 罗源              │  ← 当前选中
  │     长乐   即将开放   │
  │ 厦门                  │  ← 单区域：点击直接选中
  └──────────────────────┘
```

### 2.2 交互规则

| 条件 | 行为 |
|------|------|
| 地级市下 **1 个区** | 点击地级市名直接选中该区 |
| 地级市下 **多个区** | 点击展开/折叠子列表，点击子区域选中 |
| 不可用区 (`available: false`) | 灰色显示 + "即将开放" 标签，不可点击 |

### 2.3 标题展示

- 通过 `getPrefectureByDistrictId(currentCity.id)` 获取所属地级市
- 标题格式：`{prefecture.name} · {district.name}`
- 当地级市名 === 区名时（厦门）只显示一次：`{name}`

```tsx
// 伪代码
const prefecture = getPrefectureByDistrictId(currentCity.id)
const title = prefecture && prefecture.name !== currentCity.name
  ? `${prefecture.name} · ${currentCity.name}`
  : currentCity.name
```

### 2.4 实现要点

- 内部 import `PREFECTURES`，不改 props 接口
- 新增 `expandedPrefecture` 本地状态
- `onCityChange` 回调仍传 `CityId`（区/县级），不变

---

## 三、IP 定位适配

### 3.1 问题

高德 IP 定位 API 可能返回市级 adcode（如 `350100` = 福州）。当前 `getCityByAdcode` 的前缀匹配会返回 `CITIES` 数组中排第一个的区，这是隐性排序依赖。

### 3.2 修复

修改 `getCityByAdcode(adcode)` 的前缀匹配逻辑：

```typescript
export function getCityByAdcode(adcode: string): CityConfig | undefined {
  // 1. 精确匹配
  const exact = CITIES.find(city => city.adcode === adcode)
  if (exact) return exact

  // 2. 前缀匹配 → 通过 Prefecture.defaultDistrict 决定
  const cityPrefix = adcode.slice(0, 4)
  const prefecture = getPrefectureByAdcodePrefix(cityPrefix)
  if (prefecture) {
    return getCityById(prefecture.defaultDistrict)
  }

  return undefined
}
```

### 3.3 不需要改动的部分

| 模块 | 原因 |
|------|------|
| `/api/geo` | 调用 `getCityByAdcode` 即可，接口不变 |
| `useCitySelection` | 消费 `cityId` 粒度不变 |
| `getNearestCity` | 按坐标距离计算，不受分组影响 |

---

## 四、各页面影响评估

### 4.1 无需修改

| 页面/模块 | 原因 |
|-----------|------|
| 首页数据加载 (`page.tsx`) | Cookie → `getCragsByCityId(cityId)` 不变 |
| 线路列表页 (`route-client.tsx`) | `?city=xxx` URL 参数仍为区/县级 CityId |
| 岩场详情页 (`crag/[id]/page.tsx`) | URL 级隔离，不涉及城市 |
| 天气 API (`/api/weather`) | 按区/县 adcode 查询，粒度正确 |
| 天气展示 (`weather-strip`, `weather-card`) | 已按 `currentCity.name` 展示区/县名 |
| R2 存储 / FaceImageCache | Key 以 `cragId` 开头，不涉及城市 |
| 数据库层 (`db/index.ts`) | 查询条件不变 |
| 所有 API 路由 | 接口不变 |

### 4.2 需要修改

| 文件 | 改动内容 | 优先级 |
|------|---------|--------|
| `src/lib/city-config.ts` | 新增 `PrefectureConfig`、`PREFECTURES`、工具函数、修改 `getCityByAdcode` | P0 |
| `src/components/city-selector.tsx` | 两级下拉 + 「福州 · 罗源」标题 | P0 |
| `src/app/[locale]/offline/page.tsx` | 已下载岩场按地级市分组展示 | P1 |

### 4.3 i18n

| 键 | zh | en | fr |
|----|----|----|-----|
| 地级市名 | 福州、厦门 | Fuzhou、Xiamen | Fuzhou、Xiamen |

地级市名需要国际化。有两种方案：
- **方案 A**：`PrefectureConfig` 中只存中文名，通过 i18n 翻译键映射（`CitySelector.prefecture.fuzhou`）
- **方案 B**：`PrefectureConfig` 中存 i18n 键，直接查翻译文件

推荐方案 A，与现有 `CityConfig.name` 模式一致。

---

## 五、实现步骤

### Step 1: 数据模型 (city-config.ts)

1. 定义 `PrefectureConfig` 接口
2. 添加 `PREFECTURES` 常量
3. 添加 `getPrefectureByDistrictId()` 和 `getPrefectureByAdcodePrefix()`
4. 修改 `getCityByAdcode()` 使用 `defaultDistrict`
5. 更新 `city-config.test.ts` 测试

### Step 2: i18n 翻译

1. 在 `messages/{locale}.json` 的 `CitySelector` 命名空间添加地级市名翻译
2. 添加 `expandCity` / `collapseCity` 等 UI 文案

### Step 3: 城市选择器 (city-selector.tsx)

1. 重写下拉菜单为两级结构
2. 添加 `expandedPrefecture` 状态
3. 实现单区域地级市自动选中逻辑
4. 标题改为 `prefecture.name · district.name` 格式
5. 测试两级选择交互

### Step 4: 离线页分组 (offline/page.tsx)

1. 已下载岩场按 `getPrefectureByDistrictId` 分组
2. 每组显示地级市标题

### Step 5: 验证

1. ESLint + TypeScript + Vitest 全部通过
2. 手动验证：城市选择器两级交互、IP 定位、天气展示、线路页过滤、离线页分组
3. 暗色/亮色主题检查

---

## 六、不做的事情

| 事项 | 原因 |
|------|------|
| 数据库加 `prefectureId` | 前端分组足够，不需要后端改动 |
| 重命名 `CityId` 为 `DistrictId` | 改动面太大，收益不明显 |
| 城市配置入库 | 5-10 个城市内静态配置足够 |
| API 鉴权 | 独立议题，不在本次范围 |
| 线路页 URL 参数改为市级 | 数据粒度是区级，URL 也应该是区级 |
