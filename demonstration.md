# Fuka Demo 演示方案

> 腾讯 PCG 校园 AI 产品创意大赛 · 赛题 3 · 用 AI 玩转 QQ 养虾
> 3 分钟录制视频脚本

---

## 产品定位

**Fuka 是一个 OpenClaw 插件**，设计为开箱即用的 QQ 社交 AI Agent。

```
┌─────────────────────────────────────────────────────────┐
│                      OpenClaw                           │
│          （插件运行时 / 消息路由 / 生命周期管理）            │
└─────────────────────────────────────────────────────────┘
                           ↑
                    Fuka Plugin
         （承诺追踪 / 兴趣匹配 / 人物侧写）
```

**产品一句话定位**：智能社交统筹，让用户登场游刃有余，人情往来不累。

基于 QQ 消息流，主动追踪承诺、匹配同好、生成人物侧写，把社交记忆从「被动查询」变成「主动服务」。

---

## 三个核心场景

| 场景 | 旧体验 | Fuka 体验 | 核心模块 |
|------|--------|-----------|----------|
| 情感关怀 | 想关心但一拖就忘 | 承诺自动提取 + 到期触发提醒 | PromiseTracker |
| 兴趣匹配 | 群里刷屏，有趣的人被淹没 | 消息流分析，兴趣同好自动推送 | InterestGraph |
| 人物侧写 | 加了新人不知道说什么 | 分析历史发言，生成一句话侧写 | ProfileGen |

---

## 录制方案：测试用例 + 现场解说

> **核心思路**：用 Jest 测试输出作为演示载体，每个模块跑一个代表性测试用例。
> 优点：证明代码能跑、边界清晰、模块独立可验证。
> 缺点：需要配合口播解说，不能完全裸跑。

---

## 分镜设计（共 3 分钟）

### 镜头 1：开场（0:00–0:20）

**画面**：展示 README.md 开头，或 Fuka CLI 启动的欢迎信息。

**口播**：
> "Fuka 是一个 OpenClaw 插件，QQ 社交 AI Agent。
> 它不只是聊天，而是主动帮你管理社交关系——
> 情感关怀不遗漏、兴趣同好不错过、登场有底气。"

---

### 镜头 2：情感关怀承诺追踪（0:20–1:00）

**运行命令**：

```bash
pnpm test -- 'PromiseTracker/__tests__/index' --verbose
```

**输出示例**（Jest 会高亮 PASS）：

```
✓ returns 追问 when content is missing
✓ asks next field even when first message has some info
✓ continues context when user says 不要 via DEFER_CHOICE
✓ starts new context when user says 好 via DEFER_CHOICE
```

**口播**：
> "情感关怀承诺追踪，这是现在唯一跑通了的场景。
> 用户说'记得提醒朋友健身'，Fuka 马上跟进：'发给谁？''什么时候？'
> 用户回答完，承诺存进数据库，定时触发，到期推送。
> 中间经历多轮对话、意图识别、存储——这些都跑通了。"

---

### 镜头 3：兴趣匹配（0:55–1:30）

**运行命令**：

```bash
pnpm test -- --testPathPattern=InterestGraph/tagger --verbose
```

**输出示例**：

```
✓ InterestTagger > updateWeight returns 0.1 for no existing weight and 1 mention
✓ InterestTagger > updateWeight weight plateaus toward 1.0 with many mentions
```

**口播**：
> "兴趣匹配。代码基本写完了，但还没完全接进 FukaBrain。
> InterestTagger：群消息进来，自动打标签，比如提到 Rust、Python 就打个'编程'。
> InterestNotifier：理论上能推送，但现在 brain 传空值，推不了。
> InterestMatcher：findMatches 直接 throw NotImplemented，还没写 repository 支持。
> 跑这个 tagger 测试能过，说明匹配逻辑本身是对的——只是数据库那层还没接上。"

---

### 镜头 4：人物侧写（1:25–2:00）

**运行命令**：

```bash
pnpm test -- --testPathPattern=ProfileGen --testNamePattern="ConfidenceCalculator" --verbose
```

**输出示例**：

```
✓ ConfidenceCalculator > returns medium confidence for 20 messages
✓ ConfidenceCalculator > high confidence with 30+ messages
```

**口播**：
> "人物侧写。三个子模块各写各的，但都没有真正接进 FukaBrain。
> ProfileAnalyzer：统计活跃时段，看这个人几点上线。
> ProfileGenerator：调 LLM 生成文字，但 LLM 现在是 mock 状态。
> ConfidenceCalculator：这个测试在验证置信度公式——消息越多、窗口越近，分数越高。
> FukaBrain.handleProfileQuery 目前只有一行占位：'让我想想你是怎样的人～'。需要 PrismaClient 才能真正跑通。"

