import type { PromiseIntent, PendingContext, PromiseStatus } from '../../types/core.js';
import type { ExtractedPromise } from '../../types/index.js';

export interface HandleInput {
  intent: PromiseIntent;
  userMessage: string;
  pendingContext?: PendingContext;
  userId: string;
}

export type HandleOutput =
  | { type: '追问'; question: string; updatedContext: PendingContext; isReminder?: boolean }
  | { type: '完成'; promise: ExtractedPromise }
  | { type: '摘要'; summary: string }
  | { type: '冲突询问'; existingContext: PendingContext; newIntent: string; conflictMessage: string }
  | { type: '错误'; message: string };

export interface PromiseFilter {
  status?: PromiseStatus;
  userId?: string;
}

export interface PromiseInput {
  content: string;
  targetPerson?: string;
  dueAt?: Date;
  userId: string;
}