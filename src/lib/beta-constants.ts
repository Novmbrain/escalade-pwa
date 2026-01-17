import type { BetaPlatform } from '@/types'

/**
 * Beta 视频平台配置（目前仅支持小红书）
 */
export const BETA_PLATFORMS: Record<
  BetaPlatform,
  {
    name: string
    color: string
    iconName: string
  }
> = {
  xiaohongshu: {
    name: '小红书',
    color: '#FF2442',
    iconName: 'BookHeart',
  },
}

/**
 * 验证 URL 是否为小红书链接
 */
export function isXiaohongshuUrl(url: string): boolean {
  const urlLower = url.toLowerCase()
  return urlLower.includes('xiaohongshu.com') || urlLower.includes('xhslink.com')
}

/**
 * 根据 URL 检测平台（目前仅支持小红书）
 * @returns 如果是小红书链接返回 'xiaohongshu'，否则返回 null
 */
export function detectPlatformFromUrl(url: string): BetaPlatform | null {
  if (isXiaohongshuUrl(url)) {
    return 'xiaohongshu'
  }
  return null
}

/**
 * 从小红书 URL 中提取笔记 ID
 *
 * 支持的 URL 格式：
 * - https://www.xiaohongshu.com/explore/6789abcdef123456
 * - https://www.xiaohongshu.com/discovery/item/6789abcdef123456
 * - https://xiaohongshu.com/explore/6789abcdef123456?xsec_token=xxx
 *
 * @param url 小红书链接（完整链接，非短链接）
 * @returns 笔记 ID 或 null（如果无法提取）
 */
export function extractXiaohongshuNoteId(url: string): string | null {
  try {
    const urlObj = new URL(url)

    // 只处理 xiaohongshu.com 域名
    if (!urlObj.hostname.includes('xiaohongshu.com')) {
      return null
    }

    // 匹配路径中的笔记 ID
    // 格式: /explore/ID 或 /discovery/item/ID
    const patterns = [
      /\/explore\/([a-f0-9]{24})/i,
      /\/discovery\/item\/([a-f0-9]{24})/i,
    ]

    for (const pattern of patterns) {
      const match = urlObj.pathname.match(pattern)
      if (match && match[1]) {
        return match[1].toLowerCase()
      }
    }

    return null
  } catch {
    return null
  }
}
