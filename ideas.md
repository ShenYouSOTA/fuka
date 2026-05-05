# Fuka - QQ AI Agent 创意讨论

## 赛事背景

**赛题 3：用 AI 玩转 QQ 养虾，解锁社交新玩法**

核心要求：
- 官方 Agent（非工具化）
- 主动感知与理解
- 全场景贯穿（单聊/群聊/动态）
- 范式转变：被动响应 → 主动关怀

---

## 三个核心场景

### 场景 1：说过的事忘了做

**用户痛点**：答应朋友的事、给过的承诺，当时说了后来忘了，对方觉得自己被放鸽子

**Agent 行为流**：
1. 用户说："帮我记得周末提醒我给小王发那个链接"
2. Agent 记住：[时间] → [提醒内容] → [涉及的人]
3. 到了时间 / 检测到相关对话 → Agent 推送："你之前说要给小王发 xx，还记得吗？"

**关键能力**：待办事项的跨会话记忆 + 时机触发

**改进方向**：
- 自动优先级：涉及他人的承诺 > 单纯给自己立的 flag
- 主动确认而非被动提醒
- 取消/修改机制

---

### 场景 2：群里有共同话题的人，错过了

**用户痛点**：群里每天消息刷屏，真正感兴趣的人被淹没了

**Agent 行为流**：
1. Agent 持续分析群消息，提取每个人的兴趣标签
2. 用户 A 聊「健身」，用户 B 也聊「健身」→ 匹配成功
3. Agent 推送："你在意健康健身的同好，小李也在聊这个，要介绍认识吗？"

**关键能力**：群消息的持续分析 + 兴趣匹配 + 主动通知

**改进方向**：
- 双向匿名撮合：不透露是谁，只说"有个也聊健身的"，降低社交压力
- 引入"话题保鲜期"：聊装修聊了两周突然不聊了，标签自动降权
- 匹配后破冰话术直接生成，不只是通知

---

### 场景 3：新加的人，快速得到他的侧写

**用户痛点**：群里加了一个人，但没看过他历史发言，不了解他，不知道怎么破冰

**Agent 行为流**：
1. 有人进群 / 加你好友
2. Agent 分析该人过去 N 条群消息
3. 生成侧写："小李最近在聊装修，话不多但都是干货，喜欢凌晨发消息"
4. 推送给用户："这是小李的速览"

**关键能力**：历史消息聚合 + LLM 侧写生成 + 实时性

**改进方向**：
- 侧写分层：速览版（3 条）+ 详细版（N 条），用户自选
- 增加"可靠性指标"："根据近 30 条消息推断，置信度：中"
- 侧写不只是文字，可以是关键词云 + 活跃时段 + 话题偏好雷达图

---

## 核心决策

### Demo 形态
- **Phase A (当前)**：纯 CLI，模拟消息输入，时间快进演示
- **Phase B (后续)**：接真实 QQ 机器人，需要 token + 开放平台审核
- **评判重点**：更重创意，Demo 需要可行

### 数据库
- **Demo 阶段**：SQLite，单文件，无需安装，开箱即用
- **生产环境**：PostgreSQL 生产级
- **迁移策略**：SQLite Schema 与 PostgreSQL Schema 一致，后续可无缝切换
- **ORM**：Prisma（切换数据库只需改 `provider` 字段）

### 数据库 ORM 决策
| 决策项 | 选择 | 原因 |
|--------|------|------|
| ORM | Prisma | 切换 PG 零成本、内置 JSONB 支持、类型安全 |
| 存储层隔离 | Repository 模式 | 切换 DB 时只改实现层，不动业务逻辑 |

### TimeProvider 抽象
- **设计**：TimeProvider 接口，支持真实时间和模拟时间切换
  ```typescript
  interface TimeProvider {
    now(): Date
    advance(duration: Duration): void  // Demo 用，快进时间
  }
  ```
- **Demo 环境**：mockClock，手动快进时间演示"主动提醒"
- **生产环境**：realClock，用 node-cron 定时触发
- **好处**：triggerEngine 逻辑不变，只需换 TimeProvider

### 数据库 Schema 更新（Demo vs 生产）
```sql
-- Demo: SQLite（单文件，即开即用）
-- 生产: PostgreSQL（生产级存储）
-- Schema 一致，切换成本低
```

---

## 开发阶段规划（修订版）

```
Phase 1: 基础设施
├── Prisma + SQLite（DB Schema + CRUD）
├── MessagePipeline (CLI 模拟消息输入)
└── LLM Interface (消息解析 / 提取 / 生成)

Phase 2: 场景 1 - PromiseTracker（Demo 优先）
├── PromiseExtractor
├── PromiseStorage + DueCheck
├── TriggerEngine (时间抽象 + 快进演示)
└── FukaBrain → CLI 提醒输出

Phase 3: 场景 2 - InterestGraph
...

Phase 4: 场景 3 - ProfileGen
...

Phase 5: 集成 + 真实 QQ 接入
```

### pending_contexts 表设计
```sql
CREATE TABLE pending_contexts (
  id INTEGER PRIMARY KEY,
  user_id TEXT DEFAULT 'default',
  intent TEXT,              -- 'promise_create' / 'interest_match' / ...
  extracted_data TEXT,      -- JSON: 已提取的部分信息
  last_message TEXT,
  created_at INTEGER,
  expires_at INTEGER        -- 30 分钟超时自动清理
);
```
- **user_id**: Demo 阶段硬编码 `default_user`，不需要多用户
- **同时只能有一个 pending_context**
- **冲突保护**：新意图触发时若存在 pending_context，Fuka 询问：
  - "你还在创建承诺，要放弃并开始新任务吗？"
  - 用户可选择"不要"/"好"/"查看进度"

