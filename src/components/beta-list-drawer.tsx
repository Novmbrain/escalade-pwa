'use client'

import { ExternalLink, BookHeart, Music2, Play, Youtube } from 'lucide-react'
import { Drawer } from '@/components/ui/drawer'
import { BETA_PLATFORMS } from '@/lib/beta-constants'
import type { BetaLink, BetaPlatform } from '@/types'

interface BetaListDrawerProps {
  isOpen: boolean
  onClose: () => void
  betaLinks: BetaLink[]
  routeName: string
}

// 平台图标映射
const PLATFORM_ICONS: Record<BetaPlatform, React.ComponentType<{ className?: string }>> = {
  xiaohongshu: BookHeart,
  douyin: Music2,
  bilibili: Play,
  youtube: Youtube,
  other: ExternalLink,
}

export function BetaListDrawer({
  isOpen,
  onClose,
  betaLinks,
  routeName,
}: BetaListDrawerProps) {
  const handleLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      height="half"
      title={`${routeName} 的 Beta`}
      showCloseButton
    >
      <div className="px-4 pb-4">
        {betaLinks.length === 0 ? (
          <div className="text-center py-12">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--theme-surface-variant)' }}
            >
              <ExternalLink
                className="w-8 h-8"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              />
            </div>
            <p
              className="text-base font-medium mb-1"
              style={{ color: 'var(--theme-on-surface)' }}
            >
              暂无 Beta 视频
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              还没有人分享这条线路的攻略视频
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {betaLinks.map((beta, index) => {
              const platform = BETA_PLATFORMS[beta.platform]
              const Icon = PLATFORM_ICONS[beta.platform]

              return (
                <button
                  key={beta.id}
                  onClick={() => handleLinkClick(beta.url)}
                  className="w-full flex items-center gap-3 p-3 transition-all active:scale-[0.98] animate-fade-in-up"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    borderRadius: 'var(--theme-radius-xl)',
                    boxShadow: 'var(--theme-shadow-sm)',
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  {/* 平台图标 */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: platform.color }}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* 链接信息 */}
                  <div className="flex-1 min-w-0 text-left">
                    <span
                      className="text-sm font-medium block truncate"
                      style={{ color: 'var(--theme-on-surface)' }}
                    >
                      {beta.title || `${platform.name}视频`}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: 'var(--theme-on-surface-variant)' }}
                    >
                      {beta.author ? `@${beta.author}` : platform.name}
                    </span>
                  </div>

                  {/* 外链图标 */}
                  <ExternalLink
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Drawer>
  )
}
