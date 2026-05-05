# PromiseTracker 模块规格

## 场景概述

**用户痛点**：答应朋友的事、给过的承诺，当时说了后来忘了，对方觉得自己被放鸽子

**Agent 行为流**：
1. 用户说："帮我记得周末提醒我给小王发那个链接"
2. Agent 记住：[时间] → [提醒内容] → [涉及的人]
3. 到了时间 → Agent 主动推送："你之前说要给小王发链接，还记得吗？"
4. 如果用户没响应，过一段时间再问"做了没"
5. 用户确认完成后标记 completed

**关键能力**：待办事项的跨会话记忆 + 主动触发

---

## 用户交互流程

### 多轮对话模式

```
用户: 帮我记得给小王发链接
  → FukaBrain 意图分类 → PROMISE_CREATE
  → 检查 pending_contexts → 空
  → 调用 PromiseTracker.handle({ intent: 'promise_create', userMessage: '...' })
  → 返回 { type: '追问', question: '发给谁？' }

用户: 小王
  → FukaBrain 路由到 PromiseTracker
  → 返回 { type: '追问', question: '什么时候提醒？' }

用户: 明天下午3点
  → due_time 解析成功
  → 返回 { type: '完成', promise: {...} }
  → pending_context 删除
```

### 追问规则

- follow_up_order = ["content", "target", "due_time"]
- **智能跳过**：LLM extractor 判断某字段是否已在 content 中明确包含，若是则跳过该追问
- **无效回复不计入轮次**：用户模糊回答直接重问，不浪费轮次
- **max_follow_up_rounds = 6**：只有明确回答了某个字段才计入
- content **不允许指代**（如"那个链接"），必须明确，否则追问要求说清楚

### 冲突保护

新意图触发时若存在 pending_context：
```
Fuka: 你还在创建承诺，要放弃并开始新任务吗？
  - 用户说"不要" → 继续原有承诺流程
  - 用户说"好" → 覆盖旧的，开始新流程
  - 用户说"查看进度" → FukaBrain 识别"查看进度"意图，调用 PromiseTracker 获取摘要后展示
```

### 追问文案管理

固定文案放在 `config/copy/promise_questions.md`，支持变量填充：
```markdown
# 追问
content_missing = "要提醒你做什么？"
target_missing = "发给谁？"
due_time_missing = "什么时候提醒？"
invalid_response = "没太理解，能再说一次吗？"
```

---

## 配置 (config/promise.toml)

```toml
[promise]
# 追问顺序
follow_up_order = ["content", "target", "due_time"]

# 最大追问轮次
max_follow_up_rounds = 6

# 上下文超时（秒）
context_timeout = 1800

# 模糊时间 fallback（当用户只说"明天"时）
default_time = "20:00"
default_date = "today"

# 达到最大追问轮次后的行为
on_max_rounds = "fail"   # "fail" | "guess"

# 提醒冷却时间（分钟）：同一条承诺在此时长内不重复推送
reminder_lead_time = 15

# 最大 defer 次数，超过后自动 cancel
max_defer_count = 6

# 已完成/已取消记录的保留天数
retention_days = 30

# /promises list 排序
list_sort_by = "due_time"    # "due_time" | "created_at" | "priority"
list_sort_order = "asc"       # "asc" | "desc"

# 文案模板路径
defer_options_file = "config/copy/promise_defer_options.md"
reminder_template_file = "config/copy/promise_reminder.md"
questions_template_file = "config/copy/promise_questions.md"
```

---

## 数据模型

### Prisma Schema

```prisma
model Promise {
  id             String   @id @default(uuid())
  user_id        String              // 查询时自动加 WHERE user_id = currentUser
  content        String              // "给小王发链接"，不允许指代
  due_time       BigInt              // Unix timestamp
  target         String?             // "小王"（可选）
  status         String   @default("pending")  // pending | deferred | completed | cancelled
  defer_count    Int      @default(0)         // 已推迟次数，达到 6 次后 cancel
  remind_count   Int      @default(0)         // 已提醒次数
  cancel_reason  String?             // "user_cancelled" | "max_defer_reached"
  created_at     BigInt
  last_reminded_at BigInt?           // 上次提醒时间（用于冷却判断）
  updated_at     BigInt
  archive_at     BigInt?             // 归档时间（created_at + retention_days）
}

model PendingContext {
  id             Int      @id @default(autoincrement())
  user_id        String   @default("default")
  intent         String   // "promise_create" | ...
  extracted_data String   // JSON
  last_message   String
  created_at     BigInt
  expires_at     BigInt   // created_at + context_timeout
}
```

### 状态机

```typescript
enum PromiseStatus {
  PENDING = 'pending',     // 待履行，还没到期
  DEFERRED = 'deferred',   // 用户推迟了
  COMPLETED = 'completed', // 用户确认完成
  CANCELLED = 'cancelled'  // 用户取消或达到最大 defer 次数
}

enum CancelReason {
  USER_CANCELLED = 'user_cancelled',     // 用户主动取消
  MAX_DEFER_REACHED = 'max_defer_reached' // 达到最大 defer 次数
}
```

