/**
 * 拼音搜索工具函数测试
 *
 * 测试覆盖:
 * - 中文检测
 * - 拼音检测
 * - 拼音匹配（全拼、首字母）
 * - 边界条件
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  containsChinese,
  isPinyin,
  matchPinyin,
  getPinyinMatchPosition,
} from './pinyin-utils'

// Mock pinyin-pro 的 match 函数
vi.mock('pinyin-pro', () => ({
  match: vi.fn((text: string, query: string) => {
    // 模拟 pinyin-pro 的匹配行为
    // 简化实现：检测首字母匹配
    const mockMatches: Record<string, Record<string, number[]>> = {
      '年年有鱼': {
        'nnyyú': [0, 1, 2, 3],
        'nnyy': [0, 1, 2, 3],
        'nn': [0, 1],
        'yu': [3],
      },
      '鱼尔': {
        'yu': [0],
        'ye': [0, 1],
        'yuer': [0, 1],
      },
      '虎纠鱼丸': {
        'hj': [0, 1],
        'hjyw': [0, 1, 2, 3],
        'yu': [2],
      },
      '蟹黄堡': {
        'xhb': [0, 1, 2],
        'xie': [0],
      },
    }
    return mockMatches[text]?.[query.toLowerCase()] ?? null
  }),
}))

describe('拼音搜索工具', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('containsChinese', () => {
    it('检测纯中文字符串', () => {
      expect(containsChinese('鱼尔')).toBe(true)
      expect(containsChinese('年年有鱼')).toBe(true)
      expect(containsChinese('蟹黄堡')).toBe(true)
    })

    it('检测中英混合字符串', () => {
      expect(containsChinese('V3线路')).toBe(true)
      expect(containsChinese('hello世界')).toBe(true)
    })

    it('检测纯英文字符串', () => {
      expect(containsChinese('hello')).toBe(false)
      expect(containsChinese('pinyin')).toBe(false)
      expect(containsChinese('V3')).toBe(false)
    })

    it('检测空字符串', () => {
      expect(containsChinese('')).toBe(false)
    })

    it('检测特殊字符', () => {
      expect(containsChinese('!@#$%')).toBe(false)
      expect(containsChinese('123')).toBe(false)
    })
  })

  describe('isPinyin', () => {
    it('检测纯字母字符串', () => {
      expect(isPinyin('pinyin')).toBe(true)
      expect(isPinyin('yu')).toBe(true)
      expect(isPinyin('NNYY')).toBe(true)
      expect(isPinyin('xhb')).toBe(true)
    })

    it('检测包含数字的字符串', () => {
      expect(isPinyin('v3')).toBe(false)
      expect(isPinyin('123')).toBe(false)
    })

    it('检测包含中文的字符串', () => {
      expect(isPinyin('鱼')).toBe(false)
      expect(isPinyin('yu鱼')).toBe(false)
    })

    it('检测包含特殊字符的字符串', () => {
      expect(isPinyin('pin-yin')).toBe(false)
      expect(isPinyin('pin yin')).toBe(false)
      expect(isPinyin("pin'yin")).toBe(false)
    })

    it('检测空字符串', () => {
      expect(isPinyin('')).toBe(false)
    })
  })

  describe('matchPinyin', () => {
    it('匹配全拼', () => {
      const result = matchPinyin('鱼尔', 'yuer')
      expect(result).toEqual([0, 1])
    })

    it('匹配首字母', () => {
      const result = matchPinyin('蟹黄堡', 'xhb')
      expect(result).toEqual([0, 1, 2])
    })

    it('匹配部分拼音', () => {
      const result = matchPinyin('年年有鱼', 'nn')
      expect(result).toEqual([0, 1])
    })

    it('查询包含中文时返回 null（使用原生匹配）', () => {
      const result = matchPinyin('鱼尔', '鱼')
      expect(result).toBeNull()
    })

    it('空文本返回 null', () => {
      expect(matchPinyin('', 'yu')).toBeNull()
    })

    it('空查询返回 null', () => {
      expect(matchPinyin('鱼尔', '')).toBeNull()
    })

    it('无匹配结果返回 null', () => {
      const result = matchPinyin('鱼尔', 'abc')
      expect(result).toBeNull()
    })
  })

  describe('getPinyinMatchPosition', () => {
    it('返回首个匹配位置', () => {
      expect(getPinyinMatchPosition('鱼尔', 'yu')).toBe(0)
      expect(getPinyinMatchPosition('虎纠鱼丸', 'yu')).toBe(2)
    })

    it('无匹配时返回 -1', () => {
      expect(getPinyinMatchPosition('鱼尔', 'abc')).toBe(-1)
    })

    it('空输入返回 -1', () => {
      expect(getPinyinMatchPosition('', 'yu')).toBe(-1)
      expect(getPinyinMatchPosition('鱼尔', '')).toBe(-1)
    })

    it('中文查询返回 -1（不使用拼音匹配）', () => {
      expect(getPinyinMatchPosition('鱼尔', '鱼')).toBe(-1)
    })
  })

  describe('搜索场景模拟', () => {
    const routes = ['年年有鱼', '鱼尔', '虎纠鱼丸', '蟹黄堡']

    it('拼音搜索 "yu" 能匹配多个线路', () => {
      const matches = routes.filter((route) => matchPinyin(route, 'yu') !== null)
      expect(matches).toContain('年年有鱼')
      expect(matches).toContain('鱼尔')
      expect(matches).toContain('虎纠鱼丸')
      expect(matches).not.toContain('蟹黄堡')
    })

    it('首字母搜索 "xhb" 能精确匹配', () => {
      const matches = routes.filter((route) => matchPinyin(route, 'xhb') !== null)
      expect(matches).toEqual(['蟹黄堡'])
    })

    it('搜索结果按匹配位置排序', () => {
      const results = routes
        .map((route) => ({
          name: route,
          position: getPinyinMatchPosition(route, 'yu'),
        }))
        .filter((r) => r.position >= 0)
        .sort((a, b) => a.position - b.position)

      // 鱼尔 position=0 应该排第一
      expect(results[0].name).toBe('鱼尔')
    })
  })
})