---

### 文案配置结构
```
config/
├── promise.toml           # promise 相关配置
├── copy/                  # 文案模板（各场景通用）
│   ├── promise_reminder.md
│   ├── promise_defer_options.md
│   ├── interest_match.md
│   └── profile_summary.md
```

文案支持变量替换：`{target_person}`、`{content}` 等

---

## 模块详细规格

各场景的完整规格文档：

| 模块 | 规格文档 | 状态 |
|------|----------|------|
| **PromiseTracker** | [fuka/docs/PromiseTracker.md](./fuka/docs/PromiseTracker.md) | 已完成 |
| **InterestGraph** | 待 Phase 3 编写 | 待完成 |
| **ProfileGen** | 待 Phase 4 编写 | 待完成 |
| **FukaBrain** | 统一调度逻辑，见下方架构设计 | 进行中 |

---

## 已确认决策

| 决策项 | 选择 | 原因 |
|--------|------|------|
| Demo 形态 | CLI (Phase A) | 今天能跑通，后续接真实 QQ |
| 数据库 | SQLite (Demo) | 无需安装，切换成本低 |
| ORM | Prisma | 切换 PG 零成本、类型安全 |
| 时间触发 | 快进时间 + TimeProvider 抽象 | Demo 演示价值最大化，可 scale |
| 存储层模式 | Repository 抽象 | 切换 DB 只改实现层 |
| LLM | FukaBrain 统一调度 + MiniMax M2.7 | 智能路由日后再细化 |
| 用户输入 | 混合模式（自由文本 + 反问） | 最自然，体现主动关怀 |
| 多轮状态 | SQLite pending_contexts 表 | 便于用户管理，支持 /history |
| 上下文过期 | 30 分钟 | 足够完成一次多轮对话 |
| 冲突处理 | 智能询问覆盖保护 | 避免用户意外丢失进度 |
| 时间解析 | Fuka 追问精确时间 | 避免模糊导致的问题 |
| 兴趣匹配 | Embedding 相似度 | 精确标签匹配无法发现"健身"和"跑步"相关，需向量检索 |
| 兴趣衰减 | 30 天冷处理 | 兴趣长期不提及自动降权，减少噪音 |

### Agent 命名
**Fuka**（女仆概念）

### Agent 性格
**毒舌傲娇型**（默认），可被用户 agents.md 覆盖

性格定义：
- 语气：带点傲娇，该吐槽就吐槽，但内心关心用户
- 主动：不会一直等着用户问，会主动提醒、主动关心
- 记忆强：记住用户说过的所有事，尤其是承诺
- 简洁：话不多，但每句都有信息量

---

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
| `InterestGraph` | 群消息分析、兴趣标签提取、**语义匹配** | 场景 2 |

### InterestGraph 语义匹配设计（参考 MemoryOS/Khoj）

```
用户 A 兴趣：[健身, 跑步]
用户 B 兴趣：[健身, 游泳]

精确匹配 → 无匹配（标签不同）
语义匹配 → "健身"相似度高 → 匹配成功
```

实现方案：
- 兴趣标签存储时额外存储 embedding 向量
- 匹配时计算 cosine similarity，阈值 > 0.7 视为相关
- 支持话题层级：运动 → 健身/跑步/游泳（更泛化的匹配）
| `ProfileGen` | 人物侧写生成、置信度评估 | 场景 3 |
| `TriggerEngine` | 时间/上下文/主动触发调度 | 三场景共用 |
| `MessagePipeline` | QQ 消息流接入、解析、存储 | 基础设施 |
| `FukaBrain` | LLM 调度、意图分发、统一回复 | 核心胶水 |
| `Repository` | 数据存储抽象层 | 基础设施 |

### 数据库 Schema

```sql
-- 消息存储
CREATE TABLE messages (...);

-- 承诺记录
CREATE TABLE promises (...);

-- 兴趣标签
CREATE TABLE interests (...);

-- 人物侧写
CREATE TABLE profiles (...);

-- 兴趣匹配记录
CREATE TABLE interest_matches (...);

-- 触发日志
CREATE TABLE trigger_logs (...);
```

### Prompt 合并策略

```
Fuka 默认性格 (prompts/fuka-default.ts)
        ↓
[用户 agents.md] 覆盖字段 → name, instructions, tone, verbosity
        ↓
合并后的完整 Prompt → 发给 LLM
```

用户可覆盖字段：`tone`、`verbosity`、`extraversion`、`warmth`

---

## 项目结构

```
fuka/
├── package.json
├── tsconfig.json
├── README.md
├── prisma/
│   └── schema.prisma        # Prisma Schema（SQLite/PG 切换在这里改）
├── cli/
│   └── index.js
├── prompts/
│   ├── fuka-default.md
│   └── user-override-example.md
├── src/
│   ├── core/
│   │   ├── FukaBrain.ts
│   │   ├── PromptManager.ts
│   │   └── index.ts
│   ├── llm/
│   │   └── client.ts
│   ├── modules/
│   │   ├── PromiseTracker/
│   │   ├── InterestGraph/
│   │   └── ProfileGen/
│   ├── pipeline/
│   │   ├── message.ts
│   │   └── storage.ts
│   ├── repository/          # Repository 抽象层
│   │   ├── interfaces.ts
│   │   └── sqlite.repository.ts
│   ├── trigger/
│   │   └── engine.ts
│   └── types/
│       ├── core.ts
│       └── index.ts
└── tests/
    ├── PromiseTracker/
    ├── InterestGraph/
    └── ProfileGen/
```
