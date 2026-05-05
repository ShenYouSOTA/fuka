# ProfileGen 模块规格

## 场景概述

**用户痛点**：群里加了一个人，但没看过他历史发言，不了解他，不知道怎么破冰

**Agent 行为流**：
1. 有人进群 / 加你好友
2. FukaBrain 主动查询该人过去 N 条群消息
3. FukaBrain 调用 ProfileGen 生成侧写："小李最近在聊装修，话不多但都是干货，喜欢凌晨发消息"
4. FukaBrain 推送："这是小李的速览"

**关键能力**：历史消息聚合 + LLM 侧写生成 + FukaBrain 统一调度

---

## 设计原则

**ProfileGen 是工具，不是大脑。**

FukaBrain 负责：
- 解析用户命令（intent、targetName）
- 查询消息（从 Prisma）
- 决定调用哪个方法
- 组装最终回复

ProfileGen 负责：
- 消息分析（活跃时段、话题提取）
- 侧写生成（LLM 调用）
- 置信度计算
- 数据持久化（Profile CRUD）

---

## 用户交互流程

### 侧写生成时机

```
场景 A：主动请求
用户: 帮我看看小李是什么人
  → FukaBrain 路由，查询小李最近 30 条消息
  → FukaBrain 调用 ProfileGen.generateProfile(messages, "小李")
  → FukaBrain 组装回复

场景 B：被动触发
新成员小李进群
  → FukaBrain 查询小李历史消息
  → FukaBrain 调用 ProfileGen.refreshProfile(messages, "小李")
  → FukaBrain 推送："小李刚进群，这是他的速览"

场景 C：定期更新
长时间未查看 / 用户请求刷新
  → FukaBrain 查询最新消息
  → FukaBrain 调用 ProfileGen.refreshProfile(messages, "小李")
```

### 侧写分层

```
用户: 帮我看看小李
  → Fuka: "这是小李的速览（3 条消息）"
    [展开详细版]
  → 用户点击展开
  → Fuka: "这是小李的详细侧写（30 条消息）"
```

- **速览版**：基于最近 3 条消息，实时生成
- **详细版**：基于最近 30 条消息，置信度评估

---

## 配置 (prompts/profilegen.toml)

```toml
[profile]
# 速览版消息条数
quick_message_count = 3

# 详细版消息条数
detailed_message_count = 30

# 侧写刷新间隔（天）
refresh_interval = 7

# 消息时间范围（天），只分析这个范围内的消息
message_window_days = 30

# 置信度阈值，低于此值不展示
confidence_threshold = 0.5

# 活跃时段计算粒度（小时）
active_hour_bucket = 1
```

---

## 数据模型

### Prisma Schema

```prisma
model profiles {
  id           String   @id
  user_id      String              // 查看者（主用户）
  target_id    String              // 被侧写者
  group_id     String?
  summary      String              // 速览版侧写
  detailed     String?             // 详细版侧写
  confidence   Float               // 置信度 0-1
  message_count Int     @default(0)
  active_hours String  @default("[]")  // JSON: [2, 3, 4]
  top_topics   String  @default("[]")  // JSON: ["装修", "健身"]
  generated_at DateTime @default(now())
  updated_at   DateTime @updatedAt

  @@unique([user_id, target_id])
}
```

注：不存储 ProfileMessage，消息持久化，直接查询 messages 表。

### Repository 接口（Plan A）

```typescript
interface ProfileRepository {
  // 按 (viewerId, targetId) 查找
  find(viewerId: string, targetId: string): Promise<Profile | null>

  // 查找某用户的所有侧写
  findAllByViewer(viewerId: string): Promise<Profile[]>

  // 插入或更新
  upsert(data: Omit<Profile, 'id' | 'generated_at' | 'updated_at'>): Promise<Profile>

  // 删除
  delete(viewerId: string, targetId: string): Promise<void>
}
```

返回的 Profile 领域对象中，`activeHours` 和 `topTopics` 是已反序列化的对象：

```typescript
interface Profile {
  id: string
  userId: string
  targetId: string
  groupId?: string
  summary: string
  detailed?: string
  confidence: number
  messageCount: number
  activeHours: Record<string, number>  // { "02": 5, "14": 3 }
  topTopics: string[]                  // ["装修", "健身"]
  generatedAt: Date
  updatedAt: Date
}
```

