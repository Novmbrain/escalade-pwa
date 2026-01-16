'use client'

import { cn } from '@/lib/utils'

interface FilterChipProps {
  label: string
  selected: boolean
  onClick: () => void
  color?: string
  className?: string
}

/**
 * 筛选芯片组件
 * 支持自定义颜色，选中时显示对应颜色背景
 */
export function FilterChip({
  label,
  selected,
  onClick,
  color,
  className,
}: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex-shrink-0',
        'active:scale-95',
        selected
          ? 'text-white shadow-sm'
          : 'bg-[var(--m3-surface-variant)] text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-outline-variant)]',
        className
      )}
      style={
        selected
          ? { backgroundColor: color || 'var(--m3-primary)' }
          : undefined
      }
    >
      {label}
    </button>
  )
}

interface FilterChipGroupProps {
  children: React.ReactNode
  className?: string
}

/**
 * 筛选芯片组容器
 * 提供横向滚动和隐藏滚动条样式
 */
export function FilterChipGroup({ children, className }: FilterChipGroupProps) {
  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto scrollbar-hide pb-0.5',
        className
      )}
    >
      {children}
    </div>
  )
}