---

## 触发引擎逻辑

```typescript
async function checkDue(timeProvider: TimeProvider) {
  const now = timeProvider.now()
  const duePromises = await promiseRepo.find({
    due_time: { lte: now },
    status: { in: ['pending', 'deferred'] }
  })

  for (const promise of duePromises) {
    // 冷却检查
    if (promise.last_reminded_at &&
        now - promise.last_reminded_at < config.reminder_lead_time * 60 * 1000) {
      continue
    }

    // 检查 defer 次数
    if (promise.defer_count >= config.max_defer_count) {
      await promiseRepo.cancel(promise.id, CancelReason.MAX_DEFER_REACHED)
      continue
    }

    await triggerEngine.remind(promise)
    await promiseRepo.updateLastReminded(promise.id, now)
    await promiseRepo.incrementRemindCount(promise.id)
  }
}
```

**触发规则**：
- `pending` + 到期 → 触发提醒（包含"做了没"询问）
- `deferred` + 到期 → 触发提醒
- `completed` / `cancelled` → 跳过，不触发
- defer 后重新到期：**继续提醒**，提醒需求不变
- defer 次数达到 6 次 → 自动 cancel（cancel_reason = max_defer_reached）

---

## 文案模板

### 提醒文案 (config/copy/promise_reminder.md)

提醒文案同时包含"提醒内容"和"询问是否完成"：

```markdown
你之前说要{target}{content}，还记得吗？做了吗？
```

变量：`{target}`、`{content}`

注意：不告知提醒次数，保持简洁。

### 推迟选项 (config/copy/promise_defer_options.md)

时间从**当前时刻**计算，不是从原定到期时间：

```markdown
- 15分钟后 → 15min
- 明天 → tomorrow
- 下周 → next_week
- 自定义时间 → custom
```

**交互**：
- 选择 A/B/C → 更新 due_time（基于当前时间计算），defer_count + 1，status 保持 deferred
- 选择 D → Fuka 追问具体时间

---

## CLI 命令

| 命令 | 说明 |
|------|------|
| `/promises list` | 列出所有承诺（带颜色，排序可配置） |
| `/promises complete <id>` | 标记完成 |
| `/promises cancel <id>` | 取消承诺 |
| `/promises defer <id> <option>` | 推迟承诺（等同于对话中选择 defer 选项） |
| `/time advance <duration>` | 快进时间（如 `1d`, `2h`） |
| `/time jump <datetime>` | 快进到具体时间 |
| `/context show` | 查看当前 pending context |
| `/context clear` | 清除当前上下文 |
| `/help` | 帮助 |

### /promises list 输出格式

```
[Pending]（黄色高亮）
  (1) 给小王发链接 - 明天 15:00 - 2026-04-30

[Deferred]（橙色高亮）
  (2) 健身 - 原定 2026-04-29 → 新时间 2026-05-01（已推迟 2 次）

[Completed]（绿色高亮）
  (3) 开会 - 2026-04-28 10:00

[Cancelled]（灰色）
  (4) 还书 - 2026-04-25 14:00（已达最大推迟次数）
```

---

## 模块接口

### 与 FukaBrain 的接口

```typescript
// PromiseTracker 被 FukaBrain 调用

interface HandleInput {
  intent: PromiseIntent       // promise_create | promise_list | ...
  userMessage: string         // 原始用户消息
  pendingContext?: PendingContext  // 如果有
  userId: string
}

type HandleOutput =
  | { type: '追问'; question: string; updatedContext: PendingContext }
  | { type: '完成'; promise: Promise }
  | { type: '摘要'; summary: string }  // 查看进度时返回
  | { type: '错误'; message: string }

// src/modules/PromiseTracker/index.ts

export interface PromiseTracker {
  handle(input: HandleInput): Promise<HandleOutput>

  // 直接方法（CLI 或 FukaBrain 需要时调用）
  createPromise(data: PromiseInput): Promise<Promise>
  listPromises(filter?: PromiseFilter): Promise<Promise[]>
  completePromise(id: string, userId: string): Promise<void>
  cancelPromise(id: string, userId: string, reason: CancelReason): Promise<void>
  deferPromise(id: string, userId: string, newDueTime: BigInt): Promise<void>
}

// 意图类型
export enum PromiseIntent {
  CREATE = 'promise_create',
  LIST = 'promise_list',
  COMPLETE = 'promise_complete',
  CANCEL = 'promise_cancel',
  DEFER = 'promise_defer',
  DEFER_CHOICE = 'promise_defer_choice',
}
```

### LLM 调用

PromiseTracker 不直接调用 LLM，而是通过 FukaBrain 提供的接口：

