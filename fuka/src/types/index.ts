import type { Message, User, Group } from './core.js';

export interface FukaConfig {
  name: string;
  description: string;
  model: {
    provider: string;
    name: string;
    apiKey: string;
  };
  personality: FukaPersonality;
  channels: string[];
}

export interface FukaPersonality {
  tone: 'tsundere' | 'gentle' | 'energetic' | 'custom';
  verbosity: 'short' | 'medium' | 'long';
  extraversion: number; // 0-1
  warmth: number; // 0-1
}

export interface ParsedMessage {
  raw: Message;
  intent: 'promise' | 'interest' | 'profile_query' | 'casual' | 'unknown';
  entities: {
    promises: ExtractedPromise[];
    interests: string[];
    targetPerson?: string;
  };
  confidence: number;
}

export interface ExtractedPromise {
  content: string;
  targetPerson?: string;
  dueAt?: Date;
  rawText: string;
  status?: import('./core.js').PromiseStatus;
  deferCount?: number;
  remindCount?: number;
  cancelReason?: import('./core.js').CancelReason;
}

export interface InterestTag {
  topic: string;
  weight: number;
  source: string;
  lastMentioned: Date;
}

export interface UserProfile {
  userId: string;
  summary: string;
  confidence: number;
  messageCount: number;
  activeHours: Record<string, number>;
  topTopics: string[];
  generatedAt: Date;
}

export interface TriggerEvent {
  type: 'time' | 'context' | 'active';
  action: 'promise_remind' | 'interest_match' | 'profile_request';
  targetUserId: string;
  payload: Record<string, unknown>;
  scheduledAt?: Date;
}

export interface FukaResponse {
  text: string;
  actions: FukaAction[];
  metadata: {
    intent: string;
    confidence: number;
    processingTime: number;
  };
}

export interface FukaAction {
  type: string;
  params: Record<string, unknown>;
}
