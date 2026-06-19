/**
 * 镜头质量评估服务（V1 规则版）
 * —— 5 项加权检查：提示词完备/资产覆盖/关键帧执行/视频执行/连续性。
 */
import type { QualityCheck, ScriptData, Shot, ShotQualityAssessment } from '@/types'

export function assessShotQuality(
  shot: Shot,
  sd: ScriptData | null,
): ShotQualityAssessment {
  const checks: QualityCheck[] = []
  const start = shot.keyframes.find((k) => k.type === 'start')
  const hasVideo = shot.interval?.status === 'completed'

  // 1. 提示词完备 (30)
  const startLen = start?.visualPrompt?.length ?? 0
  const startScore = startLen >= 40 ? 45 : startLen >= 20 ? 30 : startLen > 0 ? 15 : 0
  const actionScore = shot.actionSummary.length >= 12 ? 10 : 5
  checks.push({
    key: 'prompt',
    label: '提示词完备',
    score: Math.round(((startScore + actionScore) / 55) * 100),
    weight: 30,
    passed: startScore >= 30,
    details: `首帧提示词 ${startLen} 字`,
  })

  // 2. 资产覆盖 (20)
  const sceneOk = Boolean(sd?.scenes.find((s) => s.id === shot.sceneId)?.referenceImage)
  const charAllOk =
    shot.characters.length === 0 ||
    shot.characters.every((id) => sd?.characters.find((c) => c.id === id)?.referenceImage)
  const assetScore = (sceneOk ? 50 : 0) + (charAllOk ? 50 : 0)
  checks.push({
    key: 'asset',
    label: '资产覆盖',
    score: assetScore,
    weight: 20,
    passed: assetScore >= 50,
    details: `${sceneOk ? '场景✓' : '场景✗'} ${charAllOk ? '角色✓' : '角色✗'}`,
  })

  // 3. 关键帧执行 (30)
  const kfScore = start?.imageUrl
    ? start.status === 'completed'
      ? 55
      : 25
    : start?.visualPrompt
      ? 15
      : 0
  checks.push({
    key: 'keyframe',
    label: '关键帧执行',
    score: Math.round((kfScore / 55) * 100),
    weight: 30,
    passed: Boolean(start?.imageUrl),
  })

  // 4. 视频执行 (20)
  const videoScore = hasVideo ? 100 : shot.interval?.status === 'generating' ? 55 : 35
  checks.push({
    key: 'video',
    label: '视频执行',
    score: videoScore,
    weight: 20,
    passed: hasVideo,
  })

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0)
  const score = Math.round(checks.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight)
  const grade: ShotQualityAssessment['grade'] =
    score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail'

  return {
    version: 1,
    score,
    grade,
    generatedAt: Date.now(),
    checks,
    summary: `综合评分 ${score} / 100`,
  }
}

/** 项目平均质量分 */
export function getProjectAverageQuality(
  shots: Shot[],
  sd: ScriptData | null,
): number {
  if (shots.length === 0) return 0
  const total = shots.reduce((s, shot) => s + assessShotQuality(shot, sd).score, 0)
  return Math.round(total / shots.length)
}