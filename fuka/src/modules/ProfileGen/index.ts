import type { PrismaClient } from '@prisma/client';
import type { LLMClient } from '../../llm/client.js';
import { ProfileRepository } from './repository.js';
import { ProfileAnalyzer } from './analyzer.js';
import { ProfileGenerator } from './generator.js';
import { ConfidenceCalculator } from './confidence.js';
import type { Profile, Message } from './types.js';

export class ProfileGen {
  private repo: ProfileRepository;
  private analyzer: ProfileAnalyzer;
  private generator: ProfileGenerator;
  private confidence: ConfidenceCalculator;

  constructor(prisma: PrismaClient, llm: LLMClient) {
    this.repo = new ProfileRepository(prisma);
    this.analyzer = new ProfileAnalyzer();
    this.generator = new ProfileGenerator(llm);
    this.confidence = new ConfidenceCalculator();
  }

  async generateProfile(
    messages: Message[],
    targetName: string,
    viewerId: string
  ): Promise<Omit<Profile, 'userId'>> {
    const { messageCount, activeHours, topTopics } = this.analyzer.aggregateMessages(messages);
    const summary = await this.generator.generateSummary(messages, targetName);
    const detailed = await this.generator.generateDetailed(messages, targetName);
    const windowDays = 30;
    const confidence = this.confidence.calculate(messageCount, windowDays);

    const saved = await this.repo.upsert({
      userId: viewerId,
      targetId: messages[0]?.userId ?? targetName,
      summary,
      detailed,
      confidence,
      messageCount,
      activeHours,
      topTopics,
    });

    const { userId: _userId, ...rest } = saved;
    return rest;
  }

  async refreshProfile(
    messages: Message[],
    targetName: string,
    viewerId: string
  ): Promise<Omit<Profile, 'userId'>> {
    return this.generateProfile(messages, targetName, viewerId);
  }

  async listProfiles(viewerId: string): Promise<Profile[]> {
    return this.repo.findAllByViewer(viewerId);
  }

  async clearProfile(targetId: string, viewerId: string): Promise<void> {
    await this.repo.delete(viewerId, targetId);
  }
}

export { ProfileAnalyzer } from './analyzer.js';
export { ProfileGenerator } from './generator.js';
export { ConfidenceCalculator } from './confidence.js';
export { ProfileRepository } from './repository.js';
export type { Profile, ProfileIntent, ProfileHandleInput, ProfileHandleOutput, Message } from './types.js';