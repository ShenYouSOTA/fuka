import type { Message } from '../types/core.js';

/**
 * Repository interface for message persistence.
 * Swap SQLite for PostgreSQL by changing the provider in schema.prisma
 * and passing a different Prisma adapter to the implementation.
 */
export interface IMessageRepository {
  save(message: Message): Promise<void>;
  findByUser(userId: string, limit?: number): Promise<Message[]>;
  findByGroup(groupId: string, limit?: number): Promise<Message[]>;
  findById(id: string): Promise<Message | null>;
}

export interface IPromiseRepository {
  save(data: {
    userId: string;
    content: string;
    targetPerson?: string;
    dueAt?: Date;
  }): Promise<string>;

  findPending(): Promise<Array<{
    id: string;
    userId: string;
    content: string;
    targetPerson?: string;
    dueAt?: Date;
    status: string;
  }>>;

  updateStatus(id: string, status: string): Promise<void>;
}

export interface IInterestRepository {
  upsertTopic(userId: string, groupId: string, topic: string, weight?: number): Promise<void>;

  getUserInterests(userId: string, groupId?: string): Promise<Array<{
    topic: string;
    weight: number;
    lastMentioned: Date;
  }>>;

  findMatchingUsers(groupId: string, userId: string): Promise<Array<{
    userId: string;
    sharedTopics: string[];
    matchScore: number;
  }>>;
}

export interface IProfileRepository {
  saveProfile(data: {
    userId: string;
    summary: string;
    confidence: number;
    messageCount: number;
    activeHours: Record<string, number>;
    topTopics: string[];
  }): Promise<void>;

  getProfile(userId: string): Promise<{
    userId: string;
    summary: string;
    confidence: number;
    messageCount: number;
    activeHours: Record<string, number>;
    topTopics: string[];
    generatedAt: Date;
  } | null>;
}
