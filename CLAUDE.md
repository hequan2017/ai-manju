# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

AI 漫剧平台（ai-manju）：纯前端 SPA，实现「**剧本 → 资产 → 导演台 → 导出**」的 AI 漫剧工业化工作流。数据全本地化（IndexedDB + OPFS），AI 调用经 **new-api** 网关（OpenAI 兼容）。

核心理念：**关键帧驱动**（先生成首尾帧，再帧间插值生成视频）+ **多集资产一致性**（项目级资产库跨集共享）。

技术栈：React 19 + TypeScript 5.8（strict）+ Vite 6 + Tailwind CSS v4 + React Router 7 + idb + Vitest。

## 常用命令

```bash
npm run dev          # 开发服务器（HMR，端口 3000）
npm run build        # 类型检查 + 生产构建（tsc -b && vite build）
npm run typecheck    # 仅类型检查（tsc -b --noEmit）
npm run preview      # 预览生产构建

npx vitest run                                    # 跑全部单测
npx vitest run src/services/__tests__/durationParser  # 单个测试文件
npx vitest run -t "解析时长"                        # 按用例名过滤

node server/mediaProxyServer.mjs   # 可选：媒体代理（端口 3001，绕过签名 URL 的 CORS）
```

测试配置见 `vitest.config.ts`：`environment: 'node'`，仅匹配 `src/**/__tests__/**/*.test.ts`（**service 层单测，不测 React 组件**）。无 ESLint 配置；代码规范由 `tsconfig.app.json` 的 strict 系列选项强制。

## 架构（读多文件才能理解的大局）

### 三级数据模型 + 资产共享

```
ManjuProject（项目）
  ├─ characterLibrary / sceneLibrary / propLibrary   ← 项目级资产库（跨集共享，version 单调递增）
  └─ Season（季）→ Episode（集，创作单元）
        ├─ rawScript → scriptData（AI 拆解产物：characters/scenes/props/storyBeats/artDirection）
        ├─ characterRefs / sceneRefs / propRefs        ← 集对项目资产的引用（syncedVersion / syncStatus）
        └─ shots[] → keyframes[start/end] → interval(视频) → dubbing(配音) → nineGrid
```

- **集（Episode）是创作单元**，走五阶段：`script | assets | director | export | prompts`（`EpisodeStage`）。
- 角色/场景/道具共享 `VisualAsset` 公共基类（DRY），定义在 `src/types/index.ts`——新增领域类型都放这里。
- 实体创建统一走 `src/services/factory.ts`（带默认值，保证字段完整）；持久化走 `src/services/db.ts`（idb，object stores 见文件头注释）。

### AI 调用统一经适配器层（依赖倒置）

所有模型调用经 `src/services/adapters/`：

- `http.ts`：`resolveProvider`（解析 baseUrl + 生效 apiKey）、`request`（Bearer Token + 指数退避重试 408/429/5xx）、`ensureOk`（统一错误信息）。**适配器只依赖 `AdapterContext { providers, globalApiKey }` 抽象，不耦合 React 状态。**
- `chatAdapter`：`chat`（纯文本）/ **`chatJSON<T>`（强制 `response_format: json_object` + `extractJSON` 稳健解析代码块包裹与多余文本）**。**所有结构化 AI 输出（剧本拆解、分镜、美术指导、质量评估等）统一走 `chatJSON`**，不要手写 `JSON.parse`。
- `imageAdapter` / `videoAdapter` / `audioAdapter`：图像（文生图/图生图 OpenAI 兼容 + Gemini 原生）、视频（Seedance/Sora 异步轮询 / Veo 同步）、语音 TTS。视频统一走 `/v1/videos`，首帧/首尾帧通过 `input` 数组传入。

### 镜头操作为纯函数（DRY）

`src/services/shotActions.ts` 是镜头生成的纯函数（`generateStartFrame` / `generateEndFrame` / `generateVideoClip` / `generateDubbing` / `buildShotPrompt`），**同时被 `hooks/useShotActions.ts`（单镜头）和 `stages/StageDirector.tsx`（批量）共用**。新增镜头级生成逻辑放这里，不要在组件里重复。`buildShotPrompt` 组合「场景 + 出场角色 + 动作 + 美术指导」，提示词超 4500 字符自动触发 LLM 压缩。

### Context 架构与跨 Context 同步

6 个 Provider 在 `App.tsx` 嵌套：`Theme > I18n > Model > Auth > Project > Alert`。关键：

- **`ProjectContext`**：管理三级层级 + 惰性加载（季/集按需拉取）。**`patchEpisode(id, mutator)` 是高频编辑入口**（剧本/分镜/镜头变更），内部基于最新 db 状态应用 mutator 后持久化——编辑集内容时优先用它。
- **`Auth → Model` 自动同步**：用户在 `AuthContext` 选中 new-api 令牌后，effect 自动把 new-api 注入为默认供应商 + 写入 `globalApiKey` 到 `ModelContext`，使**所有适配器调用自动走 new-api**。
- **不可变更新**：状态更新一律用展开符（`{ ...e, field: value }`），mutator 必须返回新对象。
- **生成状态持久化**：`GenerationStatus`（`pending | generating | completed | failed`）随领域对象落库，刷新不丢失——生成中需据此恢复 UI。

### 关键帧驱动工作流

镜头（Shot）含 `keyframes[]`（start/end 帧，存 base64 data url）+ `interval`（视频片段）+ `dubbing`（配音）。视频模型按 `type`（`sora | veo | seedance`）决定能力：Seedance/Sora 仅首帧驱动，Veo 支持首尾帧插值——UI 据此启用/隐藏尾帧入口。

## 关键约定（新增/修改代码时遵循）

- **别名**：`@/` → `src/`（tsconfig + vite + vitest 三处已配）。
- **中文注释 + 中文 i18n 文案**：全仓代码注释、`I18nContext` 字典均为中文，新增保持一致。i18n key 按「组件.字段」命名，缺失 key 原样返回。
- **Context Provider 的 `value` 必须 memo**（`useMemo` + 内部函数 `useCallback`），否则消费者会因无关重渲染抖动。
- **路由懒加载**：`Workspace` / `Settings` 已用 `React.lazy`（命名导出需 `.then(m => ({ default: m.X }))`）；新增大体积路由页同样应懒加载以控制首屏主包。
- **`StrictMode` 已启用**：`useState` 的 updater 必须是纯函数，**不得在其中执行副作用**（调用其他 setState / 发起异步请求），否则会被双触发。
- **零 `any`、零 `console.*`**：保持现状；类型严格（`noUnusedLocals` / `noUnusedParameters` / `noFallthroughCasesInSwitch` 均开）。
- **遵循 KISS / YAGNI / DRY / SOLID**：不过度设计，复用 `factory.ts` / `db.ts` / `adapters` 现有抽象。

## new-api 对接（后端网关）

非本仓代码，但深度依赖。对接机制（`src/services/newApiClient.ts`）：登录 `POST /api/user/login` → 换 access_token `GET /api/user/token`；管理接口需 `Authorization: <access_token>` + `New-Api-User: <id>` 头；模型调用走 OpenAI 兼容 `/v1/*` + `Authorization: Bearer sk-xxx`。Docker 部署时前端 nginx 同源反代 `/api`、`/v1` → new-api，解决 cookie 跨域。详见 README「后端 new-api 部署与对接」。

## 环境变量

仅一个可选变量：`VITE_MEDIA_PROXY_ENDPOINT`（媒体代理端点，绕过签名 URL 的 CORS）。见 `.env.example`。无其他构建期配置。