---

## 置信度计算

```typescript
function calculateConfidence(messageCount: number, windowDays: number): number {
  // 消息越多越可靠
  const countScore = Math.min(messageCount / 30, 1.0) * 0.7

  // 时间窗口越小越可靠（近期数据更能反映当前状态）
  const recencyScore = Math.max(0, 1 - (windowDays / 30)) * 0.3

  return Math.round((countScore + recencyScore) * 100) / 100
}
```

---

## 侧写生成逻辑

### LLM generate 接口

FukaBrain 的 LLMClient 新增方法：

```typescript
async generate(templateName: string, vars: Record<string, unknown>): Promise<string>
```

模板文件位于 `prompts/{templateName}.md`，变量用 `{varname}` 占位。

### 模板内容

**prompts/profile_summary.md**（速览版）

```markdown
分析以下消息，生成 1-2 句话的侧写：

发言人：{sender_name}
消息：
1. {message_1}
2. {message_2}
3. {message_3}

要求：
- 描述该人的话题偏好、发言风格
- 可以包含活跃时段（如"喜欢凌晨发消息"）
- 不要推测性格，只基于消息内容
- 语气符合 Fuka 性格（毒舌傲娇）
- 限 50 字以内
```

**prompts/profile_detailed.md**（详细版）

```markdown
分析以下消息，生成详细侧写：

发言人：{sender_name}
消息（{count} 条）：
{messages}

要求：
- 话题偏好（最常聊什么）
- 发言风格（话多/话少、干货型/闲聊型）
- 活跃时段（如凌晨/下午）
- 值得关注的特点（如有）
- 语气符合 Fuka 性格
- 限 150 字以内
```

---

## 模块接口

### ProfileGen 导出方法

```typescript
export class ProfileGen {
  constructor(
    private prisma: PrismaClient,
    private llm: LLMClient
  ) {}

  // 生成或更新侧写（基于传入的消息）
  async generateProfile(
    messages: Message[],
    targetName: string
  ): Promise<Omit<Profile, 'userId'>>

  // 刷新侧写（强制重新生成）
  async refreshProfile(
    messages: Message[],
    targetName: string
  ): Promise<Omit<Profile, 'userId'>>

  // 获取某用户的所有缓存侧写
  async listProfiles(viewerId: string): Promise<Profile[]>

  // 清除某条侧写缓存
  async clearProfile(targetId: string, viewerId: string): Promise<void>
}
```

### 与 FukaBrain 的协作流程

```typescript
// FukaBrain 内部
async handleProfileQuery(targetName: string) {
  // 1. FukaBrain 查询消息
  const messages = await this.storage.getRecentMessages(targetName, 30)

  // 2. FukaBrain 调用 ProfileGen
  const profile = await this.profileGen.generateProfile(messages, targetName)

  // 3. FukaBrain 组装回复
  return `这是${targetName}的速览：${profile.summary}`
}
```

---

## 实现文件结构

```
src/modules/ProfileGen/
├── index.ts              # 导出 ProfileGen 类
├── analyzer.ts          # 消息分析（活跃时段、话题聚合）
├── generator.ts          # 侧写生成（LLM 调用）
├── confidence.ts         # 置信度计算
├── repository.ts         # Profile CRUD（依赖 Prisma）
└── types.ts              # 领域类型定义

prompts/
├── profile_summary.md    # 速览版 prompt 模板
└── profile_detailed.md  # 详细版 prompt 模板
```

---

## 已确认决策

| 决策项 | 选择 |
|--------|------|
| 消息来源 | 消息持久化，直接查 messages 表，不存 ProfileMessage |
| Schema | profiles 加 target_id/detailed；@@unique([user_id, target_id]) |
| Repository 接口 | Plan A（单独方法：find/findAllByViewer/upsert/delete） |
| activeHours/topics | 反序列化后的对象，不暴露 JSON string |
| 依赖管理 | FukaBrain 统一注入（prisma + llm） |
| 模板文件位置 | prompts/ 目录 |
| ProfileGen 定位 | FukaBrain 是大脑，ProfileGen 是工具 |
| 命令解析 | FukaBrain 解析命令并调用对应方法 |
| 消息来源 | FukaBrain 查好传入，ProfileGen 不直接查 Prisma |
| 置信度公式 | countScore (70%) + recencyScore (30%) |