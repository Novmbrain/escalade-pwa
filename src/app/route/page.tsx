import { Suspense } from 'react'
import { getAllRoutes, getAllCrags } from '@/lib/db'
import { RouteCardSkeleton } from '@/components/route-card-skeleton'
import RouteListClient from './route-client'

// ISR: 每小时重新验证一次
export const revalidate = 3600

async function RouteListContent() {
  // 并行获取所有数据
  const [routes, crags] = await Promise.all([
    getAllRoutes(),
    getAllCrags(),
  ])

  return <RouteListClient routes={routes} crags={crags} />
}

export default async function RouteListPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-screen overflow-hidden bg-[var(--m3-surface)]">
          <header className="flex-shrink-0 pt-12 px-4 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[var(--m3-surface-variant)] animate-pulse" />
              <div className="h-7 w-24 rounded-md bg-[var(--m3-surface-variant)] animate-pulse" />
            </div>
            {/* 搜索框骨架 */}
            <div className="h-10 w-full rounded-full bg-[var(--m3-surface-variant)] animate-pulse mb-3" />
            {/* 岩场筛选芯片骨架 (第一行) */}
            <div className="flex gap-2 mb-2">
              <div className="h-8 w-14 rounded-full bg-[var(--m3-surface-variant)] animate-pulse" />
              <div className="h-8 w-16 rounded-full bg-[var(--m3-surface-variant)] animate-pulse" />
              <div className="h-8 w-16 rounded-full bg-[var(--m3-surface-variant)] animate-pulse" />
            </div>
            {/* 难度筛选芯片骨架 (第二行) */}
            <div className="flex gap-2">
              <div className="h-8 w-14 rounded-full bg-[var(--m3-surface-variant)] animate-pulse" />
              <div className="h-8 w-14 rounded-full bg-[var(--m3-surface-variant)] animate-pulse" />
              <div className="h-8 w-14 rounded-full bg-[var(--m3-surface-variant)] animate-pulse" />
              <div className="h-8 w-14 rounded-full bg-[var(--m3-surface-variant)] animate-pulse" />
              <div className="h-8 w-14 rounded-full bg-[var(--m3-surface-variant)] animate-pulse" />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto px-4 pb-4">
            <RouteCardSkeleton count={6} />
          </main>
        </div>
      }
    >
      <RouteListContent />
    </Suspense>
  )
}
