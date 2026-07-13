import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { Button, IconButton, Input, Label } from '@/components/ui'

it('关联标签与输入框', () => {
  const html = renderToStaticMarkup(
    <>
      <Label htmlFor="title">标题</Label>
      <Input id="title" />
    </>,
  )

  expect(html).toContain('for="title"')
  expect(html).toContain('id="title"')
})

it('按钮加载时暴露忙碌状态', () => {
  const html = renderToStaticMarkup(<Button loading>保存</Button>)

  expect(html).toContain('aria-busy="true"')
})

it('按钮加载状态优先于冲突的忙碌属性', () => {
  const html = renderToStaticMarkup(
    <Button loading aria-busy={false}>
      保存
    </Button>,
  )

  expect(html).toContain('aria-busy="true"')
})

it('按钮默认使用 button 类型', () => {
  const html = renderToStaticMarkup(<Button>保存</Button>)

  expect(html).toContain('type="button"')
})

it('图标按钮默认使用 button 类型', () => {
  const html = renderToStaticMarkup(<IconButton icon={<span />} label="关闭" />)

  expect(html).toContain('type="button"')
})
