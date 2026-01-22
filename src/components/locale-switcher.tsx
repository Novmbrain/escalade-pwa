'use client'

import { useTranslations } from 'next-intl'
import { Globe } from 'lucide-react'
import { routing, type Locale } from '@/i18n/routing'
import { useMemo } from 'react'
import { SegmentedControl, type SegmentOption } from '@/components/ui/segmented-control'
import { useLocalePreference } from '@/hooks/use-locale-preference'

/**
 * 语言切换器组件 - 简单按钮版本
 *
 * 显示当前语言，点击切换到另一种语言
 * 切换时保持当前页面路径不变，并更新 localStorage 缓存
 */
export function LocaleSwitcher() {
  const t = useTranslations('LocaleSwitcher')
  const { locale, switchLocale } = useLocalePreference()

  const handleSwitch = () => {
    // 切换到另一种语言
    const nextLocale = locale === 'zh' ? 'en' : 'zh'
    switchLocale(nextLocale)
  }

  return (
    <button
      onClick={handleSwitch}
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors active:scale-95"
      style={{
        backgroundColor: 'var(--theme-surface-variant)',
        color: 'var(--theme-on-surface)',
      }}
      aria-label={t('switchLanguage')}
    >
      <Globe className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
      <span className="text-sm font-medium">
        {locale === 'zh' ? t('en') : t('zh')}
      </span>
    </button>
  )
}

/**
 * 语言切换器 - 分段控制器版本
 *
 * 使用 SegmentedControl 实现语言切换，
 * 与主题切换器保持一致的视觉风格和交互体验。
 * 切换时自动更新 localStorage 缓存。
 */
interface LocaleSegmentedProps {
  className?: string
}

export function LocaleSegmented({ className }: LocaleSegmentedProps) {
  const t = useTranslations('LocaleSwitcher')
  const { locale, switchLocale } = useLocalePreference()

  // 语言选项配置 - 使用国旗 emoji 作为图标
  const localeOptions: SegmentOption<Locale>[] = useMemo(() =>
    routing.locales.map((loc) => ({
      value: loc,
      label: t(loc),
      icon: loc === 'zh' ? (
        <span className="text-base" role="img" aria-label="中文">🇨🇳</span>
      ) : (
        <span className="text-base" role="img" aria-label="English">🇬🇧</span>
      ),
    })),
    [t]
  )

  return (
    <SegmentedControl
      options={localeOptions}
      value={locale}
      onChange={switchLocale}
      ariaLabel={t('languageSelector')}
      className={className}
    />
  )
}

/**
 * 语言选择器 - 下拉菜单版本
 *
 * 适用于需要紧凑布局的场景
 * 切换时自动更新 localStorage 缓存。
 */
interface LocaleSelectProps {
  className?: string
}

export function LocaleSelect({ className }: LocaleSelectProps) {
  const t = useTranslations('LocaleSwitcher')
  const { locale, switchLocale } = useLocalePreference()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value as Locale
    switchLocale(newLocale)
  }

  return (
    <div className={`flex items-center gap-3 ${className || ''}`}>
      <Globe className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
      <select
        value={locale}
        onChange={handleChange}
        className="flex-1 px-3 py-2 rounded-lg text-sm font-medium appearance-none cursor-pointer"
        style={{
          backgroundColor: 'var(--theme-surface-variant)',
          color: 'var(--theme-on-surface)',
          border: '1px solid var(--theme-outline-variant)',
        }}
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {t(loc)}
          </option>
        ))}
      </select>
    </div>
  )
}
