import { describe, it, expect } from 'vitest'
import { checkSync, syncAsset } from '../characterSyncService'
import type { Episode, ManjuProject } from '@/types'

const baseEpisode = {
  id: 'e1', projectId: 'p1', seasonId: 's1', episodeNumber: 1, title: '第 1 集',
  createdAt: 0, lastModified: 0, stage: 'script' as const, rawScript: '', targetDuration: '60s',
  language: 'zh', visualStyle: 'anime', scriptData: null, shots: [], isParsingScript: false,
  renderLogs: [], characterRefs: [], sceneRefs: [], propRefs: [],
}

describe('checkSync', () => {
  it('检测 outdated（库版本更高）', () => {
    const episode: Episode = {
      ...baseEpisode,
      scriptData: {
        title: '', genre: '', logline: '',
        characters: [{ id: 'c1', name: '林辰', variations: [], libraryId: 'lib1', libraryVersion: 1 }],
        scenes: [], props: [], storyBeats: [],
      },
    }
    const project = { characterLibrary: [{ id: 'lib1', name: '林辰', variations: [], version: 2 }] } as unknown as ManjuProject
    const issues = checkSync(episode, project, 'character')
    expect(issues).toHaveLength(1)
    expect(issues[0].status).toBe('outdated')
  })

  it('同步后无 outdated', () => {
    const episode: Episode = {
      ...baseEpisode,
      scriptData: {
        title: '', genre: '', logline: '',
        characters: [{ id: 'c1', name: '林辰', variations: [], libraryId: 'lib1', libraryVersion: 1, visualPrompt: 'old' }],
        scenes: [], props: [], storyBeats: [],
      },
    }
    const project = {
      characterLibrary: [{ id: 'lib1', name: '林辰', variations: [], version: 2, visualPrompt: 'new look' }],
    } as unknown as ManjuProject
    const synced = syncAsset(episode, project, 'character', 'c1')
    expect(synced.scriptData!.characters[0].libraryVersion).toBe(2)
    expect(synced.scriptData!.characters[0].visualPrompt).toBe('new look')
    expect(checkSync(synced, project, 'character')).toHaveLength(0)
  })
})
