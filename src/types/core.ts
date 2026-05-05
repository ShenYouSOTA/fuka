// Core type exports for the pipeline
export interface Message {
  id: string;
  userId: string;
  groupId?: string;
  content: string;
  timestamp: Date;
}

export interface User {
  id: string;
  nickname: string;
  groupIds: string[];
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
}

export enum PromiseIntent {
  CREATE = 'promise_create',
  UPDATE = 'promise_update',
  COMPLETE = 'promise_complete',
  LIST = 'promise_list',
  CANCEL = 'promise_cancel',
  DEFER = 'promise_defer',
  DEFER_CHOICE = 'promise_defer_choice',
}

export enum PromiseStatus {
  PENDING = 'pending',
  DEFERRED = 'deferred',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum CancelReason {
  USER_CANCELLED = 'user_cancelled',
  MAX_DEFER_REACHED = 'max_defer_reached',
}

export interface PendingContext {
  id?: number;
  userId: string;
  intent: PromiseIntent;
  extractedData: {
    content?: string;
    target?: string;
    dueAt?: Date;
  };
  lastMessage: string;
  createdAt: number;
  expiresAt: number;
}
