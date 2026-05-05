import type { Message } from '../../types/core.js';

export interface InterestTag {
  topic: string;
  weight: number;
  lastMentioned: Date;
}

const TOPIC_KEYWORDS: Record<string, string[]> = {
  '编程': ['编程', '代码', '写代码', '程序员', '开发', 'javascript', 'rust', 'python', 'java'],
  '游戏': ['游戏', '打游戏', 'steam', '原神', '王者', 'lol', '我的世界', '游戏荒'],
  '音乐': ['音乐', '歌', '听歌', '唱歌', '吉他', '钢琴', '周杰伦', '吉他'],
  '运动': ['运动', '健身', '跑步', '打球', '足球', '篮球', '游泳', '瑜伽'],
  '学习': ['学习', '考研', '期末', '刷题', '考试', '上课', '笔记', '复习'],
  '美食': ['美食', '吃饭', '探店', '外卖', '火锅', '奶茶', '餐厅', '好吃'],
  '二次元': ['二次元', '动漫', '番剧', '追番', 'acgn', '萌', '本子'],
};

export class InterestTagger {
  async extract(message: Message): Promise<InterestTag[]> {
    const content = message.content.toLowerCase();
    const matched: InterestTag[] = [];
    const now = new Date();

    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      const found = keywords.some(kw => content.includes(kw));
      if (found) {
        matched.push({ topic, weight: 0.8, lastMentioned: now });
      }
    }

    if (matched.length === 0 && content.length > 5) {
      matched.push({ topic: content.slice(0, 10), weight: 0.3, lastMentioned: now });
    }

    return matched;
  }

  updateWeight(existing: number, mentions: number): number {
    return existing * 0.9 + mentions * 0.1;
  }
}
