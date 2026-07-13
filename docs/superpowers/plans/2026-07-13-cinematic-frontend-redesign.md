# Cinematic Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 AI 漫剧平台重设计为桌面与平板完整可用、键盘与触屏可达的「电影剪辑室」工作台，同时保持现有业务数据和功能兼容。

**Architecture:** 应用使用窄型全局导航轨道和阶段自适应 Workspace；基础 UI、模态与全局对话框提供统一的可访问交互。业务 Context、IndexedDB/OPFS 和 AI 适配器保持原边界，只对启动顺序、按需加载和构建产物做针对性优化。

**Tech Stack:** React 19、TypeScript 5.8 strict、React Router 7、Tailwind CSS 4、Vite 6、Vitest 4、React DOM server rendering tests。

## Global Constraints

- 桌面与平板完整支持的最小宽度为 `768px`；小于 `768px` 只显示设备提示。
- 深色主题默认，浅色主题功能完整；两套主题使用同一语义 token。
- 保留所有现有路由、业务能力、数据格式和 new-api 协议。
- 新增注释与 UI 文案遵循仓库现有中文语言。
- 不新增移动端完整创作、命令面板、拖拽编辑器或云端能力。
- 不创建分支，不执行 `git commit` 或 `git push`。
- 每个任务先写失败测试或可复现基线，再写最小实现；完成后运行定向测试。

---

## File Map

- `src/index.css`：电影剪辑室语义 token、主题、全局可访问性和减少动效规则。
- `src/components/ui/index.tsx`：按钮、卡片、表单、徽标、空状态等基础组件。
- `src/components/ui/Modal.tsx`：可访问模态、焦点管理和 Escape 行为。
- `src/contexts/DialogContext.tsx`：全局异步确认与文本输入对话框。
- `src/components/ViewportGate.tsx`：小于 768px 的设备提示。
- `src/components/TopBar.tsx`：应用级窄型导航轨道。
- `src/components/Dashboard.tsx`、`LoginPage.tsx`、`Settings.tsx`：路由页视觉和交互重设计。
- `src/components/workspace/EpisodeSidebar.tsx`：桌面侧栏和平板抽屉共用的剧集导航内容。
- `src/components/workspace/StageNavigation.tsx`：五阶段可滚动、可访问导航。
- `src/components/workspace/StageHeader.tsx`：阶段标题、说明和操作槽位。
- `src/components/Workspace.tsx`：阶段自适应工作区编排与响应式抽屉。
- `src/components/stages/*.tsx`：五阶段视觉层级与触屏操作。
- `src/contexts/AuthContext.tsx`：本地优先启动、后台会话校验和稳定 Provider value。
- `vite.config.ts`、`src/index.css`、`StageExport.tsx`：字体、sourcemap、JSZip 与阶段拆包优化。
- `src/components/ui/__tests__/primitives.test.tsx`、`src/components/__tests__/ViewportGate.test.tsx`：Node 环境下的服务端渲染语义测试。

---

### Task 1: 电影剪辑视觉 token 与基础组件

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/ui/index.tsx`
- Modify: `src/components/ui/IconButton.tsx`
- Modify: `vitest.config.ts`
- Create: `src/components/ui/__tests__/primitives.test.tsx`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `Button` 默认 `type="button"` 并在 loading 时提供 `aria-busy`。
- Produces: `Label` 接收标准 `LabelHTMLAttributes<HTMLLabelElement>`，包括 `htmlFor`。
- Produces: 保持现有 `Button/Card/Input/Textarea/Select/Badge/Spinner/EmptyState` 导出名称不变。

- [ ] **Step 1: 写基础语义失败测试**

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { Button, Input, Label } from '@/components/ui'

it('关联标签并暴露按钮忙碌状态', () => {
  const html = renderToStaticMarkup(
    <><Label htmlFor="title">标题</Label><Input id="title" /><Button loading>保存</Button></>,
  )
  expect(html).toContain('for="title"')
  expect(html).toContain('id="title"')
  expect(html).toContain('aria-busy="true"')
  expect(html).toContain('type="button"')
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npx vitest run src/components/ui/__tests__/primitives.test.tsx`

Expected: FAIL，因为 Vitest 尚未匹配 `.test.tsx`，且 `Label` 尚不接收 `htmlFor`。

- [ ] **Step 3: 扩展测试匹配并实现最小语义接口**

```ts
// vitest.config.ts
include: ['src/**/__tests__/**/*.test.{ts,tsx}']
```

```tsx
export function Label({ className, children, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={clsx('mb-2 block text-xs font-medium text-text-muted', className)} {...rest}>{children}</label>
}
```

`Button` 解构 `type = 'button'`，输出 `type={type}`、`aria-busy={loading || undefined}`；`IconButton` 同样默认 `type="button"`。

- [ ] **Step 4: 重写全局 token 与基础组件样式**

