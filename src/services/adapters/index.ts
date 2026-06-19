/**
 * AI 适配器统一出口
 */
export type { AdapterContext, ResolvedProvider } from './http'
export { resolveProvider, buildUrl } from './http'

export { chat, chatJSON, type ChatMessage, type ChatOptions } from './chatAdapter'
export { generateImage, type ImageOptions } from './imageAdapter'
export { generateVideo, type VideoOptions } from './videoAdapter'
export { generateAudio, type AudioOptions } from './audioAdapter'
