import type { ExtractedPromise } from '../../types/index.js';

export interface StoredPromise {
  id: number;
  userId: string;
  content: string;
  targetPerson?: string;
  dueAt?: Date;
  status: 'pending' | 'triggered' | 'cancelled';
  createdAt: Date;
}

export class PromiseNotifier {
  async sendReminder(promise: StoredPromise): Promise<string> {
    const parts = [`⏰ 提醒：你答应过「${promise.content}」`];
    if (promise.targetPerson) {
      parts.push(`要发给 ${promise.targetPerson}`);
    }
    if (promise.dueAt) {
      const dueStr = promise.dueAt.toLocaleString('zh-CN');
      parts.push(`截止时间：${dueStr}`);
    }
    const message = parts.join('，') + '。';
    console.log(`[PromiseNotifier] ${message}`);
    return message;
  }
}
