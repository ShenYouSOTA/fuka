import type { Message } from '../types/core.js';
import type { User, Group } from '../types/core.js';
import { SqliteMessageRepository, SqlitePromiseRepository, SqliteInterestRepository, SqliteProfileRepository } from '../repository/sqlite.repository.js';

export interface StorageConfig {
  connectionString: string;
}

export class MessageStorage {
  private repo = new SqliteMessageRepository();

  async saveMessage(message: Message): Promise<void> {
    await this.repo.save(message);
  }

  async getMessagesByUser(userId: string, limit?: number): Promise<Message[]> {
    return this.repo.findByUser(userId, limit);
  }

  async getMessagesByGroup(groupId: string, limit?: number): Promise<Message[]> {
    return this.repo.findByGroup(groupId, limit);
  }
}

class PromiseStorage {
  private repo = new SqlitePromiseRepository();

  async save(promise: {
    userId: string;
    content: string;
    targetPerson?: string;
    dueAt?: Date;
  }): Promise<number> {
    const id = await this.repo.save(promise);
    return parseInt(id, 10);
  }

  async getPending(): Promise<Array<{
    id: number;
    userId: string;
    content: string;
    targetPerson?: string;
    dueAt?: Date;
  }>> {
    const rows = await this.repo.findPending();
    return rows.map((r) => ({ ...r, id: parseInt(r.id, 10) }));
  }

  async updateStatus(id: number, status: string): Promise<void> {
    await this.repo.updateStatus(id.toString(), status);
  }
}

class InterestStorage {
  private repo = new SqliteInterestRepository();

  async upsertTopic(userId: string, groupId: string, topic: string, weight?: number): Promise<void> {
    await this.repo.upsertTopic(userId, groupId, topic, weight);
  }

  async getUserInterests(userId: string, groupId?: string): Promise<Array<{
    topic: string;
    weight: number;
    lastMentioned: Date;
  }>> {
    return this.repo.getUserInterests(userId, groupId);
  }

  async findMatchingUsers(groupId: string, userId: string): Promise<Array<{
    userId: string;
    sharedTopics: string[];
    matchScore: number;
  }>> {
    return this.repo.findMatchingUsers(groupId, userId);
  }
}

class ProfileStorage {
  private repo = new SqliteProfileRepository();

  async saveProfile(profile: {
    userId: string;
    summary: string;
    confidence: number;
    messageCount: number;
    activeHours: Record<string, number>;
    topTopics: string[];
  }): Promise<void> {
    await this.repo.saveProfile(profile);
  }

  async getProfile(userId: string): Promise<{
    userId: string;
    summary: string;
    confidence: number;
    messageCount: number;
    activeHours: Record<string, number>;
    topTopics: string[];
    generatedAt: Date;
  } | null> {
    return this.repo.getProfile(userId);
  }
}
