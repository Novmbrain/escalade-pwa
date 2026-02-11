'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CITIES,
  DEFAULT_CITY_ID,
  CITY_COOKIE_NAME,
  isValidCityId,
  type CityId,
  type CityConfig,
} from '@/lib/city-config'

// ==================== 常量 ====================

const STORAGE_KEY = 'selected-city'
const FIRST_VISIT_KEY = 'city-first-visit'
const SESSION_VISIT_KEY = 'session-visit-recorded' // sessionStorage: 单会话去重

/** 同步写入 cookie，供服务端 Server Component 读取 */
function setCityCookie(id: string) {
  document.cookie = `${CITY_COOKIE_NAME}=${id}; path=/; max-age=31536000; samesite=lax`
}

// ==================== 类型 ====================

interface UseCitySelectionReturn {
  /** 当前选中的城市 ID */
  cityId: CityId
  /** 当前选中的城市配置 */
  city: CityConfig
  /** 所有可用城市 */
  cities: CityConfig[]
  /** 切换城市 */
  setCity: (id: CityId) => void
  /** 是否正在加载（首次智能选择中） */
  isLoading: boolean
  /** 是否首次访问（用于显示切换提示） */
  isFirstVisit: boolean
  /** 标记首次访问提示已显示 */
  dismissFirstVisitHint: () => void
}

// ==================== Hook ====================

/**
 * 城市选择 Hook
 *
 * 功能：
 * 1. 首次访问时通过 IP 定位智能选择城市
 * 2. 用户选择后存入 localStorage 持久化
 * 3. 提供首次访问标记，用于显示切换提示
 *
 * @example
 * ```tsx
 * const { cityId, city, setCity, isFirstVisit } = useCitySelection()
 * ```
 */
export function useCitySelection(): UseCitySelectionReturn {
  const [cityId, setCityId] = useState<CityId>(DEFAULT_CITY_ID)
  const [isLoading, setIsLoading] = useState(true)
  const [isFirstVisit, setIsFirstVisit] = useState(false)

  // 初始化：读取 localStorage 或智能检测
  useEffect(() => {
    async function init() {
      const storedCity = localStorage.getItem(STORAGE_KEY)
      const visited = localStorage.getItem(FIRST_VISIT_KEY)
      const sessionVisited = sessionStorage.getItem(SESSION_VISIT_KEY)

      // 优化：老用户 + 本会话已记录 → 跳过 geo API 调用
      // geo API 返回 { cityId, province }:
      //   - cityId: 用于城市选择（有 localStorage 缓存时不需要）
      //   - province: 用于访问记录（有 sessionStorage 标记时不需要）
      const hasValidCachedCity = storedCity && isValidCityId(storedCity)
      const needGeoApi = !sessionVisited || !hasValidCachedCity

      let geoData: { cityId?: string; province?: string } | null = null

      if (needGeoApi) {
        // 调用 geo API（用于访问记录的省份信息 和/或 新用户的城市检测）
        try {
          const response = await fetch('/api/geo')
          if (response.ok) {
            geoData = await response.json()
          }
        } catch (error) {
          console.warn('[useCitySelection] IP detection failed:', error)
        }
      }

      // 记录访问（单会话只记录一次）
      // 使用 sessionStorage 去重：同一会话内多次进入首页不重复计数
      if (!sessionVisited) {
        recordVisit(geoData?.province)
        sessionStorage.setItem(SESSION_VISIT_KEY, 'true')
      }

      // 处理首次访问标记（用于显示切换提示）
      if (!visited) {
        setIsFirstVisit(true)
        localStorage.setItem(FIRST_VISIT_KEY, 'true')
      }

      // 处理城市选择
      if (hasValidCachedCity) {
        // 已有存储的城市，直接使用
        setCityId(storedCity)
        setCityCookie(storedCity)
      } else if (geoData?.cityId && isValidCityId(geoData.cityId)) {
        // 使用 geo API 检测到的城市
        setCityId(geoData.cityId)
        localStorage.setItem(STORAGE_KEY, geoData.cityId)
        setCityCookie(geoData.cityId)
      }

      setIsLoading(false)
    }

    init()
  }, [])

  // 切换城市
  const setCity = useCallback((id: CityId) => {
    setCityId(id)
    localStorage.setItem(STORAGE_KEY, id)
    setCityCookie(id)
    // 切换后清除首次访问提示
    setIsFirstVisit(false)
  }, [])

  // 关闭首次访问提示
  const dismissFirstVisitHint = useCallback(() => {
    setIsFirstVisit(false)
  }, [])

  // 获取当前城市配置
  const city = CITIES.find((c) => c.id === cityId) ?? CITIES[0]

  return {
    cityId,
    city,
    cities: CITIES,
    setCity,
    isLoading,
    isFirstVisit,
    dismissFirstVisitHint,
  }
}

// ==================== 辅助函数 ====================

/**
 * 记录用户访问（静默失败，不阻塞主流程）
 *
 * 去重策略：使用 sessionStorage，一次浏览器会话只记录一次
 * - 打开 App → 记录 +1
 * - 同会话内多次进入首页 → 不重复记录
 * - 关闭标签页/浏览器后重新打开 → 记录 +1
 *
 * @param province 省份名称，海外用户传 undefined（记录为「海外」）
 */
function recordVisit(province?: string): void {
  fetch('/api/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ province }),
  }).catch(() => {
    // 静默失败，不影响主流程
  })
}
