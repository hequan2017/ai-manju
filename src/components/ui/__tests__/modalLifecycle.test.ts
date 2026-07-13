import { expect, it } from 'vitest'
import { acquireBodyScrollLock } from '../modalLifecycle'

it('乱序释放两把滚动锁时仅最后一次释放恢复首次原值', () => {
  const body = { style: { overflow: 'scroll' } }
  const releaseFirst = acquireBodyScrollLock(body)
  const releaseSecond = acquireBodyScrollLock(body)

  expect(body.style.overflow).toBe('hidden')

  releaseFirst()
  releaseFirst()
  expect(body.style.overflow).toBe('hidden')

  releaseSecond()
  expect(body.style.overflow).toBe('scroll')
})
