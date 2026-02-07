import { NextRequest, NextResponse } from 'next/server'
import { getAllCrags, getCragsByCityId } from '@/lib/db'
import { isValidCityId } from '@/lib/city-config'
import { createModuleLogger } from '@/lib/logger'

const log = createModuleLogger('API:Crags')

/**
 * GET /api/crags
 * GET /api/crags?cityId=luoyuan
 * 获取岩场列表（可选按城市过滤）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cityId = searchParams.get('cityId')

    const crags = cityId && isValidCityId(cityId)
      ? await getCragsByCityId(cityId)
      : await getAllCrags()

    return NextResponse.json({
      success: true,
      crags,
    })
  } catch (error) {
    log.error('Failed to get crags', error, {
      action: 'GET /api/crags',
    })
    return NextResponse.json(
      { success: false, error: '获取岩场列表失败' },
      { status: 500 }
    )
  }
}
