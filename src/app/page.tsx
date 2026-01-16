import { getAllCrags, getAllRoutes } from '@/lib/db'
import HomePageClient from './home-client'

// ISR: 每小时重新验证一次
export const revalidate = 3600

export default async function HomePage() {
  const crags = await getAllCrags()
  const allRoutes = await getAllRoutes()

  return <HomePageClient crags={crags} allRoutes={allRoutes} />
}
