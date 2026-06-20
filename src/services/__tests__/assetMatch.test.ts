import { describe, it, expect } from 'vitest'
import { nameSimilarity, pickBestByName, tokenize, jaccard } from '../assetMatchService'

describe('tokenize', () => {
  it('中文 2-gram', () => {
    const t = tokenize('林辰')
    expect(t).toContain('林辰')
  })
  it('英文分词', () => {
    expect(tokenize('hello world')).toEqual(['hello', 'world'])
  })
})

describe('jaccard', () => {
  it('空集为 0', () => {
    expect(jaccard([], [])).toBe(0)
  })
  it('完全相同为 1', () => {
    expect(jaccard(['a', 'b'], ['a', 'b'])).toBe(1)
  })
})

describe('nameSimilarity', () => {
  it('同名 = 1', () => {
    expect(nameSimilarity('林辰', '林辰')).toBe(1)
  })
  it('不同名 < 1', () => {
    expect(nameSimilarity('林辰', '王磊')).toBeLessThan(1)
  })
})

describe('pickBestByName', () => {
  it('匹配同名候选', () => {
    const r = pickBestByName('林辰', [
      { id: '1', name: '林辰', variations: [] },
      { id: '2', name: '王磊', variations: [] },
    ])
    expect(r?.id).toBe('1')
  })
  it('阈值不足返回 undefined', () => {
    expect(pickBestByName('林辰', [{ id: '1', name: '张三丰', variations: [] }])).toBeUndefined()
  })
})
