# Fuka

> agentic social memory for the present, not the organized
>
> 智能社交统筹，登场游刃有余，人情往来不累

QQ 社交 AI Agent，基于腾讯 PCG 校园 AI 产品创意大赛「赛题 3 - 用 AI 玩转 QQ 养虾」设计。

## 核心定位

**智能社交统筹 — 让用户登场游刃有余，人情往来不累。**

Fuka 不只是"记住"，而是主动统筹你的社交关系：承诺不遗漏、同好不错过、初见有话说。

## 三个核心场景

### 场景 1：承诺追踪 — 答应的事，从不食言

- **旧体验**：答应朋友的事，当时说了后来忘了，对方觉得自己被放鸽子
- **Fuka 体验**：承诺自动提取、跨会话记忆、到期触发提醒 — 你只管说，Fuka 帮你记，登场时游刃有余
- **关键能力**：承诺意图识别 + 跨会话持久化 + 时机触发

### 场景 2：兴趣匹配 — 同好不错过，人情往来不累

- **旧体验**：群里每天消息刷屏，真正感兴趣的人被淹没了
- **Fuka 体验**：群消息持续分析，兴趣同好自动匹配推送 — 不用费心刷屏，缘分自然来
- **关键能力**：兴趣标签提取 + 双向匹配 + 主动通知

### 场景 3：侧写生成 — 登场即了解，破冰有底气

- **旧体验**：群里加了一个人，不知道怎么破冰，不了解他
- **Fuka 体验**：分析历史发言，生成一句话侧写 + 置信度 — 三句话就认识一个人，登场有底气
- **关键能力**：历史消息聚合 + LLM 侧写 + 置信度评估

## 架构设计

### 数据模型

```
用户社交数据（消息、承诺、关系）
        ↓
   [记忆层] → 承诺追踪 | 兴趣图谱 | 人物侧写
        ↓
   [触发层] → 时间触发 | 上下文触发 | 主动探测
        ↓
   [交互层] → 提醒 | 匹配推荐 | 侧写推送
```

### 模块划分

| 模块 | 职责 | 对应场景 |
|------|------|---------|
| `PromiseTracker` | 承诺提取、存储、到期提醒 | 场景 1 |
| `InterestGraph` | 群消息分析、兴趣标签提取、匹配 | 场景 2 |
| `ProfileGen` | 人物侧写生成、置信度评估 | 场景 3 |
| `TriggerEngine` | 时间/上下文/主动触发调度 | 三场景共用 |
| `MessagePipeline` | QQ 消息流接入、解析、存储 | 基础设施 |
| `FukaBrain` | LLM 调度、意图分发、统一回复 | 核心胶水 |

### 数据库（SQLite）

通过 Prisma ORM 管理，数据库文件位于 `prisma/fuka.db`：

- `messages` - 消息存储
- `promises` - 承诺记录
- `interests` - 兴趣标签
- `profiles` - 人物侧写
- `interest_matches` - 兴趣匹配记录
- `trigger_logs` - 触发日志

## 项目结构

```
fuka/
├── package.json
├── tsconfig.json
├── biome.json
├── prisma.config.ts
├── README.md
├── cli/
│   └── index.js                # 终端入口
├── plugin/
│   └── index.js                # OpenClaw 插件入口  ← NEW
├── prisma/
│   ├── schema.prisma            # Prisma schema（SQLite）
│   └── fuka.db                 # SQLite 数据库文件
├── prompts/
│   ├── fuka-default.md          # 默认 tsundere 性格
│   └── user-override-example.md # 用户覆盖示例
├── src/
│   ├── core/
│   │   ├── FukaBrain.ts         # 核心调度
│   │   ├── PromptManager.ts     # 性格覆盖合并
│   │   └── index.ts
│   ├── llm/
│   │   └── client.ts            # LLM 调用封装
│   ├── modules/
│   │   ├── PromiseTracker/      # 场景 1
│   │   ├── InterestGraph/       # 场景 2
│   │   └── ProfileGen/          # 场景 3
│   ├── pipeline/
│   │   ├── message.ts           # 消息流处理
│   │   └── storage.ts           # 数据库 CRUD
│   ├── repository/
│   │   └── *.ts                 # Prisma repository 层
│   ├── trigger/
│   │   └── engine.ts            # 触发调度引擎
│   └── types/
│       ├── core.ts
│       └── index.ts
└── tests/                       # 单元测试（按模块独立）
```

