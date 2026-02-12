import { betterAuth } from 'better-auth'
import { mongodbAdapter } from 'better-auth/adapters/mongodb'
import { magicLink } from 'better-auth/plugins'
import { passkey } from '@better-auth/passkey'
import { Resend } from 'resend'
import { getDatabase, clientPromise } from '@/lib/mongodb'
import { magicLinkEmailTemplate } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)

const client = await clientPromise
const db = await getDatabase()

export const auth = betterAuth({
  database: mongodbAdapter(db, { client }),

  appName: '寻岩记 BlocTop',
  baseURL: process.env.NEXT_PUBLIC_APP_URL,

  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
      },
    },
  },

  plugins: [
    magicLink({
      expiresIn: 600, // 10 minutes
      sendMagicLink: async ({ email, url }) => {
        // TODO: 域名验证后改回 'noreply@bouldering.top'
        const from = process.env.NODE_ENV === 'production'
          ? '寻岩记 <noreply@bouldering.top>'
          : '寻岩记 <onboarding@resend.dev>'
        const { error } = await resend.emails.send({
          from,
          to: email,
          subject: '登录寻岩记 BlocTop',
          html: magicLinkEmailTemplate(url),
        })
        if (error) {
          console.error('[Auth] Magic Link email failed:', error)
          throw new Error(error.message)
        }
      },
    }),

    passkey({
      rpID: process.env.NODE_ENV === 'production'
        ? 'bouldering.top'
        : 'localhost',
      rpName: '寻岩记 BlocTop',
      origin: process.env.NEXT_PUBLIC_APP_URL!,
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh daily
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 min cache to reduce DB queries
    },
  },

  rateLimit: {
    window: 60,
    max: 10,
  },
})