---

### 镜头 5：架构说明（1:55–2:40）

**画面**：展示插件架构图（在终端里用文字展示）

```
┌─────────────────────────────────────────────────────────┐
│                      OpenClaw                           │
│          （插件运行时 / 消息路由 / 生命周期管理）            │
└─────────────────────────────────────────────────────────┘
                           ↑
                    Fuka Plugin
         （承诺追踪 / 兴趣匹配 / 人物侧写）
```

**口播**：
> "架构上，Fuka 是 OpenClaw 的一个插件。
> 三个场景各自独立：PromiseTracker 管情感关怀，InterestGraph 管兴趣匹配，ProfileGen 管人物侧写。
> 目前只有 PromiseTracker 真正接通了 FukaBrain。handleInterest 调了 InterestTagger，但 matcher 那块没写 repository 支持，通知链等于断了。handleProfileQuery 是占位状态。
> 数据库是 SQLite 加 Prisma，但 ProfileGen 需要的 PrismaClient 还没传进去。LLM client 也是 mock 状态。
> 结构是对的，缺的是收尾那几步。"

---

### 镜头 6：下一步（2:35–3:00）

**口播**：
> "现状：Phase 5 集成中，三个场景代码都写完了，但只有情感关怀场景完全跑通。
> 接下来先把 InterestMatcher 的 repository 层补全，然后把 ProfileGen 真正接进去——需要 PrismaClient。
> 然后把 LLM mock 换成真实 API，意图解析和侧写生成才能真正 work。
> 这两件事搞定之后，再接 QQ 机器人消息流（go-cqhttp 或者 NapCat WebSocket），Fuka 就能真正主动服务了。"

**画面**：可以是终端里打印一行：

```
FukaBrain.start()  // 等待 QQ 消息接入...
```

---

## 命令汇总（快速复制）

```bash
# 情感关怀承诺追踪 — 追问流程
pnpm test -- 'PromiseTracker/__tests__/index' --verbose

# 情感关怀承诺追踪 — 提取器单元测试
pnpm demo:promise

# 兴趣匹配
pnpm demo:interest

# 人物侧写 — 置信度
pnpm demo:profile:conf

# 人物侧写 — 活跃分析
pnpm demo:profile:analyze

# 全部跑一遍（不推荐，输出太长）
pnpm demo
```

---

## 备选方案：纯 CLI 演示

> 如果评委想看界面而不是测试，可以改 CLI 加 `--demo promise` 这类模式。
> 现在 FukaBrain.handlePromise 已经完整；handleInterest 调了 InterestTagger，matcher 那块还没写 repository 支持；handleProfileQuery 是占位状态。"

---

## 讨论结论

- **比赛赛道**：赛题 3 — 用 AI 玩转 QQ 养虾，核心考察 Agent 主动性 + 场景贯穿
- **开源发布**：.ospec/ 等开发工具不进入开源包（已加入 .gitignore）
- **Demo 载体**：Jest 测试输出 + 口播解说，兼顾"代码能跑"和"叙事清晰"
- **当前接入状态**：
  - PromiseTracker → FukaBrain.handlePromise ✅ 完整接通
  - InterestGraph → FukaBrain.handleInterest 🔶 部分接通（InterestTagger 可用，Matcher 未实现 repository）
  - ProfileGen → FukaBrain.handleProfileQuery 🔶 占位代码，待注入 PrismaClient
- **下一步**：完成 InterestMatcher repository 支持 → ProfileGenerator 完整接入 → 换掉 LLM mock → 接入 QQ 机器人消息流

---

## 项目状态概览（演示前必读）

| 模块 | 代码 | 接入 | 现状 |
|------|------|------|------|
| PromiseTracker | 完成 | ✅ 全通 | 多轮追问、存储、触发链路跑通 |
| InterestTagger | 完成 | ✅ 调用 | tagger 测试全绿 |
| InterestMatcher | 有代码 | ❌ | findMatches 需 repository 支持 |
| InterestNotifier | 完成 | 🔶 | brain 参数可选但未传，通知链断 |
| ProfileGenerator | 有代码 | ❌ | handleProfileQuery 是占位，缺 PrismaClient |
| ProfileAnalyzer | 完成 | 🔶 | 未接入，只跑单元测试 |
| ConfidenceCalculator | 完成 | 🔶 | 未接入，只跑单元测试 |
| LLMClient | mock | 🔶 | parseMessage 可用，generate 是 mock |
| MessagePipeline | 完成 | ✅ | start/stop 可用，接入基础设施 |
