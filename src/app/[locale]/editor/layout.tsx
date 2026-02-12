import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session || (session.user as { role?: string }).role !== 'admin') {
    redirect('/login')
  }

  return <>{children}</>
}
