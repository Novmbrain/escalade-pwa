'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Mountain, User } from 'lucide-react'
import { colors } from '@/lib/tokens'

const TAB_ITEMS = [
  { name: 'home', path: '/', icon: Home, label: '首页' },
  { name: 'routes', path: '/route', icon: Mountain, label: '线路' },
  { name: 'profile', path: '/profile', icon: User, label: '我的' },
]

export function AppTabbar() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--m3-outline-variant)] safe-area-bottom z-50">
      <div className="flex items-center justify-around h-14">
        {TAB_ITEMS.map((tab) => {
          const Icon = tab.icon
          const active = isActive(tab.path)

          return (
            <Link
              key={tab.name}
              href={tab.path}
              className="flex flex-col items-center justify-center flex-1 h-full"
            >
              <Icon
                className="w-6 h-6 mb-0.5 transition-colors"
                style={{ color: active ? colors.primary : colors.outline }}
              />
              <span
                className="text-xs transition-colors"
                style={{ color: active ? colors.primary : colors.outline }}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
