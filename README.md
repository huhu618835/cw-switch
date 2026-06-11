<div align="center">
  <img src="https://raw.githubusercontent.com/your-username/cw-switch/main/public/icon.png" width="80" alt="cw-switch logo" />
  <h1>🐋 cw-switch</h1>
  <p><strong>CodeWhale 图形化配置工具</strong></p>
  <p>一键切换 Provider · 模型 · API Key · 预设管理</p>
  <br>
  <p>
    <a href="#-功能">功能</a> ·
    <a href="#-快速开始">快速开始</a> ·
    <a href="#-使用指南">使用指南</a> ·
    <a href="#-截图">截图</a> ·
    <a href="#-开发">开发</a>
  </p>
  <br>
</div>

---

## 💡 这是什么

**cw-switch** 是 [CodeWhale](https://github.com/Hmbown/CodeWhale) 的桌面 GUI 配置管理器。灵感来自 [cc-switch](https://github.com/kongkongyo/cc-switch)（Claude Code 的配置工具）。

CodeWhale 默认使用 DeepSeek V4 Pro 模型，每次切模型都要输命令或改 TOML 配置。cw-switch 让你在浏览器里**点点鼠标**就能完成所有配置。

---

## ✨ 功能

| 功能 | 说明 |
|------|------|
| ⚡ **一键切换模型** | Flash / Pro / 自动模式，点一下即刻生效 |
| 🔄 **切换 Provider** | 支持 20+ Provider，自动更新模型列表和 Base URL |
| 🔑 **API Key 管理** | 可视化添加/修改/删除，每个 Provider 独立存储 |
| 🎚 **推理强度调节** | off → low → medium → high → max，滑块控制 |
| 💾 **预设管理** | 保存配置快照，一键加载还原 |
| 🔧 **高级设置** | Memory、Sandbox mode、Allow Shell、Subagents |
| 🚀 **一键启动 CW** | 直接从工具启动 CodeWhale TUI |

---

## 🚀 快速开始

### 前置要求

- [Node.js](https://nodejs.org/) 18+（推荐 20+）
- [CodeWhale](https://github.com/Hmbown/CodeWhale) 已安装

```bash
npm install -g codewhale
```

### 安装 cw-switch

```bash
# 1. 克隆或下载
git clone https://github.com/你的名字/cw-switch.git
cd cw-switch

# 2. 安装依赖
npm install

# 3. 启动
npm start
# 或者双击 start.bat
```

浏览器会自动打开 `http://127.0.0.1:随机端口`，配置界面就出来了。

按 `Ctrl+C` 停止服务。

---

## 📖 使用指南

### 切换模型

1. 启动 cw-switch
2. 在「快捷操作」里点 **「⚡ 切 Flash」** 或 **「🚀 切 Pro」**
3. 点底部 **「✕ 应用更改」**
4. ✅ 完成！

### 切换 Provider

1. 在「当前配置」下拉选择 Provider（如 `OpenAI`、`HuggingFace`）
2. 模型列表和 Base URL 自动更新
3. 配置 API Key（点「管理」）
4. 应用更改

### 保存预设

1. 配置好你想要的设置（比如 Flash + 低推理强度）
2. 在「预设管理」输入名称（如 `学习模式`）
3. 点「保存」
4. 以后随时「加载」就能一键还原

---

## 🖼 截图

> 待添加 — 你可以用任意截图工具截取界面后放在 `screenshots/` 目录

```
┌─ cw-switch ──────────────────────────────┐
│  🐋 cw-switch — CodeWhale Config Manager │
├─ ⚙ 当前配置 ────────────────────────────┤
│  Provider     [deepseek          ▼]     │
│  Model        [deepseek-v4-pro  ▼]     │
│  推理强度     [●━━━━━━━━━━○───] high    │
│  API Key      sk-9a5c*********a1b  管理 │
│  Base URL     https://api.deepseek.com  │
├─ ⚡ 快捷操作 ────────────────────────────┤
│  [⚡ 切 Flash] [🚀 切 Pro] [▶ 启动 CW] │
├─ 💾 预设管理 ────────────────────────────┤
│  [输入名称……]  [保存]  [⟳]              │
│  ┌ flash-only ─────────── [加载] [删除] ┐│
│  └ 3 项设置 ────────────────────────────┘│
├─ 🔧 高级设置 ────────────────────────────┤
│  Memory [●]  Sandbox [workspace-write ▼] │
├──────────────────────────────────────────┤
│  [✕ 应用更改]  [↺ 撤销]  [⟳ 刷新]      │
└──────────────────────────────────────────┘
```

---

## 🛠 开发

### 项目结构

```
cw-switch/
├── server.js          # Express 后端，13 个 REST API
├── public/
│   └── index.html     # 单页前端（纯 HTML+CSS+JS，无框架）
├── package.json
├── start.bat          # Windows 快速启动
└── .gitignore
```

### 技术栈

- **后端**: Node.js + Express
- **前端**: 原生 HTML/CSS/JS（零依赖、零构建）
- **配置读写**: 通过 `codewhale CLI` 命令 + 直接读写 `secrets.json`

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/status` | 当前配置摘要 |
| GET | `/api/config` | 完整配置 |
| PUT | `/api/config` | 写入单条配置 |
| POST | `/api/config/batch` | 批量写入 |
| GET | `/api/auth/:provider` | 查看 API Key 状态 |
| POST | `/api/auth/:provider` | 设置 API Key |
| DELETE | `/api/auth/:provider` | 删除 API Key |
| GET | `/api/providers` | 已知 Provider 列表 |
| GET | `/api/models` | 可用模型列表 |
| GET/POST/PUT/DELETE | `/api/profiles/*` | 预设管理 |
| POST | `/api/launch` | 启动 CodeWhale |

---

## ⚠️ 注意事项

- **cw-switch 只监听 `127.0.0.1`（本地回环）**，不会暴露到网络
- API Key 存储在 `~/.codewhale/secrets/secrets.json`
- 不支持修改 `projects`、`http_headers` 等复杂 TOML 结构（防止配置损坏）
- 如果 config.toml 损坏，工具会自动尝试恢复

---

## 📄 许可证

[MIT](LICENSE)

---

## 💬 感谢

- [Hmbown/CodeWhale](https://github.com/Hmbown/CodeWhale) — 优秀的开源编程助手
- [kongkongyo/cc-switch](https://github.com/kongkongyo/cc-switch) — 界面灵感来源
