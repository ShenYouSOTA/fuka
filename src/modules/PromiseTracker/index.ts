import { readFileSync } from 'fs';
import { join } from 'path';
import type { ExtractedPromise } from '../../types/index.js';
import type { PendingContext } from '../../types/core.js';
import type { HandleInput, HandleOutput } from './types.js';
import { PromiseIntent } from '../../types/core.js';
import { PromiseExtractor } from './extractor.js';
import { PromiseNotifier } from './notifier.js';
import { PromiseStorage } from './storage.js';

export { PromiseNotifier } from './notifier.js';
export { PromiseStorage } from './storage.js';
export type { StoredPromise } from './notifier.js';

const CONFIG = {
  follow_up_order: ['content', 'target', 'due_time'] as const,
  max_follow_up_rounds: 6,
  context_timeout: 1800,
  default_time: '20:00',
  default_date: 'today',
  on_max_rounds: 'fail' as const,
};

interface QuestionTemplate {
  content_missing: string;
  target_missing: string;
  due_time_missing: string;
  invalid_response: string;
  conflict_prompt: string;
  conflict_reminder: string;
}

function loadQuestionTemplate(): QuestionTemplate {
  try {
    const configPath = join(process.cwd(), 'config/copy/promise_questions.md');
    const content = readFileSync(configPath, 'utf-8');
    const result: Partial<QuestionTemplate> = {};
    const lines = content.split('\n');
    let currentKey = '';
    let currentValue = '';

    for (const line of lines) {
      const keyMatch = line.match(/^(\w+)\s*=\s*"?([^"]*)$/);
      if (keyMatch && !line.includes('"""') && !line.includes("'''")) {
        if (currentKey) {
          (result as Record<string, string>)[currentKey] = currentValue.trim();
        }
        currentKey = keyMatch[1];
        currentValue = keyMatch[2];
      } else if (line.startsWith('"') || line.startsWith("'")) {
        currentValue += '\n' + line;
      } else {
        currentValue += '\n' + line;
      }
    }
    if (currentKey) {
      (result as Record<string, string>)[currentKey] = currentValue.trim();
    }
    return result as QuestionTemplate;
  } catch {
    return {
      content_missing: '要提醒你做什么？',
      target_missing: '发给谁？',
      due_time_missing: '什么时候提醒？',
      invalid_response: '没太理解，能再说一次吗？',
      conflict_prompt: '你还在创建承诺，要放弃并开始新任务吗？',
      conflict_reminder: '你的选择是：\n- 说"继续"：保留当前进度\n- 说"好"：放弃旧的，开始新的\n- 说"查看进度"：看看现在填了多少',
    };
  }
}

export class PromiseTracker {
  private extractor: PromiseExtractor;
  private questionTemplate: QuestionTemplate;
  private pendingContexts: Map<string, PendingContext>;
  private followUpRounds: Map<string, number>;
  private storage: PromiseStorage;

  constructor(storage?: PromiseStorage) {
    this.extractor = new PromiseExtractor();
    this.questionTemplate = loadQuestionTemplate();
    this.pendingContexts = new Map();
    this.followUpRounds = new Map();
    this.storage = storage ?? new PromiseStorage();
  }

  async handle(input: HandleInput): Promise<HandleOutput> {
    const { intent, userMessage, userId } = input;

    if (intent === 'promise_create') {
      const existingContext = this.pendingContexts.get(userId);
      if (existingContext && existingContext.intent === PromiseIntent.CREATE) {
        const prompt = `${this.questionTemplate.conflict_prompt}\n${this.questionTemplate.conflict_reminder}`;
        return {
          type: '冲突询问',
          existingContext,
          newIntent: intent,
          conflictMessage: prompt,
        } as HandleOutput & { conflictMessage: string };
      }
      return this.handleCreate(userMessage, userId);
    }

    if (intent === 'promise_defer_choice') {
      return this.handleDeferChoice(userMessage, userId);
    }

    return {
      type: '错误',
      message: `未知意图: ${intent}`,
    };
  }

  private async handleCreate(
    userMessage: string,
    userId: string
  ): Promise<HandleOutput> {
    const contextKey = userId;
    let context = this.pendingContexts.get(contextKey);

    if (!context) {
      context = this.createPendingContext(userId, userMessage);
      this.pendingContexts.set(contextKey, context);
      this.followUpRounds.set(contextKey, 0);

      const missing = this.getNextMissingField(context);
      if (!missing) {
        return await this.completePromise(context);
      }
      return {
        type: '追问',
        question: this.getQuestion(missing),
        updatedContext: context,
      };
    }

    const rounds = this.getFollowUpRounds(context);
    if (rounds >= CONFIG.max_follow_up_rounds) {
      this.pendingContexts.delete(contextKey);
      if (CONFIG.on_max_rounds === 'fail') {
        return {
          type: '错误',
          message: '已达到最大追问次数，承诺创建失败',
        };
      }
    }

    const field = this.getNextMissingField(context);
    if (!field) {
      return await this.completePromise(context);
    }

    const fieldValue = userMessage.trim();
    if (!this.isValidFieldValue(field, fieldValue)) {
      return {
        type: '追问',
        question: this.questionTemplate.invalid_response,
        updatedContext: context,
        isReminder: true,
      };
    }

    this.updateContextField(context, field, fieldValue);
    context.lastMessage = fieldValue;
    this.followUpRounds.set(contextKey, (this.followUpRounds.get(contextKey) ?? 0) + 1);

    const nextMissing = this.getNextMissingField(context);
    if (!nextMissing) {
      return await this.completePromise(context);
    }

    return {
      type: '追问',
      question: this.getQuestion(nextMissing),
      updatedContext: context,
    };
  }

