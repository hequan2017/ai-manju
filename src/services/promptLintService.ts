/**
 * 提示词预检服务
 * —— 在调用生图/视频 API 前校验提示词质量与必要条件，避免无效请求。
 */
import type { Shot } from '@/types'

export type LintLevel = 'error' | 'warning' | 'info'

export interface LintIssue {
  level: LintLevel
  message: string
}

export interface LintResult {
  issues: LintIssue[]
  canProceed: boolean
}

/** 通用提示词文本检查 */
export function lintPromptText(
  prompt: string,
  opts: { minLength?: number; maxLength?: number; allowEmpty?: boolean } = {},
): LintIssue[] {
  const { minLength = 16, maxLength = 2200, allowEmpty = false } = opts
  const p = (prompt ?? '').trim()
  const issues: LintIssue[] = []
  if (!p) {
    if (!allowEmpty) issues.push({ level: 'error', message: '提示词为空' })
    return issues
  }
  if (p.length < minLength) {
    issues.push({ level: 'warning', message: `提示词偏短（${p.length} 字），细节可能不足` })
  }
  if (p.length > maxLength) {
    issues.push({ level: 'warning', message: `提示词过长（${p.length} 字），可能被截断` })
  }
  if (/(todo|tbd|待补充|xxx|placeholder)/i.test(p)) {
    issues.push({ level: 'warning', message: '提示词疑似含占位符' })
  }
  if (/(.)\1{5,}/.test(p)) {
    issues.push({ level: 'info', message: '提示词含大量重复字符' })
  }
  return issues
}

/** 关键帧生成前置检查 */
export function runKeyframePreflight(shot: Shot): LintResult {
  const issues: LintIssue[] = []
  const start = shot.keyframes.find((k) => k.type === 'start')
  if (!start?.visualPrompt?.trim()) {
    issues.push({ level: 'error', message: '缺少首帧提示词' })
  } else {
    issues.push(...lintPromptText(start.visualPrompt))
  }
  return { issues, canProceed: issues.filter((i) => i.level === 'error').length === 0 }
}

/** 视频生成前置检查 */
export function runVideoPreflight(shot: Shot): LintResult {
  const issues: LintIssue[] = []
  const start = shot.keyframes.find((k) => k.type === 'start')
  if (!start?.imageUrl) {
    issues.push({ level: 'error', message: '缺少首帧图，无法生成视频' })
  }
  return { issues, canProceed: issues.filter((i) => i.level === 'error').length === 0 }
}