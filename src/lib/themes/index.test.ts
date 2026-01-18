/**
 * 主题系统工具函数测试
 */
import { describe, it, expect } from 'vitest'
import {
  themes,
  themeList,
  defaultTheme,
  getThemeConfig,
  minimalTheme,
  outdoorTheme,
} from './index'

describe('主题系统', () => {
  describe('themes 映射', () => {
    it('包含 minimal 和 outdoor 两个主题', () => {
      expect(Object.keys(themes)).toEqual(['minimal', 'outdoor'])
    })

    it('minimal 主题配置完整', () => {
      const theme = themes.minimal
      expect(theme.name).toBe('minimal')
      expect(theme.label).toBeDefined()
      expect(theme.colors.primary).toBeDefined()
      expect(theme.radius.md).toBeDefined()
      expect(theme.shadow.sm).toBeDefined()
    })

    it('outdoor 主题配置完整', () => {
      const theme = themes.outdoor
      expect(theme.name).toBe('outdoor')
      expect(theme.label).toBeDefined()
      expect(theme.colors.primary).toBeDefined()
    })
  })

  describe('themeList', () => {
    it('包含所有可用主题', () => {
      expect(themeList).toHaveLength(2)
      expect(themeList).toContain(minimalTheme)
      expect(themeList).toContain(outdoorTheme)
    })
  })

  describe('defaultTheme', () => {
    it('默认主题为 minimal', () => {
      expect(defaultTheme).toBe('minimal')
    })
  })

  describe('getThemeConfig', () => {
    it('返回请求的主题配置', () => {
      expect(getThemeConfig('minimal')).toBe(minimalTheme)
      expect(getThemeConfig('outdoor')).toBe(outdoorTheme)
    })

    it('未知主题名返回默认主题', () => {
      // @ts-expect-error 测试无效输入
      const result = getThemeConfig('invalid-theme')
      expect(result).toBe(minimalTheme)
    })
  })

  describe('主题颜色完整性', () => {
    it.each(['minimal', 'outdoor'] as const)('%s 主题包含所有必需颜色', (themeName) => {
      const theme = themes[themeName]
      const requiredColors = [
        'primary',
        'onPrimary',
        'surface',
        'surfaceVariant',
        'onSurface',
        'onSurfaceVariant',
        'outline',
        'outlineVariant',
        'warning',
        'error',
        'success',
      ]

      requiredColors.forEach((color) => {
        expect(theme.colors).toHaveProperty(color)
      })
    })
  })
})
