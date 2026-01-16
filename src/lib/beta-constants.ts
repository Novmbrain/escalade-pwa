import type { BetaPlatform } from '@/types'

/**
 * Beta 视频平台配置
 * 包含平台名称、品牌色和对应的 Lucide 图标名
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
  douyin: {
    name: '抖音',
    color: '#000000',
    iconName: 'Music2',
  },
  bilibili: {
    name: 'B站',
    color: '#FB7299',
    iconName: 'Play',
  },
  youtube: {
    name: 'YouTube',
    color: '#FF0000',
    iconName: 'Youtube',
  },
  other: {
    name: '其他',
    color: '#6B7280',
    iconName: 'ExternalLink',
  },
}

/**
 * 根据 URL 自动检测平台
 */
export function detectPlatformFromUrl(url: string): BetaPlatform {
  const urlLower = url.toLowerCase()

  if (urlLower.includes('xiaohongshu.com') || urlLower.includes('xhslink.com')) {
    return 'xiaohongshu'
  }
  if (urlLower.includes('douyin.com') || urlLower.includes('iesdouyin.com')) {
    return 'douyin'
  }
  if (urlLower.includes('bilibili.com') || urlLower.includes('b23.tv')) {
    return 'bilibili'
  }
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return 'youtube'
  }

  return 'other'
}
