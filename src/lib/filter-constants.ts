/**
 * 线路筛选相关常量配置
 * 用于岩场和难度分类筛选功能
 */

/**
 * 难度分组配置
 * 每个分组包含标签、URL 参数值、对应的具体难度等级和颜色
 */
export const GRADE_GROUPS = [
  {
    label: '入门',
    value: 'V0-V2',
    grades: ['V0', 'V1', 'V2'],
    color: '#4CAF50'
  },
  {
    label: '初级',
    value: 'V3-V4',
    grades: ['V3', 'V4'],
    color: '#8BC34A'
  },
  {
    label: '中级',
    value: 'V5-V6',
    grades: ['V5', 'V6'],
    color: '#FFC107'
  },
  {
    label: '高级',
    value: 'V7-V8',
    grades: ['V7', 'V8'],
    color: '#FF9800'
  },
  {
    label: '精英',
    value: 'V9+',
    grades: ['V9', 'V10', 'V11', 'V12', 'V13'],
    color: '#F44336'
  },
] as const

/**
 * 根据 URL 参数值获取对应的难度等级数组
 */
export function getGradesByValue(value: string): string[] {
  const group = GRADE_GROUPS.find(g => g.value === value)
  return group ? [...group.grades] : []
}

/**
 * 根据多个 URL 参数值获取所有对应的难度等级
 */
export function getGradesByValues(values: string[]): string[] {
  return values.flatMap(getGradesByValue)
}

/**
 * URL 参数名称常量
 */
export const FILTER_PARAMS = {
  CRAG: 'crag',
  GRADE: 'grade',
  QUERY: 'q',
} as const
