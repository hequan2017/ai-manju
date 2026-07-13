import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MobileUnsupported } from '../ViewportGate'

describe('MobileUnsupported', () => {
  it('说明最低视口宽度', () => {
    const html = renderToStaticMarkup(<MobileUnsupported />)

    expect(html).toContain('768px')
    expect(html).toContain('桌面或平板')
  })
})
