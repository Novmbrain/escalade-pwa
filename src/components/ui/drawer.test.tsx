/**
 * Drawer 组件测试
 * 测试抽屉组件的基本功能：
 * - 打开/关闭状态
 * - ESC 键关闭
 * - 背景遮罩点击关闭
 * - 标题和关闭按钮
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/utils'
import { Drawer } from './drawer'

describe('Drawer', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  describe('渲染状态', () => {
    it('关闭时不应渲染任何内容', () => {
      const { container } = render(
        <Drawer isOpen={false} onClose={mockOnClose}>
          <div>抽屉内容</div>
        </Drawer>
      )

      expect(container.firstChild).toBeNull()
    })

    it('打开时应渲染内容', () => {
      render(
        <Drawer isOpen={true} onClose={mockOnClose}>
          <div>抽屉内容</div>
        </Drawer>
      )

      expect(screen.getByText('抽屉内容')).toBeInTheDocument()
    })
  })

  describe('标题和关闭按钮', () => {
    it('应显示标题', () => {
      render(
        <Drawer isOpen={true} onClose={mockOnClose} title="测试标题">
          <div>内容</div>
        </Drawer>
      )

      expect(screen.getByText('测试标题')).toBeInTheDocument()
    })

    it('showCloseButton 为 true 时应显示关闭按钮', () => {
      render(
        <Drawer isOpen={true} onClose={mockOnClose} showCloseButton={true}>
          <div>内容</div>
        </Drawer>
      )

      expect(screen.getByLabelText('关闭')).toBeInTheDocument()
    })

    it('默认不显示关闭按钮', () => {
      render(
        <Drawer isOpen={true} onClose={mockOnClose}>
          <div>内容</div>
        </Drawer>
      )

      expect(screen.queryByLabelText('关闭')).not.toBeInTheDocument()
    })

    it('点击关闭按钮应触发 onClose', () => {
      render(
        <Drawer isOpen={true} onClose={mockOnClose} showCloseButton={true}>
          <div>内容</div>
        </Drawer>
      )

      fireEvent.click(screen.getByLabelText('关闭'))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('拖拽手柄', () => {
    it('默认应显示拖拽手柄', () => {
      const { container } = render(
        <Drawer isOpen={true} onClose={mockOnClose}>
          <div>内容</div>
        </Drawer>
      )

      // 手柄是一个 w-10 h-1 的 div
      const handle = container.querySelector('.w-10.h-1')
      expect(handle).toBeInTheDocument()
    })

    it('showHandle 为 false 时不显示手柄', () => {
      const { container } = render(
        <Drawer isOpen={true} onClose={mockOnClose} showHandle={false}>
          <div>内容</div>
        </Drawer>
      )

      const handle = container.querySelector('.w-10.h-1')
      expect(handle).not.toBeInTheDocument()
    })
  })

  describe('背景遮罩', () => {
    it('点击遮罩应触发关闭', () => {
      const { container } = render(
        <Drawer isOpen={true} onClose={mockOnClose}>
          <div>内容</div>
        </Drawer>
      )

      // 遮罩是第一个带有 bg-black/40 类的元素
      const backdrop = container.querySelector('.bg-black\\/40')
      expect(backdrop).toBeInTheDocument()

      fireEvent.click(backdrop!)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('键盘交互', () => {
    it('按 ESC 键应触发关闭', () => {
      render(
        <Drawer isOpen={true} onClose={mockOnClose}>
          <div>内容</div>
        </Drawer>
      )

      fireEvent.keyDown(window, { key: 'Escape' })
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('关闭状态下按 ESC 不应触发 onClose', () => {
      render(
        <Drawer isOpen={false} onClose={mockOnClose}>
          <div>内容</div>
        </Drawer>
      )

      fireEvent.keyDown(window, { key: 'Escape' })
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('高度配置', () => {
    it('默认高度应为 half (50vh)', () => {
      const { container } = render(
        <Drawer isOpen={true} onClose={mockOnClose}>
          <div>内容</div>
        </Drawer>
      )

      const drawer = container.querySelector('.animate-drawer-in')
      expect(drawer).toHaveStyle({ height: '50vh' })
    })

    it('应支持 quarter 高度', () => {
      const { container } = render(
        <Drawer isOpen={true} onClose={mockOnClose} height="quarter">
          <div>内容</div>
        </Drawer>
      )

      const drawer = container.querySelector('.animate-drawer-in')
      expect(drawer).toHaveStyle({ height: '25vh' })
    })

    it('应支持 three-quarter 高度', () => {
      const { container } = render(
        <Drawer isOpen={true} onClose={mockOnClose} height="three-quarter">
          <div>内容</div>
        </Drawer>
      )

      const drawer = container.querySelector('.animate-drawer-in')
      expect(drawer).toHaveStyle({ height: '75vh' })
    })

    it('应支持 full 高度', () => {
      const { container } = render(
        <Drawer isOpen={true} onClose={mockOnClose} height="full">
          <div>内容</div>
        </Drawer>
      )

      const drawer = container.querySelector('.animate-drawer-in')
      expect(drawer).toHaveStyle({ height: '100vh' })
    })

    it('应支持 auto 高度', () => {
      const { container } = render(
        <Drawer isOpen={true} onClose={mockOnClose} height="auto">
          <div>内容</div>
        </Drawer>
      )

      const drawer = container.querySelector('.animate-drawer-in')
      expect(drawer).toHaveStyle({ height: 'auto' })
    })
  })
})
