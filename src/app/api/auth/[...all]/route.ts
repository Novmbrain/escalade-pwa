import { getAuth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export async function GET(req: Request) {
  const auth = await getAuth()
  return toNextJsHandler(auth).GET(req)
}

export async function POST(req: Request) {
  const auth = await getAuth()
  return toNextJsHandler(auth).POST(req)
}
