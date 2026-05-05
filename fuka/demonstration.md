# Fuka Demo 演示方案

> 腾讯 PCG 校园 AI 产品创意大赛 · 赛题 3 · QQ 养虾
> 3 分钟录制视频脚本

---

## 产品一句话定位

**Fuka — 智能社交统筹，让用户登场游刃有余，人情往来不累。**

基于 QQ 消息流，主动追踪承诺、匹配同好、生成人物侧写，把社交记忆从"被动查询"变成"主动服务"。

---

## 三个核心场景

| 场景 | 旧体验 | Fuka 体验 | 核心模块 |
|------|--------|-----------|----------|
| 承诺追踪 | 答应的事后来忘了，被放鸽子 | 承诺自动提取 + 到期触发提醒 | PromiseTracker |
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
> "Fuka 是一个 QQ 社交 AI Agent。
> 它不只是聊天，而是主动帮你管理社交关系——
> 承诺不遗漏、同好不错过、登场有底气。"

---

### 镜头 2：承诺追踪（0:20–1:00）

**运行命令**：

```bash
pnpm test -- --testPathPattern=PromiseTracker/index --testNamePattern="follow-up flow follows content → target → due_time" --verbose
```

**输出示例**（Jest 会高亮 PASS）：

```
✓ follow-up flow follows content → target → due_time via DEFER_CHOICE
```

**口播**：
> "场景一，承诺追踪。
> 用户说'记得提醒我健身'，Fuka 自动进入追问流程：
> '发给谁？''什么时候提醒？'
> 填完所有字段后，承诺存储并设置触发时间，到期自动提醒。
> 这是完整的对话式承诺创建流程。"

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
> "场景二，兴趣匹配。
> Fuka 持续分析群消息，提取每个人的兴趣标签。
> 当两个人的兴趣标签重叠率高时，触发匹配推荐——
> '小王和你都喜欢 Rust，已为你们创建认识机会'。
> 群消息不用刷，缘分自然来。"

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
> "场景三，人物侧写。
> 当你想了解群里的某个人时，Fuka 分析他历史发言的：
> 活跃时段、话题偏好、发言频率。
> 生成一句话侧写，并给出置信度——
> '小明，技术向，白天沉默，晚上活跃，置信度中等'。
> 三句话就认识一个人，登场有底气。"

---

### 镜头 5：架构说明（1:55–2:40）

**画面**：代码结构图 / 模块依赖图（可用文字在终端里展示）

```bash
tree -L 2 src/modules
```

输出：

```
src/modules/
├── PromiseTracker/   # 承诺追踪
├── InterestGraph/    # 兴趣匹配
└── ProfileGen/       # 人物侧写
```

**口播**：
> "三个模块各自独立，又通过 FukaBrain 统一调度。
> FukaBrain 是核心决策层：
> 接收消息 → LLM 解析意图 → 分发到对应模块 → 返回结构化响应。
> 数据统一存在 SQLite 里，Prisma ORM 管理。
> 架构简单，但扩展性很强。"

---

### 镜头 6：下一步（2:35–3:00）

**口播**：
> "目前已完成三个核心场景的模块开发。
> 接下来需要接入真实的 QQ 消息流——
> 通过 go-cqhttp 或 NapCat 的 WebSocket API，
> 把消息实时接入 FukaBrain。
> 接入后，Fuka 就能真正做到主动服务。"

**画面**：可以是终端里打印一行：

```
FukaBrain.start()  // 等待 QQ 消息接入...
```

---

## 命令汇总（快速复制）

```bash
# 承诺追踪
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

> 如果评委更希望看"界面"而非"测试"，可以把测试换成 CLI demo 脚本。
> 需要改动 `cli/index.js`，增加 `--demo promise` / `--demo interest` / `--demo profile` 模式。
> （当前为后续开发计划，需要补完 FukaBrain 中的 handleInterest 和 handleProfileQuery TODO）

---

## 讨论结论

- **比赛赛道**：赛题 3 — 用 AI 玩转 QQ 养虾，核心考察 Agent 主动性 + 场景贯穿
- **开源发布**：.ospec/ 等开发工具不进入开源包（已加入 .gitignore）
- **Demo 载体**：Jest 测试输出 + 口播解说，兼顾"代码能跑"和"叙事清晰"
- **下一步**：接入 QQ 机器人真实消息流（go-cqhttp / NapCat WebSocket）