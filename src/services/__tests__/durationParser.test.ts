import { describe, it, expect } from 'vitest'
import { parseDurationToSeconds } from '../utils'

describe('parseDurationToSeconds', () => {
  it('纯数字（秒）', () => {
    expect(parseDurationToSeconds('90')).toBe(90)
  })
  it('mm:ss', () => {
    expect(parseDurationToSeconds('1:30')).toBe(90)
  })
  it('hh:mm:ss', () => {
    expect(parseDurationToSeconds('1:02:03')).toBe(3723)
  })
  it('1m30s', () => {
    expect(parseDurationToSeconds('1m30s')).toBe(90)
  })
  it('3min', () => {
    expect(parseDurationToSeconds('3min')).toBe(180)
  })
  it('2小时', () => {
    expect(parseDurationToSeconds('2小时')).toBe(7200)
  })
  it('非法返回 null', () => {
    expect(parseDurationToSeconds('abc')).toBeNull()
  })
  it('空返回 null', () => {
    expect(parseDurationToSeconds('')).toBeNull()
  })
})
