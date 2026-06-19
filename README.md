# AI 漫剧平台（AI Manju）

> 一站式「剧本 → 资产 → 导演台 → 导出」的 AI 漫剧工业化创作工作台。
> 从一句故事到完整分镜，关键帧驱动、角色场景一致性可控。

## ✨ 核心理念

**关键帧驱动（Keyframe-Driven）**：摒弃不可控的"抽卡式"生成，采用工业化工作流——

1. **先画后动**：先生成精准的起始帧 / 结束帧。
2. **资产约束**：所有画面受"角色定妆照 + 场景概念图"强约束，杜绝人物变形与串戏。
3. **美术指导统一**：AI 先产出全局美术指导文档，注入所有提示词，保证全片风格一致。

## 🏗️ 架构

纯前端 SPA（无后端依赖，数据本地化、隐私安全）：

| 层级 | 技术选型 |
| --- | --- |
| 框架 | React 19 + TypeScript + Vite 6 |
| 样式 | Tailwind CSS v4（工业风明暗双主题） |
| 路由 | React Router 7 |
| 存储 | IndexedDB（`idb` 封装） |
| 图标 | lucide-react |

### 目录结构

```
src/
├── types/            # 领域模型（多集架构：项目→季→集）
├── services/
│   ├── adapters/     # AI 适配器（chat/image/video/audio，OpenAI 兼容）
│   ├── db.ts         # IndexedDB 持久化
│   ├── factory.ts    # 领域对象工厂
│   ├── scriptService.ts   # 剧本拆解 + 镜头规划
│   ├── assetService.ts    # 资产参考图生成
│   ├── modelService.ts    # 模型配置管理
│   └── utils.ts      # 通用工具
├── contexts/         # Model / Project / Theme 三层状态
├── components/
│   ├── ui/           # 通用 UI 组件库
│   ├── stages/       # 四阶段工作流组件
│   ├── Dashboard.tsx # 项目管理
│   ├── Settings.tsx  # 模型配置
│   ├── Workspace.tsx # 工作台壳
│   └── TopBar.tsx
├── App.tsx
└── main.tsx
```

### 多集漫剧数据模型

```
ManjuProject（漫剧项目）
  ├── characterLibrary / sceneLibrary / propLibrary  ← 项目级共享资产库（跨集一致）
  └── Season（季）
        └── Episode（集，创作单元）
              ├── rawScript → scriptData（角色/场景/道具/节拍/美术指导）
              └── shots[]（镜头 → 关键帧 → 视频片段 → 配音）
```

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:3000）
npm run dev

# 生产构建
npm run build

# 类型检查
npm run typecheck
```

### 使用流程

1. **配置模型**：进入「模型配置」，填写 OpenAI 兼容供应商的 Base URL 与 API Key，选择对话/图像/视频/语音四类模型。
2. **创建项目**：在首页新建一部漫剧，选择视觉风格与语言。
3. **剧本阶段**：粘贴故事文本，AI 自动拆解为角色、场景、道具、美术指导，并规划分镜。
4. **资产阶段**：批量生成角色定妆图、场景概念图、道具参考图。
5. **导演台**：逐镜头生成关键帧首帧（场景+角色+动作联合驱动）。
6. **导出**：时间轴预览（视频渲染合成在后续迭代接入）。

## 🔌 AI 模型兼容

采用 OpenAI 兼容协议，开箱可接：

- **官方** OpenAI（gpt-4o / gpt-image-1 / tts-1）
- **OpenAI 兼容聚合**（如 AntSK、各类中转）
- **Gemini 原生**（图像可选此形态）

供应商管理支持多 baseUrl + 独立/全局 API Key，按需切换。

## 📐 设计原则

遵循 KISS / YAGNI / DRY / SOLID：适配器层依赖 `AdapterContext` 抽象（依赖倒置）；资产类型抽取 `VisualAsset` 公共基类（DRY）；纯前端无后端（KISS）。

## 🗺️ 开发计划

详见 [`docs/开发计划.md`](./docs/开发计划.md)。

## 📝 致谢

架构与工作流理念参考 [BigBanana-AI-Director](https://github.com/shuyu-labs/BigBanana-AI-Director)（Script-to-Asset-to-Keyframe 工业化流程、关键帧驱动），本项目为独立实现，未复制其源码。
