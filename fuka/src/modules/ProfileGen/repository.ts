import { PrismaClient, type profiles } from '@prisma/client';
import type { Profile } from './types.js';

type ProfileRow = profiles;

export class ProfileRepository {
  constructor(private prisma: PrismaClient) {}

  private toDomain(row: ProfileRow): Profile {
    return {
      id: row.id,
      userId: row.user_id,
      targetId: row.target_id,
      groupId: row.group_id ?? undefined,
      summary: row.summary,
      detailed: row.detailed ?? undefined,
      confidence: row.confidence,
      messageCount: row.message_count,
      activeHours: JSON.parse(row.active_hours),
      topTopics: JSON.parse(row.top_topics),
      generatedAt: row.generated_at,
      updatedAt: row.updated_at,
    };
  }

  async find(viewerId: string, targetId: string): Promise<Profile | null> {
    const row = await this.prisma.profiles.findUnique({
      where: { user_id_target_id: { user_id: viewerId, target_id: targetId } },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAllByViewer(viewerId: string): Promise<Profile[]> {
    const rows = await this.prisma.profiles.findMany({
      where: { user_id: viewerId },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async upsert(data: Omit<Profile, 'id' | 'generatedAt' | 'updatedAt'>): Promise<Profile> {
    const row = await this.prisma.profiles.upsert({
      where: { user_id_target_id: { user_id: data.userId, target_id: data.targetId } },
      create: {
        id: crypto.randomUUID(),
        user_id: data.userId,
        target_id: data.targetId,
        group_id: data.groupId ?? null,
        summary: data.summary,
        detailed: data.detailed ?? null,
        confidence: data.confidence,
        message_count: data.messageCount,
        active_hours: JSON.stringify(data.activeHours),
        top_topics: JSON.stringify(data.topTopics),
      },
      update: {
        summary: data.summary,
        detailed: data.detailed ?? null,
        confidence: data.confidence,
        message_count: data.messageCount,
        active_hours: JSON.stringify(data.activeHours),
        top_topics: JSON.stringify(data.topTopics),
      },
    });
    return this.toDomain(row);
  }

  async delete(viewerId: string, targetId: string): Promise<void> {
    await this.prisma.profiles.delete({
      where: { user_id_target_id: { user_id: viewerId, target_id: targetId } },
    });
  }
}