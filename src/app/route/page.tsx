import { Suspense } from 'react'
import { getAllRoutes, getRoutesByCragId, getCragById } from '@/lib/db'
import { RouteCardSkeleton } from '@/components/route-card-skeleton'
import RouteListClient from './route-client'

// ISR: 每小时重新验证一次
export const revalidate = 3600

interface RouteListPageProps {
  searchParams: Promise<{ crag?: string }>
}

async function RouteListContent({ searchParams }: RouteListPageProps) {
  const params = await searchParams
  const cragFilter = params.crag

  const routes = cragFilter
    ? await getRoutesByCragId(cragFilter)
    : await getAllRoutes()

  const currentCrag = cragFilter ? await getCragById(cragFilter) : null

  return <RouteListClient routes={routes} currentCrag={currentCrag} />
}

export default async function RouteListPage(props: RouteListPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-screen overflow-hidden bg-[var(--m3-surface)]">
          <header className="flex-shrink-0 pt-12 px-4 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[var(--m3-surface-variant)] animate-pulse" />
              <div className="h-7 w-24 rounded-md bg-[var(--m3-surface-variant)] animate-pulse" />
            </div>
            <div className="h-10 w-full rounded-full bg-[var(--m3-surface-variant)] animate-pulse mb-3" />
            <div className="flex gap-2">
              <div className="h-8 w-16 rounded-full bg-[var(--m3-surface-variant)] animate-pulse" />
              <div className="h-8 w-16 rounded-full bg-[var(--m3-surface-variant)] animate-pulse" />
              <div className="h-8 w-14 rounded-full bg-[var(--m3-surface-variant)] animate-pulse" />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto px-4 pb-4">
            <RouteCardSkeleton count={6} />
          </main>
        </div>
      }
    >
      <RouteListContent searchParams={props.searchParams} />
    </Suspense>
  )
}
