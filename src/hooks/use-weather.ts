'use client'

import { useEffect, useState } from 'react'
import type { WeatherData, Coordinates } from '@/types'

interface UseWeatherOptions {
  /** 城市 adcode（优先于 coordinates，跳过逆地理编码） */
  adcode?: string
  /** 坐标（仅在 adcode 未提供时使用） */
  coordinates?: Coordinates | null
  /** 是否获取预报数据（默认 true） */
  forecast?: boolean
}

/**
 * 天气数据获取 Hook
 * 统一封装天气 API 调用，避免在多个组件中重复获取逻辑
 */
export function useWeather({ adcode, coordinates, forecast = true }: UseWeatherOptions = {}) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchWeather() {
      try {
        setLoading(true)
        setError(false)

        const params = new URLSearchParams()
        if (adcode) {
          params.set('adcode', adcode)
        } else if (coordinates) {
          params.set('lng', String(coordinates.lng))
          params.set('lat', String(coordinates.lat))
        }
        if (!forecast) {
          params.set('forecast', 'false')
        }

        const response = await fetch(`/api/weather?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Weather API failed')
        }

        const data: WeatherData = await response.json()
        setWeather(data)
      } catch (err) {
        console.error('[useWeather] Failed to fetch weather:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()
  }, [adcode, coordinates?.lng, coordinates?.lat, forecast])

  return { weather, loading, error }
}
