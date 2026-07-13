import { expect, it } from 'vitest'
import { shouldSubmitPrompt } from '../DialogContext'

it('仅在非输入法组合态按 Enter 时提交文本对话框', () => {
  expect(shouldSubmitPrompt('Enter', false)).toBe(true)
  expect(shouldSubmitPrompt('Enter', true)).toBe(false)
  expect(shouldSubmitPrompt('Escape', false)).toBe(false)
})
