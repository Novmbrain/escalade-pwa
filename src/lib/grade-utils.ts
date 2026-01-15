/**
 * 难度等级工具函数
 */

// 难度等级顺序
export const GRADE_ORDER = [
  'V0', 'V1', 'V2', 'V3', 'V4', 'V5',
  'V6', 'V7', 'V8', 'V9', 'V10', 'V11',
  'V12', 'V13', '？'
]

// 难度分组
export const GRADE_GROUPS = [
  { label: '入门', range: 'V0-V3', grades: ['V0', 'V1', 'V2', 'V3'] },
  { label: '进阶', range: 'V4-V6', grades: ['V4', 'V5', 'V6'] },
  { label: '高级', range: 'V7-V9', grades: ['V7', 'V8', 'V9'] },
  { label: '精英', range: 'V10+', grades: ['V10', 'V11', 'V12', 'V13'] },
]

/**
 * 解析难度等级为数字
 */
export function parseGrade(grade: string): number {
  if (grade === '？') return -1
  const match = grade.match(/V(\d+)/)
  return match ? parseInt(match[1], 10) : -1
}

/**
 * 比较两个难度等级
 * 返回值：负数表示 a < b，0 表示相等，正数表示 a > b
 */
export function compareGrades(a: string, b: string): number {
  return parseGrade(a) - parseGrade(b)
}

/**
 * 计算难度范围
 */
export function calculateGradeRange(grades: string[]): string {
  const validGrades = grades.filter((g) => g !== '？')
  if (validGrades.length === 0) return '暂无'

  const sorted = validGrades.sort(compareGrades)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]

  return min === max ? min : `${min} - ${max}`
}

/**
 * 获取难度等级的显示颜色
 */
export function getGradeDisplayColor(grade: string): {
  bg: string
  text: string
} {
  const num = parseGrade(grade)

  if (num < 0) return { bg: '#9E9E9E20', text: '#9E9E9E' }
  if (num <= 3) return { bg: '#4CAF5020', text: '#4CAF50' } // 绿色系
  if (num <= 6) return { bg: '#FF980020', text: '#FF9800' } // 橙色系
  if (num <= 9) return { bg: '#F4433620', text: '#F44336' } // 红色系
  return { bg: '#9C27B020', text: '#9C27B0' } // 紫色系
}

/**
 * 获取难度等级描述
 */
export function getGradeDescription(grade: string): string {
  const num = parseGrade(grade)

  if (num < 0) return '未知难度'
  if (num <= 1) return '入门级'
  if (num <= 3) return '初级'
  if (num <= 5) return '中级'
  if (num <= 7) return '高级'
  if (num <= 9) return '专业级'
  return '精英级'
}
