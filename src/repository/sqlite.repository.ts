import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import type { IMessageRepository, IPromiseRepository, IInterestRepository, IProfileRepository } from './interfaces.js';
import type { Message } from '../types/core.js';

const DB_URL = 'file:./prisma/fuka.db';

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaLibSql({ url: DB_URL });
  return new PrismaClient({ adapter } as any);
}

// Singleton Prisma client
let _prisma: PrismaClient | null = null;
function getPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = createPrismaClient();
  }
  return _prisma;
}

// --- Message Repository ---

export class SqliteMessageRepository implements IMessageRepository {
  async save(message: Message): Promise<void> {
    const prisma = getPrisma();
    await prisma.messages.create({
      data: {
        id: message.id,
        user_id: message.userId,
        group_id: message.groupId ?? null,
        content: message.content,
        timestamp: message.timestamp,
      },
    });
  }

  async findByUser(userId: string, limit = 100): Promise<Message[]> {
    const prisma = getPrisma();
    const rows = await prisma.messages.findMany({
      where: { user_id: userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    return rows.map(this.mapToMessage);
  }

  async findByGroup(groupId: string, limit = 100): Promise<Message[]> {
    const prisma = getPrisma();
    const rows = await prisma.messages.findMany({
      where: { group_id: groupId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    return rows.map(this.mapToMessage);
  }

  async findById(id: string): Promise<Message | null> {
    const prisma = getPrisma();
    const row = await prisma.messages.findUnique({ where: { id } });
    return row ? this.mapToMessage(row) : null;
  }

  private mapToMessage(row: any): Message {
    return {
      id: row.id,
      userId: row.user_id,
      groupId: row.group_id ?? undefined,
      content: row.content,
      timestamp: row.timestamp,
    };
  }
}

// --- Promise Repository ---

export class SqlitePromiseRepository implements IPromiseRepository {
  async save(data: { userId: string; content: string; targetPerson?: string; dueAt?: Date }): Promise<string> {
    const prisma = getPrisma();
    const id = crypto.randomUUID();
    await prisma.promises.create({
      data: {
        id,
        user_id: data.userId,
        content: data.content,
        target_person: data.targetPerson ?? null,
        due_at: data.dueAt ?? null,
        status: 'pending',
      },
    });
    return id;
  }

  async findPending(): Promise<Array<{ id: string; userId: string; content: string; targetPerson?: string; dueAt?: Date; status: string }>> {
    const prisma = getPrisma();
    const rows = await prisma.promises.findMany({ where: { status: 'pending' } });
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      content: r.content,
      targetPerson: r.target_person ?? undefined,
      dueAt: r.due_at ?? undefined,
      status: r.status,
    }));
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.promises.update({ where: { id }, data: { status } });
  }
}

// --- Interest Repository ---

export class SqliteInterestRepository implements IInterestRepository {
  async upsertTopic(userId: string, groupId: string, topic: string, weight = 0.5): Promise<void> {
    const prisma = getPrisma();
    await prisma.interests.upsert({
      where: { id: `${userId}:${groupId}:${topic}` },
      create: {
        id: `${userId}:${groupId}:${topic}`,
        user_id: userId,
        group_id: groupId,
        topic,
        weight,
        last_mentioned: new Date(),
      },
      update: {
        weight,
        last_mentioned: new Date(),
      },
    });
  }

  async getUserInterests(userId: string, groupId?: string): Promise<Array<{ topic: string; weight: number; lastMentioned: Date }>> {
    const prisma = getPrisma();
    const rows = await prisma.interests.findMany({
      where: { user_id: userId, ...(groupId ? { group_id: groupId } : {}) },
    });
    return rows.map((r) => ({ topic: r.topic, weight: r.weight, lastMentioned: r.last_mentioned }));
  }

  async findMatchingUsers(groupId: string, userId: string): Promise<Array<{ userId: string; sharedTopics: string[]; matchScore: number }>> {
    // TODO: implement matching logic with interest_matches table
    return [];
  }
}

// --- Profile Repository ---

export class SqliteProfileRepository implements IProfileRepository {
  async saveProfile(data: { userId: string; summary: string; confidence: number; messageCount: number; activeHours: Record<string, number>; topTopics: string[] }): Promise<void> {
    const prisma = getPrisma();
    const id = crypto.randomUUID();
    await prisma.profiles.upsert({
      where: { id },
      create: {
        id,
        user_id: data.userId,
        target_id: data.userId, // self-profile when no target specified
        summary: data.summary,
        confidence: data.confidence,
        message_count: data.messageCount,
        active_hours: JSON.stringify(data.activeHours),
        top_topics: JSON.stringify(data.topTopics),
      },
      update: {
        summary: data.summary,
        confidence: data.confidence,
        message_count: data.messageCount,
        active_hours: JSON.stringify(data.activeHours),
        top_topics: JSON.stringify(data.topTopics),
      },
    });
  }

  async getProfile(userId: string): Promise<{ userId: string; summary: string; confidence: number; messageCount: number; activeHours: Record<string, number>; topTopics: string[]; generatedAt: Date } | null> {
    const prisma = getPrisma();
    const row = await prisma.profiles.findFirst({ where: { user_id: userId } });
    if (!row) return null;
    return {
      userId: row.user_id,
      summary: row.summary,
      confidence: row.confidence,
      messageCount: row.message_count,
      activeHours: JSON.parse(row.active_hours),
      topTopics: JSON.parse(row.top_topics),
      generatedAt: row.generated_at,
    };
  }
}