  private createPendingContext(
    userId: string,
    firstMessage: string
  ): PendingContext {
    const now = Date.now();
    return {
      userId,
      intent: PromiseIntent.CREATE,
      extractedData: {},
      lastMessage: firstMessage,
      createdAt: now,
      expiresAt: now + CONFIG.context_timeout * 1000,
    };
  }

  private getNextMissingField(
    context: PendingContext
  ): 'content' | 'target' | 'due_time' | null {
    for (const field of CONFIG.follow_up_order) {
      if (!this.isFieldFilled(context, field)) {
        return field;
      }
    }
    return null;
  }

  private isFieldFilled(
    context: PendingContext,
    field: 'content' | 'target' | 'due_time'
  ): boolean {
    switch (field) {
      case 'content':
        return !!context.extractedData.content;
      case 'target':
        return !!context.extractedData.target;
      case 'due_time':
        return context.extractedData.dueAt !== undefined;
    }
  }

  private isValidFieldValue(
    field: 'content' | 'target' | 'due_time',
    value: string
  ): boolean {
    if (value.length === 0) return false;
    if (field === 'content' && value.length < 2) return false;
    return true;
  }

  private updateContextField(
    context: PendingContext,
    field: 'content' | 'target' | 'due_time',
    value: string
  ): void {
    switch (field) {
      case 'content':
        context.extractedData.content = value;
        break;
      case 'target':
        context.extractedData.target = value;
        break;
      case 'due_time': {
        const dueAt = this.extractor.extractTime(value);
        if (dueAt) {
          context.extractedData.dueAt = dueAt;
        }
        break;
      }
    }
  }

  private getFollowUpRounds(context: PendingContext): number {
    return this.followUpRounds.get(context.userId) ?? 0;
  }

  private getQuestion(
    field: 'content' | 'target' | 'due_time'
  ): string {
    switch (field) {
      case 'content':
        return this.questionTemplate.content_missing;
      case 'target':
        return this.questionTemplate.target_missing;
      case 'due_time':
        return this.questionTemplate.due_time_missing;
    }
  }

  private async completePromise(context: PendingContext): Promise<HandleOutput> {
    const contextKey = context.userId;
    this.pendingContexts.delete(contextKey);

    const promise: ExtractedPromise = {
      content: context.extractedData.content || context.lastMessage,
      rawText: context.lastMessage,
    };
    if (context.extractedData.target) {
      promise.targetPerson = context.extractedData.target;
    }
    if (context.extractedData.dueAt) {
      promise.dueAt = context.extractedData.dueAt;
    }

    try {
      await this.storage.save(context.userId, promise);
    } catch (err) {
      return {
        type: '错误',
        message: `承诺保存失败: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    return {
      type: '完成',
      promise,
    };
  }

  private async handleDeferChoice(
    userMessage: string,
    userId: string
  ): Promise<HandleOutput> {
    const lower = userMessage.trim().toLowerCase();
    const context = this.pendingContexts.get(userId);

    if (!context) {
      return {
        type: '错误',
        message: '没有正在创建的承诺',
      };
    }

    if (lower.includes('不要') || lower.includes('继续')) {
      const nextMissing = this.getNextMissingField(context);
      if (!nextMissing) {
        return await this.completePromise(context);
      }
      return {
        type: '追问',
        question: this.getQuestion(nextMissing),
        updatedContext: context,
        isReminder: true,
      };
    }

    if (lower.includes('好') || lower.includes('放弃')) {
      this.pendingContexts.delete(userId);
      this.followUpRounds.delete(userId);
      const newContext = this.createPendingContext(userId, '');
      this.pendingContexts.set(userId, newContext);
      const firstMissing = this.getNextMissingField(newContext);
      if (!firstMissing) {
        return await this.completePromise(newContext);
      }
      return {
        type: '追问',
        question: `好的，开始新的承诺创建。要提醒你做什么？`,
        updatedContext: newContext,
      };
    }

    if (lower.includes('查看进度') || lower.includes('进度')) {
      const filled = [];
      if (context.extractedData.content) filled.push(`内容: ${context.extractedData.content}`);
      if (context.extractedData.target) filled.push(`对象: ${context.extractedData.target}`);
      if (context.extractedData.dueAt) filled.push(`时间: ${context.extractedData.dueAt.toLocaleString('zh-CN')}`);
      const progress = filled.length > 0 ? filled.join(', ') : '还没填入任何信息';
      const rounds = this.followUpRounds.get(userId) ?? 0;
      return {
        type: '摘要',
        summary: `当前承诺进度：${progress}（已追问 ${rounds} 轮）`,
      };
    }

    return {
      type: '追问',
      question: '没太理解，你的选择是"继续"、"好"还是"查看进度"？',
      updatedContext: context,
      isReminder: true,
    };
  }

  getPendingContext(userId: string): PendingContext | undefined {
    return this.pendingContexts.get(userId);
  }

  clearPendingContext(userId: string): void {
    this.pendingContexts.delete(userId);
  }
}