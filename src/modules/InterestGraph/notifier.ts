import type { MatchResult } from './matcher.js';

interface Brain {
  notify(event: { type: string; payload: unknown }): Promise<void>;
}

export class InterestNotifier {
  constructor(private brain?: Brain) {}

  async notifyMatch(match: MatchResult, groupId: string): Promise<void> {
    if (!this.brain) return;
    await this.brain.notify({
      type: 'interest_match',
      payload: { match, groupId },
    });
  }
}