深色 token 使用 `#090a0c`、`#111317`、`#171a20`、`#d7b27a` 体系；浅色使用 `#f3f0e9`、`#fbfaf7`、`#ffffff`、`#8a5725` 体系。删除 `[class*=...]` 全局悬停选择器和重复滚动条规则，增加：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: 限定字体子集并忽略视觉伴侣产物**

将字体导入改为 `@fontsource/inter/latin-{400,500,600,700}.css` 与 `@fontsource/jetbrains-mono/latin-400.css`；在 `.gitignore` 增加 `.superpowers/`。

- [ ] **Step 6: 验证任务**

Run: `npx vitest run src/components/ui/__tests__/primitives.test.tsx && npm run typecheck`

Expected: 新测试 PASS，类型检查退出码 0。

---

### Task 2: 可访问 Modal、全局对话框与反馈

**Files:**
- Modify: `src/components/ui/Modal.tsx`
- Create: `src/contexts/DialogContext.tsx`
- Modify: `src/contexts/AlertContext.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/components/Workspace.tsx`
- Modify: `src/components/ProjectLibraryModal.tsx`
- Modify: `src/components/stages/StageScript.tsx`
- Modify: `src/components/stages/ShotCard.tsx`
- Modify: `src/components/Settings.tsx`

**Interfaces:**
- Produces: `useDialog(): { confirmDialog(options): Promise<boolean>; promptDialog(options): Promise<string | null> }`。
- Consumes: Task 1 的 `Button/Input/Label/Modal` 公共接口。

- [ ] **Step 1: 添加对话框接口的编译失败用例**

在 `DialogContext.tsx` 先声明以下公共类型，并在调用方替换一个原生 `confirm`，运行 typecheck 确认 Provider 尚未接入导致失败：

```ts
export interface ConfirmDialogOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
}
```

- [ ] **Step 2: 实现 `DialogProvider`**

Provider 使用单个判别联合状态承载 confirm/prompt 请求，用 resolver ref 在确认、取消和卸载时解析 Promise；prompt 的空字符串作为有效返回值，关闭返回 `null`。

- [ ] **Step 3: 完成 Modal 焦点管理**

`Modal` 使用 `useId` 关联标题，打开时记录触发元素并聚焦第一个可交互元素；拦截 Tab/Shift+Tab 圈定焦点；Escape 调用 `onClose`；关闭时恢复焦点并恢复 body overflow。

- [ ] **Step 4: 接入应用并替换全部原生弹窗**

在 `App.tsx` 中将 `DialogProvider` 放在 `AlertProvider` 内；用 `await confirmDialog(...)` 和 `await promptDialog(...)` 替换 `rg "\b(confirm|prompt)\(" src` 找到的业务调用。

- [ ] **Step 5: 提升 Toast 语义**

Toast 容器增加 `aria-live="polite"`、`aria-atomic="false"`，单条错误提示使用 `role="alert"`，其他提示使用 `role="status"`。

- [ ] **Step 6: 验证任务**

Run: `rg -n "window\.(prompt|confirm)|\bprompt\(|\bconfirm\(" src`

Expected: 无浏览器原生弹窗调用。

Run: `npm run typecheck && npx vitest run`

Expected: 类型检查和全部测试 PASS。

---

### Task 3: 应用导航轨道、主题/i18n 与手机阻断页

**Files:**
- Create: `src/components/ViewportGate.tsx`
- Create: `src/components/__tests__/ViewportGate.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/TopBar.tsx`
- Modify: `src/contexts/ThemeContext.tsx`
- Modify: `src/contexts/I18nContext.tsx`

**Interfaces:**
- Produces: `ViewportGate({ children }: { children: ReactNode })`，宽度小于 768px 时只渲染 `MobileUnsupported`。
- Produces: `MobileUnsupported` 为可独立 SSR 测试的纯组件。

- [ ] **Step 1: 写手机阻断页失败测试**

```tsx
it('说明最低视口宽度', () => {
  const html = renderToStaticMarkup(<MobileUnsupported />)
  expect(html).toContain('768px')
  expect(html).toContain('桌面或平板')
})
```

- [ ] **Step 2: 运行并确认组件不存在**

Run: `npx vitest run src/components/__tests__/ViewportGate.test.tsx`

Expected: FAIL with module/export not found。

- [ ] **Step 3: 实现 ViewportGate 并接入 AppShell**

使用 `window.matchMedia('(min-width: 768px)')` 初始化和监听；测试/SSR 无 window 时默认允许 children。`/login` 不显示导航轨道，其他路由使用 `flex h-full overflow-hidden` 的轨道 + 主内容骨架。

- [ ] **Step 4: 将 TopBar 重设计为导航轨道**

