/**
 * 主题切换器组件测试
 *
 * 测试覆盖:
 * - 渲染三个主题选项
 * - 选中态显示
 * - 点击切换主题
 * - 自动模式提示
 * - 无障碍属性
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeSwitcher } from './theme-switcher'

// Mock next-themes
const mockSetTheme = vi.fn()
let mockTheme = 'light'
let mockResolvedTheme = 'light'

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
    resolvedTheme: mockResolvedTheme,
  }),
}))

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTheme = 'light'
    mockResolvedTheme = 'light'
  })

  describe('渲染', () => {
    it('渲染三个主题选项', () => {
      render(<ThemeSwitcher />)

      expect(screen.getByRole('tab', { name: /日间/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /暗夜/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /自动/i })).toBeInTheDocument()
    })

    it('渲染 tablist 容器', () => {
      render(<ThemeSwitcher />)

      const tablist = screen.getByRole('tablist')
      expect(tablist).toBeInTheDocument()
      expect(tablist).toHaveAttribute('aria-label', '主题模式选择')
    })

    it('每个选项都有正确的 ARIA 属性', () => {
      render(<ThemeSwitcher />)

      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(3)

      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute('aria-selected')
        expect(tab).toHaveAttribute('aria-controls')
      })
    })
  })

  describe('选中态', () => {
    it('light 模式下日间按钮选中', () => {
      mockTheme = 'light'
      render(<ThemeSwitcher />)

      const lightTab = screen.getByRole('tab', { name: /日间/i })
      expect(lightTab).toHaveAttribute('aria-selected', 'true')

      const darkTab = screen.getByRole('tab', { name: /暗夜/i })
      expect(darkTab).toHaveAttribute('aria-selected', 'false')
    })

    it('dark 模式下暗夜按钮选中', () => {
      mockTheme = 'dark'
      render(<ThemeSwitcher />)

      const darkTab = screen.getByRole('tab', { name: /暗夜/i })
      expect(darkTab).toHaveAttribute('aria-selected', 'true')

      const lightTab = screen.getByRole('tab', { name: /日间/i })
      expect(lightTab).toHaveAttribute('aria-selected', 'false')
    })

    it('system 模式下自动按钮选中', () => {
      mockTheme = 'system'
      render(<ThemeSwitcher />)

      const systemTab = screen.getByRole('tab', { name: /自动/i })
      expect(systemTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('点击交互', () => {
    it('点击暗夜按钮调用 setTheme("dark")', () => {
      render(<ThemeSwitcher />)

      const darkTab = screen.getByRole('tab', { name: /暗夜/i })
      fireEvent.click(darkTab)

      expect(mockSetTheme).toHaveBeenCalledWith('dark')
    })

    it('点击日间按钮调用 setTheme("light")', () => {
      mockTheme = 'dark'
      render(<ThemeSwitcher />)

      const lightTab = screen.getByRole('tab', { name: /日间/i })
      fireEvent.click(lightTab)

      expect(mockSetTheme).toHaveBeenCalledWith('light')
    })

    it('点击自动按钮调用 setTheme("system")', () => {
      render(<ThemeSwitcher />)

      const systemTab = screen.getByRole('tab', { name: /自动/i })
      fireEvent.click(systemTab)

      expect(mockSetTheme).toHaveBeenCalledWith('system')
    })
  })

  describe('自动模式提示', () => {
    it('system 模式显示当前跟随的主题（暗夜）', () => {
      mockTheme = 'system'
      mockResolvedTheme = 'dark'
      render(<ThemeSwitcher />)

      expect(screen.getByText(/当前跟随系统：暗夜/i)).toBeInTheDocument()
    })

    it('system 模式显示当前跟随的主题（日间）', () => {
      mockTheme = 'system'
      mockResolvedTheme = 'light'
      render(<ThemeSwitcher />)

      expect(screen.getByText(/当前跟随系统：日间/i)).toBeInTheDocument()
    })

    it('非 system 模式不显示跟随提示', () => {
      mockTheme = 'light'
      render(<ThemeSwitcher />)

      expect(screen.queryByText(/当前跟随系统/i)).not.toBeInTheDocument()
    })

    it('dark 模式不显示跟随提示', () => {
      mockTheme = 'dark'
      render(<ThemeSwitcher />)

      expect(screen.queryByText(/当前跟随系统/i)).not.toBeInTheDocument()
    })
  })

  describe('样式一致性', () => {
    it('所有按钮都有相同的基础类名', () => {
      render(<ThemeSwitcher />)

      const tabs = screen.getAllByRole('tab')
      tabs.forEach((tab) => {
        expect(tab.className).toContain('flex-1')
        expect(tab.className).toContain('flex')
        expect(tab.className).toContain('items-center')
      })
    })
  })

  describe('用户场景', () => {
    it('用户从日间切换到暗夜', () => {
      mockTheme = 'light'
      render(<ThemeSwitcher />)

      // 初始状态：日间选中
      expect(screen.getByRole('tab', { name: /日间/i })).toHaveAttribute(
        'aria-selected',
        'true'
      )

      // 点击暗夜
      fireEvent.click(screen.getByRole('tab', { name: /暗夜/i }))
      expect(mockSetTheme).toHaveBeenCalledWith('dark')
    })

    it('用户切换到自动模式后看到系统当前主题', () => {
      mockTheme = 'system'
      mockResolvedTheme = 'dark'
      render(<ThemeSwitcher />)

      // 自动模式选中
      expect(screen.getByRole('tab', { name: /自动/i })).toHaveAttribute(
        'aria-selected',
        'true'
      )

      // 显示当前跟随的主题
      expect(screen.getByText(/当前跟随系统：暗夜/i)).toBeInTheDocument()
    })
  })
})
