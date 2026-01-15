'use client'

import { Search } from 'lucide-react'

interface FloatingSearchProps {
  onClick: () => void
  placeholder?: string
}

export function FloatingSearch({
  onClick,
  placeholder = '搜索线路名称',
}: FloatingSearchProps) {
  return (
    <div className="fixed bottom-20 left-4 right-4 z-40">
      <button
        onClick={onClick}
        className="w-full h-12 flex items-center gap-3 px-4 rounded-full bg-white shadow-lg border border-[var(--m3-outline-variant)] hover:shadow-xl transition-shadow active:scale-[0.98]"
      >
        <Search className="w-5 h-5 text-[var(--m3-outline)]" />
        <span className="text-sm text-[var(--m3-outline)]">{placeholder}</span>
      </button>
    </div>
  )
}
