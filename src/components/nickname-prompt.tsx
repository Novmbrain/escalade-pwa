'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Drawer } from '@/components/ui/drawer'
import { useToast } from '@/components/ui/toast'
import { authClient, useSession } from '@/lib/auth-client'

const DISMISSED_KEY = 'nickname-prompt-dismissed'

export function NicknamePrompt() {
  const t = useTranslations('Profile')
  const { showToast } = useToast()
  const sessionHook = useSession()
  const session = sessionHook.data

  const [isOpen, setIsOpen] = useState(false)
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)

  // Show prompt if: logged in, no name, not dismissed before
  useEffect(() => {
    if (!session) return
    const userName = (session.user as { name?: string }).name
    if (userName) return
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return
    } catch {}
     
    setIsOpen(true)
  }, [session])

  const dismiss = useCallback(() => {
    setIsOpen(false)
    try { localStorage.setItem(DISMISSED_KEY, '1') } catch {}
  }, [])

  const handleSave = useCallback(async () => {
    const trimmed = nickname.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await authClient.updateUser({ name: trimmed })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sessionHook as any).refetch?.({ query: { disableCookieCache: true } })
      showToast(t('profileSaved'), 'success')
      dismiss()
    } catch {
      showToast(t('profileSaveFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }, [nickname, sessionHook, showToast, t, dismiss])

  return (
    <Drawer
      isOpen={isOpen}
      onClose={dismiss}
      height="auto"
      showHandle
    >
      <div className="px-6 pb-6 pt-2">
        <div className="text-center mb-5">
          <h2
            className="text-lg font-bold mb-1"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            {t('nicknamePromptTitle')}
          </h2>
          <p
            className="text-sm"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            {t('nicknamePromptSubtitle')}
          </p>
        </div>

        <Input
          value={nickname}
          onChange={setNickname}
          placeholder={t('nicknamePlaceholder')}
          variant="form"
          maxLength={20}
          autoFocus
        />

        <div className="flex gap-3 mt-4">
          <button
            onClick={dismiss}
            className="flex-1 p-2.5 text-sm font-medium transition-all active:scale-[0.98]"
            style={{
              color: 'var(--theme-on-surface-variant)',
              borderRadius: 'var(--theme-radius-lg)',
            }}
          >
            {t('nicknamePromptSkip')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !nickname.trim()}
            className="flex-1 p-2.5 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-40"
            style={{
              backgroundColor: 'var(--theme-primary)',
              color: 'var(--theme-on-primary)',
              borderRadius: 'var(--theme-radius-lg)',
            }}
          >
            {t('nicknamePromptSave')}
          </button>
        </div>
      </div>
    </Drawer>
  )
}
