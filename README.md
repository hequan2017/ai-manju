[简体中文](README.md) | [English](README.en.md)

# AI 漫剧平台（AI Manju）

> 🎬 一站式 **AI 漫剧工业化创作平台** —— 从一句故事到完整成片。关键帧驱动 · 多集资产一致 · 主流模型全兼容 · 全流程本地化。

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg)](https://vite.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-38BDF8.svg)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-passing-brightgreen.svg)]()
[![i18n](https://img.shields.io/badge/i18n-中英-yellow.svg)]
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#-license)

## 项目介绍

AI 漫剧生成平台，后台对接 [new-api](https://github.com/QuantumNous/new-api)。面向创作者，实现「**剧本 → 资产 → 导演台 → 导出**」的完整工业化工作流。

它摒弃不可控的"抽卡式"生成，采用 **Script-to-Asset-to-Keyframe** 流程：先生成精准的起始帧与结束帧，再用视频模型（Seedance / Sora / Veo）在两帧之间插值生成视频；所有画面受「角色定妆照 + 场景概念图」强约束，并由 AI 产出的全局美术指导文档注入所有提示词，保证全片风格一致。数据全部本地化（IndexedDB + OPFS），支持**多集漫剧**的项目化管理。

## 🖼️ 界面预览

| Dashboard（项目管理） | 导演台（镜头工作卡） |
|---|---|
| ![Dashboard](./images/dashboard.png) | ![导演台](./images/director.png) |

| 导出（剪辑 + 时间轴 + 成片） | 登录（对接 new-api） |
|---|---|
| ![导出](./images/export.png) | ![登录](./images/login.png) |

> 截图来自内置「流浪地球」示例项目——首页点击「加载示例」即可体验完整流程。

## ✨ 功能特性

- **剧本与分镜**：AI 拆解小说 / 大纲为角色、场景、道具、故事节拍、美术指导；按节拍与目标时长自动规划分镜（景别 / 运镜 / 出场角色）；支持续写 / 改写与参考图多模态推断风格
- **资产与选角**：角色定妆 + 衣橱系统（多套造型）+ 角色九宫格（Turnaround，9 视角）；场景概念图、道具一致性参考、参考图上传、一键批量生成
- **导演工作台**：每镜头独立的首帧 / 尾帧 / 视频 / 配音工作卡；首尾帧插值生成视频（Seedance/Sora 仅首帧，Veo 支持首尾帧，自动适配）；九宫格构图辅助、旁白 / 对白 TTS、批量生成
- **成片导出**：时间轴预览；ZIP 打包（素材 + `storyboard.json`）；浏览器内 canvas + MediaRecorder + AudioContext 混流为单一 WebM 成片
- **多集与数据**：项目 → 季 → 集三级管理；项目级资产库版本机制 + 跨集同步横幅；新集拆解自动复用同名资产（Jaccard + Dice 相似度）；OPFS 视频存储规避 IndexedDB 容量上限；项目 JSON 导入 / 导出
- **模型与可控性**：9 家供应商预设一键添加，对话 / 图像 / 视频 / 语音四类模型独立切换；32 种运镜参考的提示词模板、渲染日志、5 项加权质量评分、提示词预检 / 版本回滚 / LLM 压缩

## 🛠 技术栈

| 层级 | 技术选型 |
| --- | --- |
| 框架 / 构建 | React 19 + TypeScript 5.8 / Vite 6（manualChunks 拆包） |
| 样式 / 路由 | Tailwind CSS v4（工业风明暗双主题）/ React Router 7 |
| 存储 | IndexedDB（`idb`）+ OPFS（视频大对象） |
| 后端 / 测试 / i18n | new-api（AI 网关，Docker 同源反代）/ Vitest（service 层单元测试）/ 中英双语全量字典（`I18nContext`） |

## 🚀 快速开始

```bash
git clone <repo-url> && cd ai-manju
npm install       # 环境要求：Node.js ≥ 18
npm run dev        # 开发服务器，http://localhost:3000
npm run build      # 类型检查 + 生产构建
npm run typecheck  # TypeScript 类型检查
```

### Docker 部署（推荐生产）

`docker-compose.yaml` 已内置 new-api，前端 nginx 反代 `/api` + `/v1` → new-api，同源部署解决跨域 cookie：

```bash
docker compose up -d --build                   # 前端 http://localhost:8080，new-api 仅内部网络
docker compose --profile proxy up -d --build   # 可选：媒体代理（绕过签名 URL 的 CORS）
docker compose --profile mysql up -d --build   # 可选：MySQL 替代 new-api 默认 SQLite
```

首次访问前端 → 登录页填 new-api 地址为**同源地址**（如 `http://localhost:8080`）。生产部署时把 `8080:80` 换成 `443:80` + TLS；new-api 数据持久化于 `./data/new-api`，`SESSION_SECRET` 请改为随机值。

### 对接 new-api

所有**模型请求、用户登录、令牌管理**均通过 new-api 网关（OpenAI 兼容 + 用户系统）：启动 compose 中的 new-api 并注册首个账号（自动管理员）→ 在 new-api「渠道」添加 AI 供应商（OpenAI / 火山豆包 / Gemini 等）→ 本平台登录页填写 new-api 地址 + 账号密码 → 「模型配置」选用 / 创建 API 令牌，自动用于所有模型调用。

对接机制（按 new-api 官方 API）：登录 `POST /api/user/login` → 换 access_token `GET /api/user/token`；用户 / 令牌 / 模型走 `/api/user/self`、`/api/token/` 等；模型调用走 OpenAI 兼容 `/v1/*` + `Authorization: Bearer sk-xxx`。

### 模型兼容与部署

OpenAI 兼容协议为主，兼容原生 Gemini 与字节火山，内置 9 家预设：OpenAI、火山引擎(豆包)（Seedream 图像 / Seedance 视频）、Google Gemini（原生图像 / Veo 视频）、DeepSeek、Moonshot Kimi、智谱 GLM、阿里通义、硅基流动、AntSK 聚合。

仓库内置 `.github/workflows/deploy.yml`，推送 `main` 后自动部署到 GitHub Pages `https://<用户名>.github.io/<仓库名>/`（Settings → Pages → Source 选「GitHub Actions」；SPA 路由通过 `404.html` 回退）；Vercel / Netlify / Cloudflare Pages 连接仓库即可零配置部署。

## ⚙️ 配置与环境变量

复制 `.env.example` 为 `.env`，可选配置媒体代理端点（绕过签名 URL 的 CORS 限制）：`VITE_MEDIA_PROXY_ENDPOINT=http://localhost:3001/api/media-proxy`。

当视频 / 图像的签名 URL 因 CORS 无法直接下载时，启动代理：`node server/mediaProxyServer.mjs`（默认端口 3001，仅放行 GET，限制 200MB / 60s 超时）。

## 📁 目录结构

```text
ai-manju/
├── src/
│   ├── types/                 # 领域模型（多集架构、资产、镜头、模型配置）
│   ├── services/adapters/     # 剧本 / 资产 / 导演台 / 导出 / 提示词等服务层 + AI 适配器
│   ├── contexts/              # Model / Project / Theme / Auth / I18n 状态
│   └── components/stages/     # 五阶段工作流（Script/Assets/Director/Export/Prompts）
├── server/mediaProxyServer.mjs  # 可选媒体代理
├── nginx.conf / docker-compose.yaml  # SPA 回退 + new-api 同源反代 / 一键部署
```

## 📚 项目文档

- [`docs/功能对比与开发计划.md`](./docs/功能对比与开发计划.md) —— 与参考项目逐模块对比 + 完整开发路线
- [`docs/实现完成报告.md`](./docs/实现完成报告.md) —— 实现完成度与测试报告
- [`docs/开发计划.md`](./docs/开发计划.md) —— 早期开发计划

## 🔗 相关项目

- [ComfyStudio（new-aigc-comfyui-minimax-h3）](https://github.com/hequan2017/new-aigc-comfyui-minimax-h3) —— 同作者的 ComfyUI 多卡管理平台，内置 AI 漫剧工作台（分集剧本 → 分镜画面 → 场景视频 → 合并成片）。

## 📄 License

本项目采用 **MIT** 许可证。

架构与工作流理念参考 [**BigBanana-AI-Director**](https://github.com/shuyu-labs/BigBanana-AI-Director)（Script-to-Asset-to-Keyframe 工业化流程、关键帧驱动、多集架构）。本项目为**独立实现**，未复制其源码（参考项目为 CC BY-NC-SA 4.0）。
