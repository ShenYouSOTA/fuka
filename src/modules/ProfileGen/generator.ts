import type { LLMClient } from '../../llm/client.js';
import type { Message } from './types.js';

export class ProfileGenerator {
  constructor(private llm: LLMClient) {}

  async generateSummary(messages: Message[], targetName: string): Promise<string> {
    const vars = this.buildVars(messages, targetName, 'summary');
    return this.llm.generate('profile_summary', vars);
  }

  async generateDetailed(messages: Message[], targetName: string): Promise<string> {
    const vars = this.buildVars(messages, targetName, 'detailed');
    return this.llm.generate('profile_detailed', vars);
  }

  private buildVars(messages: Message[], targetName: string, mode: 'summary' | 'detailed'): Record<string, unknown> {
    if (mode === 'summary') {
      const recent = messages.slice(0, 3);
      return {
        sender_name: targetName,
        message_1: recent[0]?.content ?? '',
        message_2: recent[1]?.content ?? '',
        message_3: recent[2]?.content ?? '',
      };
    }

    const msgList = messages.map((m, i) => `${i + 1}. ${m.content}`).join('\n');
    return {
      sender_name: targetName,
      count: messages.length,
      messages: msgList,
    };
  }
}