## Agent 性格

### 默认：毒舌傲娇型

- **语气**：带点傲娇，该吐槽就吐槽，但内心关心用户
- **主动**：不会一直等着用户问，会主动提醒、主动关心
- **记忆强**：记住用户说过的所有事，尤其是承诺
- **简洁**：话不多，但每句都有信息量

### 用户覆盖机制

用户可以通过 `agents.md` 覆盖 Fuka 的行为字段：

```markdown
# Fuka Override
## 语气
- 更柔和一点
## 主动程度
- 更主动一点
```

可覆盖字段：`tone`、`verbosity`、`extraversion`、`warmth`

## 开发阶段

```
Phase 1: 基础设施 ✅
├── MessagePipeline (消息接入 + 存储)
├── DB Schema + 基础 CRUD (Prisma + SQLite)
└── LLM Interface (消息解析 / 提取 / 生成)

Phase 2: 场景 1 - PromiseTracker ✅
├── PromiseExtractor (承诺提取)
├── PromiseStorage + DueCheck
├── TriggerEngine (定时提醒)
└── PromiseTracker 追问流程已测试

Phase 3: 场景 2 - InterestGraph ✅
├── InterestTagger (兴趣标签提取 + 权重衰减)
├── InterestMatcher (同好匹配)
└── InterestNotifier (匹配通知)

Phase 4: 场景 3 - ProfileGenerator ✅
├── ProfileAnalyzer (活跃时段分析)
├── ProfileGenerator (侧写生成)
├── ConfidenceCalculator (置信度评估)
└── ProfileGen 各子模块已测试

Phase 5: 集成 + CLI ✅
├── FukaBrain 统一调度 (基础框架)
├── CLI 终端界面 (可交互)
├── plugin 插件导出 (openclaw 集成)
└── 各模块单元测试全绿 ✅  ← NEW
```

## Demo 演示命令

```bash
# 承诺追踪 — 追问流程（镜头 2）
pnpm test -- 'PromiseTracker/__tests__/index' --verbose

# 承诺追踪 — 提取器单元测试
pnpm demo:promise

# 兴趣匹配 — 标签权重测试（镜头 3）
pnpm demo:interest

# 人物侧写 — 置信度计算（镜头 4）
pnpm demo:profile:conf

# 人物侧写 — 活跃时段分析
pnpm demo:profile:analyze

# 全部跑一遍
pnpm demo
```

## 快速开始

```bash
cd fuka

# 安装依赖
pnpm install

# 数据库迁移
pnpm run db:migrate

# 构建（TypeScript → JavaScript）
pnpm run build

# 运行 CLI
pnpm run cli

# 代码检查
pnpm run lint
pnpm run lint:fix

# 运行测试
pnpm test
pnpm run test:PromiseTracker
pnpm run test:InterestGraph
pnpm run test:ProfileGen

# 项目健康检查
pnpm run health
pnpm run audit
```

## 技术选型

- **语言**：TypeScript (ESNext)
- **数据库**：SQLite（Prisma + libsql，本地开发友好）
- **ORM**：Prisma
- **LLM**：OpenAI GPT 系列（可通过 `MODEL_NAME` / `API_KEY` 环境变量配置）
- **测试**：Jest

## 参赛信息

- **赛事**：腾讯 PCG 校园 AI 产品创意大赛
- **赛题**：赛题 3 - 用 AI 玩转 QQ 养虾，解锁社交新玩法
- **核心要求**：官方 Agent（非工具化）、主动感知理解、全场景贯穿（单聊/群聊/动态）、被动→主动关怀

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `API_KEY` | `mock` | LLM API 密钥 |
| `MODEL_NAME` | `gpt-4` | LLM 模型名称 |
