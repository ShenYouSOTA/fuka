# InterestGraph 模块规格

## 场景概述

**用户痛点**：群里每天消息刷屏，真正感兴趣的人被淹没了

**核心定位**：Fuka 是主用户的私人 agent，一对一服务。群里其他人（小李、小王）不是 Fuka 用户，只是被观察的群友。撮合是单向的——Fuka 向主人汇报，主人决定是否接触，对方无感知。

**Agent 行为流**：
1. Fuka 持续分析群消息，提取每个群友的兴趣标签
2. 用户聊「健身」，群友小李也聊「健身」→ 匹配成功
3. Fuka 推送："群里还有 2 个人也聊这个健身"（匿名）
4. 用户说"好" → Fuka 透露"是小李"，提供选项：立即搭话 / 等话题再提醒

---

## 用户交互流程

### 撮合推送

```
Fuka: 群里还有 2 个人也聊「健身」
  - 小李（高频，凌晨发消息）
  - 要认识吗？

用户: 好
  → Fuka 透露身份："小李"
  → 提供选项：
    A) 立即搭话：生成破冰话术
    B) 等话题再提醒：下次群里有健身话题我再提醒你

用户: 不用了
  → 记录兴趣偏好，下次有新动态再推送
```

### 身份透露时机（可配置）

- `immediate`：Fuka 汇报时就告诉你具体是谁
- `on_accept`（默认）：你点"好"之后才透露是谁
- `manual`：你得主动说"/match reveal 1"才透露

### 撮合选项（可配置）

```toml
[notification]
reveal_timing = "on_accept"  # 透露时机
reveal_options = ["immediate", "defer"]  # 透露后的选项
```

---

## 配置 (config/interestgraph.toml)

```toml
[interest]
# 兴趣标签最小出现次数（才计入）
min_mention_count = 3

# 话题保鲜期（天），无新消息后降权
interest_ttl = 14

# 降权比例（每次过期降权多少）
decay_weight = 0.5

# 兴趣匹配阈值（0-1）
match_threshold = 0.6

[notification]
# 推模式：发现新撮合机会是否主动推
push_enabled = true

# 拉模式：最大返回条数
max_list_items = 10

# 身份透露时机：immediate | on_accept | manual
reveal_timing = "on_accept"

# 透露后提供的选项：immediate(立即搭话) | defer(等话题)
reveal_options = ["immediate", "defer"]

[scan]
# 定时扫描间隔（毫秒）
interval_ms = 3600000  # 1小时

[copy]
# 文案模板路径
match_template_file = "config/copy/interest_match.md"
intro_template_file = "config/copy/interest_intro.md"
```

---

## 数据模型

### Prisma Schema

```prisma
// 主用户的兴趣（主动管理）
model Interest {
  id             String   @id @default(uuid())
  user_id        String              // 主用户
  group_id       String
  topic          String              // "健身"、"装修"
  weight         Float    @default(1.0)
  last_mentioned BigInt
  created_at     BigInt
  updated_at     BigInt
}

// 群友的兴趣（观察所得，主用户只读）
model GroupMemberInterest {
  id             String   @id @default(uuid())
  user_id        String              // 群友
  group_id       String
  topic          String
  weight         Float    @default(1.0)  // 群友自己的活跃度，不是主用户的观察权重
  last_mentioned BigInt
  message_count  Int      @default(0)
  created_at     BigInt
  updated_at     BigInt
}

// 撮合记录
model InterestMatch {
  id              String   @id @default(uuid())
  user_id         String              // 主用户
  matched_user_id String              // 群友
  group_id        String
  interest        String              // 共同兴趣
  status          String   @default("suggested")
  // suggested: 已推送，待用户确认
  // revealed: 用户点了"好"，身份已透露
  // completed: 撮合成功（用户去搭话了）
  // declined: 用户拒绝
  action          String?             // accepted | declined（用户行为）
  revealed_at     BigInt?
  created_at      BigInt
  updated_at      BigInt
}

// 群消息（用于兴趣提取）
model GroupMessage {
  id             String   @id @default(uuid())
  group_id       String
  sender_id      String
  sender_name    String
  content        String
  timestamp      BigInt
}
```

### 状态机

```
suggested
    │
    ├── accepted ──→ revealed ──→ completed
    │
    └── declined ──→ declined
```

用户行为（`action`）：
- `accepted`：用户在 suggested 阶段点了"好"
- `declined`：用户说"不用了"

