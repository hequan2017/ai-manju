/**
 * 国际化 Context
 * —— 中英双语全量字典 + useT。按「组件.字段」命名 key，缺失 key 原样返回。
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { kvGet, kvSet } from '@/services/db'

export type Locale = 'zh' | 'en'

const ZH: Record<string, string> = {
  // 阶段
  'stage.script': '剧本', 'stage.assets': '资产', 'stage.director': '导演台', 'stage.export': '导出', 'stage.prompts': '提示词',
  // 顶部 / 导航
  'nav.projects': '我的漫剧项目', 'nav.subtitle': '从灵感到成片 —— 剧本 · 资产 · 导演台 · 导出的工业化工作流',
  'nav.new': '新建漫剧', 'nav.demo': '加载示例', 'nav.import': '导入',
  'top.settings': '模型配置', 'top.login': '登录', 'top.logout': '退出登录', 'top.theme': '切换主题', 'top.language': '语言',
  // 通用
  'common.save': '保存', 'common.cancel': '取消', 'common.delete': '删除', 'common.edit': '编辑',
  'common.generate': '生成', 'common.confirm': '确认', 'common.close': '关闭', 'common.copy': '复制', 'common.rename': '重命名',
  // Dashboard
  'dashboard.empty.title': '还没有漫剧项目', 'dashboard.empty.desc': '创建你的第一部 AI 漫剧，开启工业化创作流程。',
  'dashboard.empty.action': '创建第一个项目', 'dashboard.create.title': '新建漫剧项目',
  'dashboard.create.titleLabel': '标题', 'dashboard.create.intro': '简介', 'dashboard.create.style': '视觉风格', 'dashboard.create.lang': '语言',
  'dashboard.create.submit': '创建并进入', 'dashboard.onboarding.title': '欢迎使用 AI 漫剧平台',
  'dashboard.onboarding.desc': '开始创作前，请先配置 AI 供应商与 API Key（对话 / 图像 / 视频 / 语音四类模型）。',
  'dashboard.onboarding.action': '前往配置', 'dashboard.deleteConfirm': '确定删除项目及其所有季与集？此操作不可撤销。',
  // 工作台
  'ws.back': '项目列表', 'ws.season': '季', 'ws.newSeason': '新建季', 'ws.renameSeason': '重命名当前季', 'ws.deleteSeason': '删除当前季',
  'ws.episodes': '集', 'ws.newEpisode': '新建', 'ws.library': '项目资产库', 'ws.selectEpisode': '选择一集开始创作',
  'ws.selectEpisode.desc': '在左侧选择已有集，或点击「新建」创建一集，进入剧本创作阶段。',
  'ws.renameSeasonPrompt': '季名称', 'ws.deleteSeasonConfirm': '确定删除本季及其所有集？',
  'ws.deleteEpisodeConfirm': '确定删除此集？此操作不可撤销。', 'ws.duplicateEpisode': '复制集', 'ws.deleteEpisode': '删除集',
  'ws.episodeNamePrompt': '集名称', 'ws.notExist': '项目不存在', 'ws.deletedDesc': '该项目可能已被删除。',
  // 镜头卡
  'shot.genStart': '生成首帧', 'shot.regenerate': '重生首帧', 'shot.genEnd': '生成尾帧', 'shot.regenEnd': '重生尾帧',
  'shot.genVideo': '生成视频', 'shot.genDubbing': '生成配音', 'shot.redub': '重新配音',
  'shot.ninegrid': '九宫格构图', 'shot.genNinegrid': '生成九宫格', 'shot.regenNinegrid': '重生九宫格',
  'shot.dubbing': '配音', 'shot.narration': '旁白', 'shot.dialogueOpt': '对白', 'shot.dubPlaceholder': '旁白或对白文本',
  'shot.editShot': '编辑镜头', 'shot.action': '动作描述', 'shot.dialogue': '台词', 'shot.shotSizePh': '景别（特写/近景/中景/全景）',
  'shot.cameraPh': '运镜（推/拉/摇/移）', 'shot.cast': '出场角色', 'shot.duplicate': '复制镜头', 'shot.remove': '删除镜头',
  'shot.firstFrameOnly': '当前视频模型仅支持首帧驱动', 'shot.videoStatus': '状态', 'shot.submitTask': '提交任务…',
  // 资产阶段
  'assets.charTitle': '角色定妆', 'assets.sceneTitle': '场景概念', 'assets.propTitle': '道具参考',
  'assets.batch': '批量生成', 'assets.genRef': '生成参考图', 'assets.regenRef': '重新生成', 'assets.upload': '上传图片',
  'assets.wardrobe': '造型', 'assets.editPrompt': '编辑提示词', 'assets.history': '历史',
  'assets.noProp': '本集无需特殊道具', 'assets.noScript': '还没有剧本结构', 'assets.noScriptDesc': '请先在「剧本」阶段完成 AI 拆解，再生成资产定妆图。',
  'assets.enrich': 'AI 补全角色提示词', 'assets.enrichDone': '角色提示词已补全', 'assets.noImageModel': '尚未配置图像模型，请前往「模型配置」。',
  'assets.failed': '失败',
  // 剧本阶段
  'script.input': '故事 / 剧本输入', 'script.duration': '目标时长', 'script.parse': 'AI 拆解剧本', 'script.reparse': '重新拆解',
  'script.continue': '续写', 'script.rewrite': '改写', 'script.placeholder': '粘贴你的小说、故事大纲或剧本。AI 会自动拆解为角色、场景、道具，并规划分镜……',
  'script.chars': '角色', 'script.scenes': '场景', 'script.props': '道具', 'script.shots': '分镜',
  'script.artDirection': '美术指导（统一视觉风格）', 'script.enterAssets': '进入「资产」阶段生成定妆图与场景图，再至「导演台」制作关键帧与视频。',
  'script.rewritePrompt': '请输入改写指令（如：增加悬念、改为喜剧风格、加快节奏）',
  // 导出阶段
  'export.editTitle': '剪辑（镜头排序）', 'export.timeline': '时间轴预览', 'export.stitch': '合成成片', 'export.zip': '打包导出 ZIP',
  'export.reverse': '反转', 'export.groupByScene': '按场景', 'export.moveUp': '上移', 'export.moveDown': '下移',
  'export.noContent': '还没有可导出的内容', 'export.noContentDesc': '完成剧本、资产与导演台阶段后，可在此预览时间轴并导出。',
  'export.stitchFallback': '当前浏览器不支持成片合成（需 MediaRecorder），请使用 ZIP 导出后在剪辑软件合成。',
  // 提示词阶段
  'prompts.cameraLib': '运镜参考库（点击复制）', 'prompts.template': '可编辑提示词模板', 'prompts.copied': '已复制',
  'prompts.tpl.storyboard': '分镜规划系统提示词', 'prompts.tpl.keyframe': '关键帧一致性引导词（注入每张关键帧）',
  'prompts.tpl.videoPrefix': '视频提示词前缀', 'prompts.tpl.negative': '默认负面提示词', 'prompts.saved': '模板自动保存于本地，将在后续生成流程中注入。',
  // 模型配置
  'settings.title': '模型配置', 'settings.desc': '配置 OpenAI 兼容协议的 AI 供应商与模型。漫剧工作流会调用对话、图像、视频、语音四类模型。',
  'settings.globalKey': '全局 API Key', 'settings.globalKeyDesc': '当供应商未单独配置 Key 时，回退使用此全局 Key。',
  'settings.provider': '供应商', 'settings.providerPreset': '主流供应商预设（一键添加）', 'settings.addProvider': '新增', 'settings.addProviderTitle': '新增供应商',
  'settings.providerName': '名称', 'settings.baseUrl': 'Base URL', 'settings.providerKey': 'API Key（可选，留空使用全局）',
  'settings.create': '创建', 'settings.currentModel': '当前生效模型', 'settings.modelName': '模型名',
  'settings.chat': '对话模型（剧本分析 / 提示词）', 'settings.image': '图像模型（关键帧 / 定妆图）', 'settings.imageType': 'API 形态',
  'settings.video': '视频模型（帧间插值）', 'settings.videoType': '调度类型', 'settings.audio': '语音模型（配音）',
  'settings.aspect': '默认画面比例', 'settings.masked': '未配置 Key', 'settings.show': '显示', 'settings.hide': '隐藏',
  'settings.setDefault': '设为默认', 'settings.builtin': '内置', 'settings.default': '默认',
  // 登录
  'login.title': 'AI 漫剧平台', 'login.desc': '登录 new-api 以调用模型', 'login.url': 'new-api 服务地址',
  'login.username': '用户名', 'login.password': '密码', 'login.submit': '登录', 'login.register': '注册并登录',
  'login.toRegister': '没有账号？去注册', 'login.toLogin': '已有账号？去登录', 'login.hint': '登录后将自动获取你的 API Key 并用于模型调用',
  'login.fillAll': '请填写完整信息',
  // 资产库面板
  'library.title': '资产库', 'library.noProject': '请先选择项目', 'library.desc': '资产库为项目级共享，所有集复用以保证跨集一致性。集内更新资产后，其他集可通过「同步横幅」拉取最新版本。',
  'library.empty': '暂无', 'library.noImage': '无图',
  // 同步横幅
  'sync.banner': '检测到 {n} 项资产在其他集已更新，点击同步以拉取最新（保证多集一致）。', 'sync.all': '同步全部',
  // 渲染日志
  'logs.title': '渲染日志', 'logs.empty': '暂无调用记录',
  // 通用补充
  'common.emptyEpisode': '请先选择一集', 'common.parsed': '已拆解', 'common.logs': '日志',
  // Dashboard 补充
  'dashboard.importFail': '导入失败：{msg}', 'dashboard.untitled': '未命名漫剧', 'dashboard.noDesc': '暂无描述',
  'dashboard.deleteConfirmTitle': '确定删除项目「{title}」及其所有季与集？此操作不可撤销。',
  'dashboard.titlePrompt': '项目名称', 'dashboard.copyProject': '复制项目', 'dashboard.renameProject': '重命名',
  'dashboard.exportProject': '导出项目', 'dashboard.demoNoDelete': '示例项目不可删除', 'dashboard.deleteProject': '删除项目',
  'dashboard.titlePh': '给你的漫剧起个名字', 'dashboard.introPh': '一句话描述这个故事（可选）',
  // 视觉风格
  'style.anime': '动漫', 'style.2d': '2D 动画', 'style.3d': '3D 动画', 'style.live': '真人实拍',
  'style.oil': '油画风', 'style.cyber': '赛博朋克',
  // 语言名
  'lang.zh': '中文', 'lang.en': 'English', 'lang.ja': '日本語',
  // 相对时间
  'time.justNow': '刚刚', 'time.minAgo': '{n} 分钟前', 'time.hourAgo': '{n} 小时前', 'time.dayAgo': '{n} 天前',
  // 设置补充
  'settings.deleteProviderConfirm': '确定删除供应商「{name}」？', 'settings.modelNamePh': 'model name',
  'settings.providerNamePh': '如：OpenAI / AntSK', 'settings.baseUrlPh': 'https://api.example.com',
  'settings.imageTypeOpenai': 'OpenAI 兼容', 'settings.imageTypeGemini': 'Gemini 原生',
  'settings.videoTypeSeedance': '字节 Seedance（火山，异步）', 'settings.videoTypeVeo': '通用同步 (veo)', 'settings.videoTypeSora': 'OpenAI Sora（异步）',
  'settings.aspect916': '9:16 竖屏（短剧/漫剧）', 'settings.aspect169': '16:9 横屏', 'settings.aspect11': '1:1 方形',
  // 镜头补充
  'shot.firstFrame': '首帧', 'shot.endFrame': '尾帧', 'shot.deleteConfirm': '删除该镜头？',
  'shot.statusPrefix': '状态：', 'shot.regen': '重生',
  // 导出补充
  'export.selectEpisode': '请先选择一集', 'export.stitchFail': '合成失败：{msg}',
  'export.shots': '镜头', 'export.keyframes': '关键帧', 'export.videoClips': '视频片段',
  'export.targetDuration': '目标时长', 'export.reverseTitle': '反转顺序', 'export.groupTitle': '按场景分组',
  'export.zipDesc': 'ZIP 包含：所有镜头的关键帧(PNG)、视频片段(MP4)、配音音频，以及 storyboard.json 分镜元数据。',
  'export.zipTip': '可直接导入剪辑软件（Premiere / 剪映 / DaVinci）进行最终成片合成。',
  // 剧本补充
  'script.selectEpisodeDesc': '在左侧选择或创建一集后再开始剧本创作。', 'script.emptyInput': '请先输入故事或剧本内容',
  'script.modelNotReady': '模型未就绪，请先在「模型配置」中完成配置', 'script.modelNotReadyShort': '模型未就绪，请先配置',
  'script.emptyInputShort': '请先输入剧本内容', 'script.parsing': 'AI 正在拆解剧本与规划分镜，请稍候……',
  'script.meta': '语言 {lang} · 风格 {style} · 模型 {model}', 'script.modelUnset': '未配置',
  // 资产补充
  'assets.imageNotReady': '图像模型未就绪，请先在「模型配置」中配置', 'assets.titleCount': '{title}（{n}）',
  // 库补充
  'library.editPromptConfirm': '视觉提示词（保存后 version+1，引用该资产的集将提示同步）',
  'library.titleWithProject': '项目资产库 · {title}', 'library.editPromptTitle': '编辑提示词',
  'library.char': '角色', 'library.scene': '场景', 'library.prop': '道具',
  // Workspace 补充
  'ws.deleteSeasonConfirmTitle': '确定删除「{title}」及其所有集？',
  'ws.deleteEpisodeConfirmTitle': '确定删除「{title}」？此操作不可撤销。',
  'ws.episodeDoubleRename': '双击重命名', 'ws.renderLogs': '渲染日志',
}

const EN: Record<string, string> = {
  'stage.script': 'Script', 'stage.assets': 'Assets', 'stage.director': 'Director', 'stage.export': 'Export', 'stage.prompts': 'Prompts',
  'nav.projects': 'My Projects', 'nav.subtitle': 'From idea to final cut — Script · Assets · Director · Export industrial pipeline',
  'nav.new': 'New', 'nav.demo': 'Load Demo', 'nav.import': 'Import',
  'top.settings': 'Settings', 'top.login': 'Login', 'top.logout': 'Logout', 'top.theme': 'Toggle theme', 'top.language': 'Language',
  'common.save': 'Save', 'common.cancel': 'Cancel', 'common.delete': 'Delete', 'common.edit': 'Edit',
  'common.generate': 'Generate', 'common.confirm': 'Confirm', 'common.close': 'Close', 'common.copy': 'Copy', 'common.rename': 'Rename',
  'dashboard.empty.title': 'No projects yet', 'dashboard.empty.desc': 'Create your first AI motion-comic to start the industrial workflow.',
  'dashboard.empty.action': 'Create first project', 'dashboard.create.title': 'New Project',
  'dashboard.create.titleLabel': 'Title', 'dashboard.create.intro': 'Synopsis', 'dashboard.create.style': 'Visual Style', 'dashboard.create.lang': 'Language',
  'dashboard.create.submit': 'Create & Open', 'dashboard.onboarding.title': 'Welcome to AI Manju',
  'dashboard.onboarding.desc': 'Before creating, configure AI providers and API Keys (chat / image / video / audio).',
  'dashboard.onboarding.action': 'Configure', 'dashboard.deleteConfirm': 'Delete this project and all its seasons/episodes? This cannot be undone.',
  'ws.back': 'Projects', 'ws.season': 'Season', 'ws.newSeason': 'New Season', 'ws.renameSeason': 'Rename Season', 'ws.deleteSeason': 'Delete Season',
  'ws.episodes': 'Episodes', 'ws.newEpisode': 'New', 'ws.library': 'Project Library', 'ws.selectEpisode': 'Select an episode',
  'ws.selectEpisode.desc': 'Pick an episode on the left, or click "New" to create one and start scripting.',
  'ws.renameSeasonPrompt': 'Season name', 'ws.deleteSeasonConfirm': 'Delete this season and all its episodes?',
  'ws.deleteEpisodeConfirm': 'Delete this episode? This cannot be undone.', 'ws.duplicateEpisode': 'Duplicate', 'ws.deleteEpisode': 'Delete',
  'ws.episodeNamePrompt': 'Episode name', 'ws.notExist': 'Project not found', 'ws.deletedDesc': 'This project may have been deleted.',
  'shot.genStart': 'Gen Start', 'shot.regenerate': 'Regen Start', 'shot.genEnd': 'Gen End', 'shot.regenEnd': 'Regen End',
  'shot.genVideo': 'Gen Video', 'shot.genDubbing': 'Gen Dub', 'shot.redub': 'Re-dub',
  'shot.ninegrid': 'Nine-grid', 'shot.genNinegrid': 'Gen Nine-grid', 'shot.regenNinegrid': 'Regen Nine-grid',
  'shot.dubbing': 'Dubbing', 'shot.narration': 'Narration', 'shot.dialogueOpt': 'Dialogue', 'shot.dubPlaceholder': 'Narration or dialogue text',
  'shot.editShot': 'Edit Shot', 'shot.action': 'Action', 'shot.dialogue': 'Dialogue', 'shot.shotSizePh': 'Shot size (close/medium/wide)',
  'shot.cameraPh': 'Camera (push/pull/pan/track)', 'shot.cast': 'Cast', 'shot.duplicate': 'Duplicate Shot', 'shot.remove': 'Delete Shot',
  'shot.firstFrameOnly': 'Current video model supports start-frame only', 'shot.videoStatus': 'Status', 'shot.submitTask': 'Submitting…',
  'assets.charTitle': 'Characters', 'assets.sceneTitle': 'Scenes', 'assets.propTitle': 'Props',
  'assets.batch': 'Batch', 'assets.genRef': 'Generate', 'assets.regenRef': 'Regenerate', 'assets.upload': 'Upload',
  'assets.wardrobe': 'Wardrobe', 'assets.editPrompt': 'Edit Prompt', 'assets.history': 'History',
  'assets.noProp': 'No special props', 'assets.noScript': 'No script structure yet', 'assets.noScriptDesc': 'Run AI parsing in "Script" stage first.',
  'assets.enrich': 'Enrich Character Prompts', 'assets.enrichDone': 'Character prompts enriched', 'assets.noImageModel': 'No image model configured. Go to Settings.',
  'assets.failed': 'Failed',
  'script.input': 'Story / Script', 'script.duration': 'Target Duration', 'script.parse': 'AI Parse', 'script.reparse': 'Re-parse',
  'script.continue': 'Continue', 'script.rewrite': 'Rewrite', 'script.placeholder': 'Paste your novel, outline or script. AI will parse into characters, scenes, props and shots.',
  'script.chars': 'Characters', 'script.scenes': 'Scenes', 'script.props': 'Props', 'script.shots': 'Shots',
  'script.artDirection': 'Art Direction', 'script.enterAssets': 'Go to "Assets" to generate references, then "Director" for keyframes and video.',
  'script.rewritePrompt': 'Rewrite instruction (e.g. add suspense, make it comedy, faster pace)',
  'export.editTitle': 'Edit (Shot Order)', 'export.timeline': 'Timeline', 'export.stitch': 'Stitch Video', 'export.zip': 'Export ZIP',
  'export.reverse': 'Reverse', 'export.groupByScene': 'By Scene', 'export.moveUp': 'Up', 'export.moveDown': 'Down',
  'export.noContent': 'Nothing to export yet', 'export.noContentDesc': 'Complete script, assets and director stages to preview and export here.',
  'export.stitchFallback': 'Browser does not support stitching (MediaRecorder required). Use ZIP export instead.',
  'prompts.cameraLib': 'Camera Movement Library (click to copy)', 'prompts.template': 'Editable Prompt Templates', 'prompts.copied': 'Copied',
  'prompts.tpl.storyboard': 'Storyboard System Prompt', 'prompts.tpl.keyframe': 'Keyframe Consistency Guide',
  'prompts.tpl.videoPrefix': 'Video Prompt Prefix', 'prompts.tpl.negative': 'Default Negative Prompt', 'prompts.saved': 'Templates saved locally and injected in generation.',
  'settings.title': 'Model Settings', 'settings.desc': 'Configure OpenAI-compatible AI providers and models. Four model types are used: chat/image/video/audio.',
  'settings.globalKey': 'Global API Key', 'settings.globalKeyDesc': 'Fallback when a provider has no specific key.',
  'settings.provider': 'Providers', 'settings.providerPreset': 'Mainstream Provider Presets', 'settings.addProvider': 'Add', 'settings.addProviderTitle': 'Add Provider',
  'settings.providerName': 'Name', 'settings.baseUrl': 'Base URL', 'settings.providerKey': 'API Key (optional, leave empty for global)',
  'settings.create': 'Create', 'settings.currentModel': 'Active Models', 'settings.modelName': 'Model name',
  'settings.chat': 'Chat Model (script / prompts)', 'settings.image': 'Image Model (keyframes / references)', 'settings.imageType': 'API Type',
  'settings.video': 'Video Model (interpolation)', 'settings.videoType': 'Schedule Type', 'settings.audio': 'Audio Model (dubbing)',
  'settings.aspect': 'Default Aspect Ratio', 'settings.masked': 'No key', 'settings.show': 'Show', 'settings.hide': 'Hide',
  'settings.setDefault': 'Set default', 'settings.builtin': 'Built-in', 'settings.default': 'Default',
  'login.title': 'AI Manju', 'login.desc': 'Login to new-api to call models', 'login.url': 'new-api URL',
  'login.username': 'Username', 'login.password': 'Password', 'login.submit': 'Login', 'login.register': 'Register & Login',
  'login.toRegister': 'No account? Register', 'login.toLogin': 'Have an account? Login', 'login.hint': 'After login, your API Key will be fetched and used for model calls.',
  'login.fillAll': 'Please fill all fields',
  'library.title': 'Asset Library', 'library.noProject': 'Please select a project first', 'library.desc': 'Library is project-level shared across episodes for cross-episode consistency.',
  'library.empty': 'Empty', 'library.noImage': 'No image',
  'sync.banner': '{n} assets updated in other episodes. Sync to pull the latest.', 'sync.all': 'Sync All',
  'logs.title': 'Render Logs', 'logs.empty': 'No records yet',
  'common.emptyEpisode': 'Select an episode first', 'common.parsed': 'Parsed', 'common.logs': 'Logs',
  'dashboard.importFail': 'Import failed: {msg}', 'dashboard.untitled': 'Untitled Project', 'dashboard.noDesc': 'No description',
  'dashboard.deleteConfirmTitle': 'Delete project "{title}" and all its seasons/episodes? This cannot be undone.',
  'dashboard.titlePrompt': 'Project name', 'dashboard.copyProject': 'Duplicate Project', 'dashboard.renameProject': 'Rename',
  'dashboard.exportProject': 'Export Project', 'dashboard.demoNoDelete': 'Demo projects cannot be deleted', 'dashboard.deleteProject': 'Delete Project',
  'dashboard.titlePh': 'Name your project', 'dashboard.introPh': 'One-line synopsis (optional)',
  'style.anime': 'Anime', 'style.2d': '2D Animation', 'style.3d': '3D Animation', 'style.live': 'Live Action',
  'style.oil': 'Oil Painting', 'style.cyber': 'Cyberpunk',
  'lang.zh': '中文', 'lang.en': 'English', 'lang.ja': '日本語',
  'time.justNow': 'just now', 'time.minAgo': '{n} min ago', 'time.hourAgo': '{n} hr ago', 'time.dayAgo': '{n} d ago',
  'settings.deleteProviderConfirm': 'Delete provider "{name}"?', 'settings.modelNamePh': 'model name',
  'settings.providerNamePh': 'e.g. OpenAI / AntSK', 'settings.baseUrlPh': 'https://api.example.com',
  'settings.imageTypeOpenai': 'OpenAI Compatible', 'settings.imageTypeGemini': 'Gemini Native',
  'settings.videoTypeSeedance': 'ByteDance Seedance (Volcano, async)', 'settings.videoTypeVeo': 'Generic Sync (veo)', 'settings.videoTypeSora': 'OpenAI Sora (async)',
  'settings.aspect916': '9:16 Vertical (short/manga)', 'settings.aspect169': '16:9 Horizontal', 'settings.aspect11': '1:1 Square',
  'shot.firstFrame': 'Start', 'shot.endFrame': 'End', 'shot.deleteConfirm': 'Delete this shot?',
  'shot.statusPrefix': 'Status: ', 'shot.regen': 'Regen',
  'export.selectEpisode': 'Select an episode first', 'export.stitchFail': 'Stitch failed: {msg}',
  'export.shots': 'Shots', 'export.keyframes': 'Keyframes', 'export.videoClips': 'Video Clips',
  'export.targetDuration': 'Target', 'export.reverseTitle': 'Reverse order', 'export.groupTitle': 'Group by scene',
  'export.zipDesc': 'ZIP contains: keyframes (PNG), video clips (MP4), dubbing audio of all shots, plus storyboard.json metadata.',
  'export.zipTip': 'Import into editing software (Premiere / CapCut / DaVinci) for final composition.',
  'script.selectEpisodeDesc': 'Select or create an episode on the left to start scripting.', 'script.emptyInput': 'Please enter story or script first',
  'script.modelNotReady': 'Model not ready. Configure it in Settings first', 'script.modelNotReadyShort': 'Model not ready, configure first',
  'script.emptyInputShort': 'Please enter script first', 'script.parsing': 'AI is parsing the script and planning shots, please wait…',
  'script.meta': 'Lang {lang} · Style {style} · Model {model}', 'script.modelUnset': 'Not configured',
  'assets.imageNotReady': 'Image model not ready. Configure it in Settings first', 'assets.titleCount': '{title} ({n})',
  'library.editPromptConfirm': 'Visual prompt (saves version+1; episodes referencing this asset will be prompted to sync)',
  'library.titleWithProject': 'Project Library · {title}', 'library.editPromptTitle': 'Edit Prompt',
  'library.char': 'Characters', 'library.scene': 'Scenes', 'library.prop': 'Props',
  'ws.deleteSeasonConfirmTitle': 'Delete "{title}" and all its episodes?',
  'ws.deleteEpisodeConfirmTitle': 'Delete "{title}"? This cannot be undone.',
  'ws.episodeDoubleRename': 'Double-click to rename', 'ws.renderLogs': 'Render Logs',
}

const DICT: Record<Locale, Record<string, string>> = { zh: ZH, en: EN }

interface I18nValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh')

  useEffect(() => {
    void kvGet<Locale>('locale').then((l) => {
      if (l) setLocaleState(l)
    })
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    void kvSet('locale', l)
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let s = DICT[locale][key] ?? DICT.zh[key] ?? key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      }
      return s
    },
    [locale],
  )

  const value = useMemo<I18nValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const c = useContext(I18nContext)
  if (!c) throw new Error('useI18n 必须在 I18nProvider 内使用')
  return c
}
