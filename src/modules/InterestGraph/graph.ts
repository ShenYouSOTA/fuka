import type { Message } from '../../types/core.js';
import type { Repository } from './types.js';
import { InterestTagger } from './tagger.js';
import { InterestMatcher } from './matcher.js';
import { InterestNotifier } from './notifier.js';
import { TriggerEngine, type TriggerEngineConfig } from './triggerEngine.js';
import { DecayEngine, type DecayEngineConfig } from './decayEngine.js';

export type InterestIntent =
  | 'match_list'
  | 'match_reveal'
  | 'match_decline'
  | 'match_accept'
  | 'interests_list'
  | 'interests_clear';

export interface InterestGraphConfig {
  triggerIntervalMs: number;
  pushEnabled: boolean;
  interestTtlDays: number;
  decayWeight: number;
}

export class InterestGraph {
  private repo: Repository;
  private tagger: InterestTagger;
  private matcher: InterestMatcher;
  private notifier: InterestNotifier;
  private triggerEngine: TriggerEngine;
  private decayEngine: DecayEngine;

  constructor(
    repo: Repository,
    brain: { notify(event: { type: string; payload: unknown }): Promise<void> },
    config: InterestGraphConfig
  ) {
    this.repo = repo;
    this.tagger = new InterestTagger();
    this.matcher = new InterestMatcher();
    this.notifier = new InterestNotifier(brain);

    const triggerConfig: TriggerEngineConfig = {
      intervalMs: config.triggerIntervalMs,
      pushEnabled: config.pushEnabled,
    };
    this.triggerEngine = new TriggerEngine(
      this.repo,
      this.matcher,
      this.notifier,
      '',
      triggerConfig
    );

    const decayConfig: DecayEngineConfig = {
      interestTtlDays: config.interestTtlDays,
      decayWeight: config.decayWeight,
    };
    this.decayEngine = new DecayEngine(this.repo, decayConfig);
  }

  async ingestMessage(message: Message): Promise<void> {
    const tags = await this.tagger.extract(message);
    if (tags.length === 0) return;

    const userId = message.userId;
    const groupId = message.groupId ?? '';

    for (const tag of tags) {
      await this.repo.upsertInterest(userId, groupId, tag.topic, tag.weight);
    }
  }

  async handle(intent: InterestIntent, userId: string, groupId?: string): Promise<unknown> {
    switch (intent) {
      case 'match_list':
        return this.matcher.findMatches(groupId ?? '', userId);
      case 'interests_list':
        return this.repo.findActive(userId, groupId ?? '');
      case 'match_accept':
      case 'match_decline':
      case 'match_reveal':
      case 'interests_clear':
        return { success: true };
      default:
        return { success: false, reason: 'unknown intent' };
    }
  }

  startScanLoop(): void {
    this.triggerEngine.startScanLoop();
  }

  stopScanLoop(): void {
    this.triggerEngine.stopScanLoop();
  }
}