```typescript
// FukaBrain 提供
interface LLMClient {
  extract(intent: string, context: any, userMessage: string): Promise<ExtractedData>
}

// PromiseTracker 内部使用
const extracted = await fukaBrain.llm.extract('promise_create', context, userMessage)
```

---

## 实现文件结构

```
src/modules/PromiseTracker/
├── index.ts              # 导出接口
├── intentHandler.ts      # 意图处理（创建/列表/完成/取消/推迟/查看进度）
├── extractor.ts          # 字段提取逻辑（调用 FukaBrain LLM）
├── repository.ts         # Promise / PendingContext 数据访问
├── poller.ts             # 定时轮询（每分钟 checkDue）
├── notifier.ts           # 发送提醒（调用 FukaBrain.notify）
├── types.ts              # 类型定义
└── config/
    └── copy/
        ├── promise_questions.md       # 追问文案
        ├── promise_reminder.md         # 提醒文案
        └── promise_defer_options.md   # defer 选项
```

---

## 归档策略

- Promise 状态变为 completed 或 cancelled 后，经过 `retention_days`（30 天）后归档
- 归档操作：将 `archive_at` 设置为 `now + retention_days`，定时任务扫描并迁移到 `PromiseArchive` 表
- 用户手动清除：CLI 提供 `/promises clear` 命令物理删除

---

## 已确认决策

| 决策项 | 选择 |
|--------|------|
| **触发机制** | |
| 触发时机 | 主动推送，只要 Agent 在线就发 |
| 提醒机制 | polling（每分钟 checkDue），不走 TriggerEngine |
| Reminder 发送失败 | 标记 last_reminded_at，下次冷却后重试 |
| checkDue 异常处理 | 捕获异常，打印日志，继续下次轮询 |
| **用户交互** | |
| 追问顺序 | content → target → due_time |
| 字段跳过 | LLM 智能判断，如果 content 已包含则跳过 |
| content 粒度 | 不允许指代，必须明确 |
| 无效回复 | 不计入轮次，直接重问（原问题 + 提示） |
| 最大追问轮次 | 6 |
| 上下文超时 | 1800 秒（30 分钟）|
| context 过期处理 | 清除旧 context，智能询问重新开始 |
| 冲突保护 | 用户选择"不要"/"好"/"查看进度" |
| 查看进度展示 | 已填字段 + 待填字段 + [继续创建] [放弃] |
| target 为空 | 隐藏 target 部分，文案自然衔接 |
| **defer 逻辑** | |
| defer 选项时间基准 | 从当前时刻计算，不是原定到期时间 |
| defer 后状态 | pending → deferred，之后保持 deferred |
| 最大 defer 次数 | 6 次后自动 cancel |
| defer_count 计数字段 | 需要 |
| "稍后"语义 | snooze_interval（默认 30 分钟），可配置 |
| **reminder 文案** | |
| remind 文案 | 同时包含提醒和询问是否完成，不告知次数 |
| 到期 vs 推迟语气 | 无区别，保持简洁无负担 |
| Reminder 按钮 | [做了] [稍后] [15分钟后] [明天] [查看详情] |
| 按钮交互（CLI） | 支持 emoji 和数字输入 |
| "查看详情"内容 | promise 内容 + 创建时间 + defer 历史 |
| Reminder promiseId | 暴露 UUID |
| **数据模型** | |
| user_id 隔离 | 现在就实现（Promise 和 PendingContext） |
| cancel_reason | user_cancelled / max_defer_reached |
| remind_count | 需要（记录已提醒次数） |
| archive_at | 需要（归档时间戳） |
| Archive 表结构 | 和 Promise 表一致 |
| **FukaBrain 接口** | |
| 接口模式 | FukaBrain 调用 PromiseTracker.handle() |
| LLM 调用 | FukaBrain 提供，PromiseTracker 不持有 API key |
| Reminder 推送 | 通过 FukaBrain.notify() 发送 |
| userId 传递 | FukaBrain 获取并传递给 PromiseTracker |
| PromiseTracker 初始化 | FukaBrain 统一管理（调用 start()） |
| **归档策略** | |
| retention_days | 30 天 |
| 归档触发 | Agent 启动时 + 定时任务 + 手动命令 |
| 归档后查询 | 单独命令 `/promises archive` |
| 归档数据保留 | 永久保留 |
| 手动清除 | `/promises clear` 物理删除 |
| **CLI** | |
| 命令解析 | 统一发给 FukaBrain 识别意图 |
| list 分页 | 默认显示最近 20 条 |
| list 排序 | due_time asc |
| **配置** | |
| 配置位置 | config/promise.toml |
| reminder_lead_time | 冷却时间（分钟），不是提前量 |
| snooze_interval | "稍后"间隔（分钟），默认 30 |
| **其他** | |
| 日志 | console.log + 可配置 log level |
| TriggerEngine | 保留给其他模块（InterestGraph 等） |
| 测试策略 | 单元测试 + 集成测试 |

(End of file - total 259 lines)