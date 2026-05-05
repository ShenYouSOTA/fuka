import type { Message } from '../../types/core.js';

export class ProfileAnalyzer {
  aggregateMessages(messages: Message[]): {
    messageCount: number;
    activeHours: Record<string, number>;
    topTopics: string[];
  } {
    const activeHours: Record<string, number> = {};
    const topics: string[] = [];

    for (const msg of messages) {
      const hour = new Date(msg.timestamp).getHours().toString().padStart(2, '0');
      activeHours[hour] = (activeHours[hour] || 0) + 1;
      // TODO: extract topics via LLM
    }

    return {
      messageCount: messages.length,
      activeHours,
      topTopics: topics.slice(0, 5),
    };
  }
}
