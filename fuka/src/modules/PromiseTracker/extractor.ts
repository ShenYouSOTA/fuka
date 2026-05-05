import type { ExtractedPromise } from '../../types/index.js';
import type { Message, PendingContext } from '../../types/core.js';

const PROMISE_KEYWORDS = [
  '记得', '提醒我', '帮我', '答应', '承诺', '要记得',
  '帮我记着', '帮我提醒', '我会', '一定会', '说好了',
  '一定记得', '别忘了', '记住'
];

const TARGET_PATTERNS = [
  /(?:给|向|跟|和)\s*([^\s，。！？]+)/g,
  /发给([^\s，。！？]+)/g,
  /给([^\s，。！？]+)/g,
];

const TIME_PATTERNS = [
  /(\d{1,2}[点时:]?\d{0,2}(?:分)?(?:\s*[午晚上下午早凌晨]+)?)/g,
  /(明天|今天|后天|下周|下周\d|星期[一二三四五六日天]|周一|周二|周三|周四|周五|周六|周日)/g,
  /(\d+分钟|半小时|1小时|几个?小时|半天|一天)/g,
];

export class PromiseExtractor {
  isPromiseStatement(content: string): boolean {
    const lower = content.toLowerCase();
    return PROMISE_KEYWORDS.some(keyword => lower.includes(keyword));
  }

  async extract(
    message: Message,
    pendingContext?: PendingContext
  ): Promise<ExtractedPromise[]> {
    const content = message.content;

    const result: ExtractedPromise = {
      content: content,
      rawText: content,
    };

    const target = this.extractTarget(content);
    if (target) result.targetPerson = target;

    const dueAt = this.extractTime(content);
    if (dueAt) result.dueAt = dueAt;

    return [result];
  }

  extractTarget(content: string): string | undefined {
    // Pattern to stop at common verbs/actions after target name
    const verbStop = /(?:给|向|跟|和)\s*([^\s，。！？]+?(?=[发告说讲提醒请让汇报告]))/;
    const directPattern = /发给([^\s，。！？]+)/;
    const simplePattern = /给([^\s，。！？]+)/;

    const match = content.match(verbStop) || content.match(directPattern) || content.match(simplePattern);
    if (match && match[1]) {
      return match[1].trim();
    }
    return undefined;
  }

  extractTime(content: string): Date | undefined {
    const now = new Date();

    if (content.includes('明天')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(20, 0, 0, 0);
      return tomorrow;
    }

    if (content.includes('今天')) {
      const today = new Date(now);
      today.setHours(20, 0, 0, 0);
      return today;
    }

    if (content.includes('下午') || content.includes('晚上')) {
      const hourMatch = content.match(/(\d{1,2})[点时]/);
      if (hourMatch) {
        const hour = parseInt(hourMatch[1], 10) + (content.includes('下午') && parseInt(hourMatch[1], 10) < 12 ? 12 : 0);
        const date = new Date(now);
        date.setHours(hour, 0, 0, 0);
        return date;
      }
    }

    const hourMatch = content.match(/(\d{1,2})[点时:]/);
    if (hourMatch) {
      const hour = parseInt(hourMatch[1], 10);
      const date = new Date(now);
      if (content.includes('下午') || content.includes('晚上')) {
        date.setHours(hour + 12, 0, 0, 0);
      } else {
        date.setHours(hour, 0, 0, 0);
      }
      return date;
    }

    return undefined;
  }

  isFieldExplicit(field: 'content' | 'target' | 'due_time', content: string): boolean {
    switch (field) {
      case 'target':
        return TARGET_PATTERNS.some(p => p.test(content));
      case 'due_time':
        return TIME_PATTERNS.some(p => p.test(content)) ||
               content.includes('明天') || content.includes('今天') ||
               content.includes('下午') || content.includes('晚上');
      case 'content':
      default:
        return content.length > 0;
    }
  }
}