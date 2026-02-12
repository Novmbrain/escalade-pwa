import { createAuthClient } from 'better-auth/react'
import { magicLinkClient } from 'better-auth/client/plugins'
import { passkeyClient } from '@better-auth/passkey/client'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    magicLinkClient(),
    passkeyClient(),
  ],
})

export const {
  signIn,
  signOut,
  useSession,
  getSession,
} = authClient