状态（`status`）：
- `suggested`：已推送，待用户确认
- `revealed`：身份已透露（用户点了"好"，或 reveal_timing=immediate）
- `completed`：用户实际去搭话了
- `declined`：用户拒绝

---

## 兴趣提取逻辑

### 关键词提取流程

```
1. 定时任务触发 scanLoop
2. 拉取群历史新消息
3. 对每条消息调用 LLM 提取兴趣关键词
4. 更新 GroupMemberInterest 表（increment message_count, update last_mentioned）
5. 权重衰减检查：超过 interest_ttl 无新消息 → weight *= decay_weight
6. 检查是否有新撮合机会
7. 如 push_enabled=true，主动推送给用户
```

### LLM 提取 prompt

```typescript
const extractPrompt = `
分析以下消息，提取用户兴趣关键词（名词/短语）：

消息："{content}"
发言人：{sender_name}

要求：
- 只返回兴趣关键词，逗号分隔
- 过滤掉常见无意义词（我、你、他、这个、那个）
- 最多返回 5 个关键词
- 如无明确兴趣，返回空
`
```

---

## 匹配引擎逻辑

```typescript
async function checkNewMatches(timeProvider: TimeProvider) {
  // 1. 获取主用户在高权重兴趣（active 的，不在衰减中的）
  const userInterests = await interestRepo.findActive(userId)

  // 2. 对每个兴趣搜索有相同标签的群友
  for (const interest of userInterests) {
    const matches = await groupMemberInterestRepo.findByTopic(interest.group_id, interest.topic)

    // 3. 过滤已达到阈值的匹配
    for (const matched of matches) {
      if (matched.weight >= config.match_threshold) {
        // 4. 检查是否已存在 suggested/revealed 状态
        const existing = await matchRepo.findPending(userId, matched.user_id, interest.topic)
        if (!existing) {
          // 5. 创建 suggested 撮合记录
          await matchRepo.create({
            user_id: userId,
            matched_user_id: matched.user_id,
            group_id: interest.group_id,
            interest: interest.topic,
            status: 'suggested',
          })
        }
      }
    }
  }
}
```

**匹配规则**：
- 主用户的兴趣和群友的兴趣按相同 topic 匹配
- 群友的 weight 是其自身活跃度，不低于阈值即可匹配
- 单向撮合，不需要对方确认

---

## 触发引擎逻辑

### 推模式（主动推送）

```typescript
async function notifyPendingMatches() {
  // 扫描所有 suggested 状态且未推送过的撮合
  const pending = await matchRepo.findUnnotified()

  for (const match of pending) {
    if (config.push_enabled) {
      await triggerEngine.notifyMatch(match)
      await matchRepo.markNotified(match.id)
    }
  }
}
```

### 拉模式（用户查询）

```typescript
// /match list
async function listMatches(userId: string): Promise<MatchResult[]> {
  return await matchRepo.findByUser(userId, {
    limit: config.max_list_items,
    statusFilter: ['suggested', 'revealed']
  })
}
```

### 定时扫描（InterestGraph 内部）

```typescript
class InterestGraph {
  private scanInterval?: NodeJS.Timeout;

  startScanLoop(intervalMs?: number): void {
    const ms = intervalMs ?? config.scan.interval_ms;
    this.scanInterval = setInterval(() => {
      this.scanNewMessages().catch(console.error);
      this.checkNewMatches().catch(console.error);
      this.notifyPendingMatches().catch(console.error);
      this.decayStaleInterests().catch(console.error);
    }, ms);
  }

  stopScanLoop(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = undefined;
    }
  }
}
```

FukaBrain 启动时调用 `interestGraph.startScanLoop()` 即可。

---

## 衰减引擎逻辑

### 时间衰减（懒检查 + 定时兜底）

```typescript
async function decayStaleInterests() {
  const cutoff = Date.now() - config.interest_ttl * 86400 * 1000;

  // 1. 懒检查：用户查询时顺便检查
  // 2. 定时兜底：每 scanLoop 跑一次
  await groupMemberInterestRepo.decayIfStale(cutoff, config.decay_weight);
}
```

规则：
- 超过 `interest_ttl` 天无新消息 → `weight *= decay_weight`
- weight 衰减到低于阈值（如 0.1）时，不参与匹配

---

## 意图接口

### FukaBrain → InterestGraph