保留语言、主题、登录和设置能力；用 `useLocation` 设置 `aria-current="page"`，图标按钮全部有可本地化 label；平板轨道宽度固定为 56px，不占用额外顶部高度。

- [ ] **Step 5: 修复主题与语言副作用**

Theme updater 只计算状态，DOM 与 IndexedDB 写入移动到 `[theme]` effect；I18n `[locale]` effect 同步 `document.documentElement.lang` 为 `zh-CN` 或 `en`。

- [ ] **Step 6: 验证任务**

Run: `npx vitest run src/components/__tests__/ViewportGate.test.tsx && npm run typecheck`

Expected: PASS。

---

### Task 4: Dashboard、Login 与 Settings 路由页重设计

**Files:**
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/components/Onboarding.tsx`
- Modify: `src/components/LoginPage.tsx`
- Modify: `src/components/Settings.tsx`
- Modify: `src/components/NewApiAccountCard.tsx`

**Interfaces:**
- Consumes: Task 1 基础组件、Task 2 `useDialog`、Task 3 应用骨架。
- Produces: 项目卡主入口为真实 `button`，操作区不依赖 hover。

- [ ] **Step 1: 建立 SSR 语义断言**

为不依赖 Context 的 `ProjectCardActions` 或提取后的纯展示组件写测试，断言四个操作都有可访问名称且主入口为 button。

- [ ] **Step 2: 重构 Dashboard 项目卡结构**

使用 `article` + 独立主入口 button + 独立操作组，避免嵌套 button；顶部动作容器为 `flex-wrap`，项目网格在 768px 为两列、桌面为三列。

- [ ] **Step 3: 统一表单关联**

为创建项目、登录/注册、供应商和模型表单增加稳定 `id` 与 `htmlFor`；错误容器使用 `role="alert"`，登录表单使用 `<form onSubmit>` 支持 Enter。

- [ ] **Step 4: 应用电影剪辑视觉层级**

Dashboard 使用创作空间标题、配置状态与媒体卡片；Login 使用暗色画布与暖金主动作；Settings 将 465 行中的配置分区保持现有逻辑，只重构容器、标题、间距和触屏目标。

- [ ] **Step 5: 验证任务**

Run: `npm run typecheck && npx vitest run`

Expected: PASS；`rg -n "<Label>" src/components/Dashboard.tsx src/components/LoginPage.tsx src/components/Settings.tsx` 不再出现无关联标签。

---

### Task 5: 阶段自适应 Workspace 与平板剧集抽屉

**Files:**
- Create: `src/components/workspace/EpisodeSidebar.tsx`
- Create: `src/components/workspace/StageNavigation.tsx`
- Create: `src/components/workspace/StageHeader.tsx`
- Modify: `src/components/Workspace.tsx`

**Interfaces:**
- Produces: `EpisodeSidebar` 接收项目、季、剧集和 CRUD 回调，不自行访问持久化服务。
- Produces: `StageNavigation({ stage, onChange, onOpenEpisodes, onOpenLogs })`。
- Produces: `StageHeader({ eyebrow, title, description, actions })`。

- [ ] **Step 1: 为阶段导航纯配置写失败测试**

从 `StageNavigation.tsx` 导出 `WORKSPACE_STAGES`，测试 key 顺序严格为 `script/assets/director/export/prompts`，避免重构改变持久化 stage 语义。

- [ ] **Step 2: 提取 EpisodeSidebar**

桌面 `<aside>` 在 `lg` 以上显示；平板通过 Workspace 中的覆盖层抽屉渲染相同组件。剧集项使用 button，复制/删除操作始终显示；重命名提供明确按钮，不依赖双击。

- [ ] **Step 3: 提取 StageNavigation**

导航容器使用 `role="tablist"`，每项使用 `role="tab"`、`aria-selected`，容器可横向滚动；平板显示“剧集”抽屉按钮。

- [ ] **Step 4: 精简 Workspace 为编排层**

Workspace 只负责路由项目选择、当前 stage、抽屉/日志/资产库状态和阶段 lazy rendering。阶段导入改为 `lazy(() => import(...))`，每个阶段单独 Suspense。

- [ ] **Step 5: 验证任务**

Run: `npm run typecheck && npx vitest run`

Expected: PASS；`Workspace.tsx` 不再包含 `group-hover` 或 `onDoubleClick`。

---

### Task 6: 五阶段内容与镜头卡电影剪辑化

**Files:**
- Modify: `src/components/stages/StageScript.tsx`
- Modify: `src/components/stages/StageAssets.tsx`
- Modify: `src/components/stages/StageDirector.tsx`
- Modify: `src/components/stages/ShotCard.tsx`
- Modify: `src/components/stages/StageExport.tsx`
- Modify: `src/components/stages/StagePrompts.tsx`
- Modify: `src/components/WardrobeModal.tsx`
- Modify: `src/components/ProjectLibraryModal.tsx`
- Modify: `src/components/RenderLogsModal.tsx`

**Interfaces:**
- Consumes: Task 5 的 `StageHeader`。
- 保持: 所有业务 hook、service 调用和 `patchEpisode` 数据结构不变。

- [ ] **Step 1: 为阶段标题和媒体语义建立 SSR 测试**

测试 `StageHeader` 将 eyebrow、title、description 和 actions 渲染到明确的 header 区域；测试 `Button loading` 仍保留可见标签。

- [ ] **Step 2: 剧本与资产阶段重排**

剧本使用宽编辑面 + 右侧结构摘要，在平板降为单列；资产使用媒体网格和常驻操作；所有上传 input 具备可访问 label。

- [ ] **Step 3: 导演台与 ShotCard 重排**

导演台顶部展示镜头数量与批处理；镜头卡突出 9:16 媒体帧、时间码、状态和主要生成动作，详细提示词/配音放入分区；复制和删除按钮始终可达。

- [ ] **Step 4: 导出与提示词阶段重排**

导出排序列表和时间线采用电影剪辑条带视觉；配音 `<audio>` 增加 `controls`；提示词卡提供明确复制状态和键盘按钮。

- [ ] **Step 5: 模态内容统一**

衣橱、资产库与渲染日志使用新的 Modal 尺寸、标题和列表表面；移除硬编码中文按钮，使用现有 i18n key 或补充同命名空间 key。

- [ ] **Step 6: 验证任务**

Run: `npm run typecheck && npx vitest run`

Expected: PASS；`StageExport.tsx` 中所有 timeline audio 均包含 `controls`。

---

### Task 7: 启动体验与构建体积优化

**Files:**
- Modify: `src/contexts/AuthContext.tsx`
- Modify: `src/components/stages/StageExport.tsx`
- Modify: `src/components/Dashboard.tsx`
- Modify: `vite.config.ts`

**Interfaces:**
- 保持: `AuthContextValue` 公共字段和方法名称不变。
- Produces: 本地状态恢复完成后 `initializing` 立即为 false，远端校验后台运行。

- [ ] **Step 1: 记录构建基线**

Run: `npx vite build --outDir /private/tmp/ai-manju-redesign-before --emptyOutDir`

Expected baseline: 字体约 1 MB、index JS gzip 约 79 KB、vendor gzip 约 37 KB、输出 sourcemap。

- [ ] **Step 2: 调整 Auth 启动顺序并 memo value**

用 `Promise.all` 恢复三个 KV；写入本地 state 后立即 `setInitializing(false)`；随后后台调用 `fetchSelf/fetchTokens`，失败只清除无效 session UI state，不阻塞本地项目。Provider value 使用 `useMemo`。

- [ ] **Step 3: 动态加载重依赖**

`StageExport` 从顶层移除 `import JSZip`，在导出函数中执行：

```ts
const { default: JSZip } = await import('jszip')
const zip = new JSZip()
```

`Dashboard` 在加载示例时动态导入 `demoData`。

- [ ] **Step 4: 修正 Vite 输出**

将 `sourcemap` 设为 `false`；manualChunks 不再把 `jszip` 固定进 vendor，只保留稳定框架依赖。

- [ ] **Step 5: 验证构建产物**

Run: `npx vite build --outDir /private/tmp/ai-manju-redesign-after --emptyOutDir`

Expected: 无 `.map`；字体只含 latin 文件；JSZip 位于按需 chunk 且不由首页 preload；构建成功。

---

### Task 8: 全量回归与交付检查

**Files:**
- Modify only if verification finds defects in files already listed above.

**Interfaces:**
- Produces: 满足设计文档全部验收标准的干净工作树改动集。

- [ ] **Step 1: 运行自动化门禁**

Run: `npm run typecheck`

Expected: exit 0。

Run: `npx vitest run`

Expected: 所有测试文件和用例 PASS。

Run: `npx vite build --outDir /private/tmp/ai-manju-redesign-final --emptyOutDir`

Expected: 构建成功，无 sourcemap 和非 latin 字体。

- [ ] **Step 2: 运行静态可访问性扫描**

Run: `rg -n "group-hover|onDoubleClick|window\.(prompt|confirm)|\bprompt\(|\bconfirm\(" src/components`

Expected: 核心交互无命中；若有装饰性命中，逐项人工确认不影响键盘/触屏。

Run: `rg -n "<Label>" src/components`

Expected: 无未关联 Label。

- [ ] **Step 3: 检查工作树与格式**

Run: `git diff --check && git status --short`

Expected: 无空白错误；只包含本计划内源码、测试和文档改动，`.superpowers/` 已被忽略。

- [ ] **Step 4: 汇总交付**

报告完成的核心体验、自动化验证结果、构建体积变化和任何受环境限制无法自动完成的视觉检查；不提交或推送。

