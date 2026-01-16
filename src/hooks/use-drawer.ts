'use client'

import { useState, useCallback } from 'react'

/**
 * 抽屉状态管理 Hook
 * 支持多层抽屉嵌套管理
 */
export function useDrawer<T = unknown>(initialData?: T) {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<T | undefined>(initialData)

  const open = useCallback((newData?: T) => {
    if (newData !== undefined) {
      setData(newData)
    }
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
    setData,
  }
}

/**
 * 多抽屉管理 Hook
 * 适用于需要管理多个抽屉状态的场景
 */
export function useDrawers<K extends string>() {
  const [openDrawers, setOpenDrawers] = useState<Set<K>>(new Set())

  const isOpen = useCallback((key: K) => openDrawers.has(key), [openDrawers])

  const open = useCallback((key: K) => {
    setOpenDrawers((prev) => new Set(prev).add(key))
  }, [])

  const close = useCallback((key: K) => {
    setOpenDrawers((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }, [])

  const closeAll = useCallback(() => {
    setOpenDrawers(new Set())
  }, [])

  const toggle = useCallback((key: K) => {
    setOpenDrawers((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  return {
    isOpen,
    open,
    close,
    closeAll,
    toggle,
  }
}