```typescript
interface HandleInput {
  intent: InterestIntent
  userMessage?: string          // 原始消息（用于 /interests list 等）
  matchId?: string              // 撮合 ID（用于 accept/decline/reveal）
  userId: string
}

type HandleOutput =
  | { type: '列表'; matches: InterestMatch[] }
  | { type: '推送'; notifications: MatchNotification[] }
  | { type: '透露'; match: InterestMatch; options: RevealOption[] }
  | { type: '完成'; message: string }
  | { type: '追问'; question: string }
  | { type: '错误'; message: string }

enum InterestIntent {
  LIST = 'match_list',           // /match list - 查看撮合列表
  REVEAL = 'match_reveal',        // 透露身份（用户点了"好"）
  DECLINE = 'match_decline',      // 用户拒绝撮合
  ACCEPT = 'match_accept',        // 接受撮合（生成破冰话术？）
  INTERESTS_LIST = 'interests_list',  // /interests list - 查看自己的兴趣标签
  INTERESTS_CLEAR = 'interests_clear', // /interests clear <keyword>
}

interface MatchNotification {
  matchId: string
  interest: string
  matchedCount: number
  matchedUsers: { name: string; hint: string }[]  // 匿名
}

interface RevealOption {
  type: 'immediate' | 'defer'
  label: string
  action: string
}
```

### 内部类接口

```typescript
// src/modules/InterestGraph/index.ts

export class InterestGraph {
  handle(input: HandleInput): Promise<HandleOutput>

  // 定时扫描（由 FukaBrain 调用启动）
  startScanLoop(intervalMs?: number): void
  stopScanLoop(): void

  // 内部组件
  private tagger: InterestTagger
  private matcher: InterestMatcher
  private notifier: InterestNotifier
}

// 独立组件（供内部调用）
export class InterestTagger {
  async extract(groupId: string, message: GroupMessage): Promise<InterestTag[]>
}

export class InterestMatcher {
  async findMatches(groupId: string, userId: string): Promise<MatchResult[]>
}

export class InterestNotifier {
  async notifyMatch(match: InterestMatch): Promise<void>
}
```

### LLM 调用

InterestGraph 通过 FukaBrain 提供的方式调用 LLM：

```typescript
const keywords = await fukaBrain.llm.extractInterest({
  content: message.content,
  sender: message.sender_name
})
```

---

## CLI 命令

| 命令 | 说明 |
|------|------|
| `/interests list` | 列出当前用户的兴趣标签（带权重） |
| `/interests clear <keyword>` | 清除某个兴趣标签 |
| `/match list` | 查看兴趣撮合状态 |
| `/match reveal <id>` | 手动透露某个撮合的身份 |
| `/match accept <id>` | 接受撮合（生成破冰话术） |
| `/match decline <id>` | 婉拒撮合 |
| `/help` | 帮助 |

---

## 实现文件结构

```
src/modules/InterestGraph/
├── index.ts              # 导出接口 InterestGraph + 组件
├── intentHandler.ts      # 意图处理（handle 方法路由）
├── tagger.ts             # InterestTagger - 兴趣提取
├── matcher.ts            # InterestMatcher - 匹配引擎
├── notifier.ts           # InterestNotifier - 触发通知
├── repository.ts         # 数据访问层
├── triggerEngine.ts      # 触发引擎（scanLoop）
├── decayEngine.ts        # 衰减引擎
├── types.ts              # 类型定义
└── config/
    ├── interestgraph.toml     # 主配置
    └── copy/
        ├── interest_match.md       # 撮合通知文案
        └── interest_intro.md       # 破冰介绍文案
```

---

## 已确认决策

| 决策项 | 选择 |
|--------|------|
| Fuka 角色 | 主用户的私人 agent，一对一服务；群友是被观察对象 |
| 撮合模式 | 单向撮合，对方无感知 |
| 身份透露 | 先匿名（on_accept 才透露），可配置 immediate/manual |
| 透露后选项 | 立即搭话 / 等话题再提醒，toml 配置 |
| 撮合状态 | suggested → revealed → completed，状态+行为分离 |
| 群友兴趣存储 | 群友是主体，group_id 隔离 |
| 主用户兴趣 | 单独一张表，不和群友混用 |
| 群友权重 | 代表群友自身的活跃度，不反映主用户的观察频率 |
| 消息来源 | 定时轮询，InterestGraph 内部 setInterval |
| 调度触发 | FukaBrain 调 startScanLoop() 启动 |
| 意图路由 | FukaBrain 解析完再调 InterestGraph |
| 推拉模式 | 混合——定时扫描推，也响应用户查询 |
| 权重衰减 | 时间驱动（interest_ttl 天无新消息 weight *= decay_weight） |
| 衰减检查 | 懒检查 + 定时兜底混合 |
| 匹配阈值 | 群友 weight >= match_threshold |