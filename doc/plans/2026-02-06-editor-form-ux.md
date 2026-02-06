# Editor Form UX Improvements — 编辑器表单输入体验优化

## 问题

编辑器的岩面管理和线路标注页面存在三个维度的表单体验问题：
- A: 验证反馈不及时，用户不知道哪里出错
- B: 切换线路时丢失未保存的编辑，无确认弹窗
- C (dropped): 上传/压缩体验 — 用户不需要

## 变更清单

### 1. 状态保护 — Dirty Check + 确认弹窗

**文件**: `src/app/[locale]/editor/routes/page.tsx`

核心机制：
- `hasUnsavedChanges()` 比较 `editedRoute` vs `selectedRoute` 的关键字段
- 触发时机：点击另一条线路、切换区域、切换岩场
- 弹窗选项：「丢弃」or「保存并切换」
- 额外：清空 topo 标注时也加确认弹窗

实现方式：
- 新增 `pendingAction` state 存储被拦截的操作
- 拦截 `handleSelectRoute`、`handleSelectArea`、`handleSelectCrag`
- 弹窗确认后执行 pendingAction 或先 save 再执行

### 2. 区域选择重设计 — AreaSelect 组件

**新文件**: `src/components/editor/area-select.tsx`

统一替换 3 处区域选择交互：
- `routes/page.tsx` 创建线路的区域选择
- `routes/page.tsx` 编辑线路的区域选择
- `faces/page.tsx` 创建岩面的区域选择

组件 API:
```tsx
<AreaSelect
  areas={string[]}
  value={string}
  onChange={(area: string) => void}
  placeholder?: string
/>
```

交互：
- 默认显示 select 下拉框，底部固定「+ 新建区域」选项
- 点击新建后切换为 Input 输入模式 + 「取消」链接
- 内部管理 `isCreating` 状态

### 3. 表单验证反馈优化

**文件**: `routes/page.tsx` + `faces/page.tsx`

两层验证：
- 实时提示：FaceId 字段下方常驻灰色 hint 文字（不是报错）
- 提交验证：点击保存/创建时检查必填字段，显示 inline 红色边框 + 错误文字
- 错误消失条件：用户开始输入对应字段
- 可选：按钮 shake 动画
