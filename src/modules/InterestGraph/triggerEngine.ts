import type { Repository } from './types.js';
import type { InterestMatcher, MatchResult } from './matcher.js';
import type { InterestNotifier } from './notifier.js';

export interface TriggerEngineConfig {
  intervalMs: number;
  pushEnabled: boolean;
}

export class TriggerEngine {
  private interval?: ReturnType<typeof setInterval>;

  constructor(
    private repo: Repository,
    private matcher: InterestMatcher,
    private notifier: InterestNotifier,
    private userId: string,
    private config: TriggerEngineConfig
  ) {}

  startScanLoop(): void {
    this.interval = setInterval(() => {
      this.scanAll().catch(console.error);
    }, this.config.intervalMs);
  }

  stopScanLoop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  async scanAll(): Promise<void> {
    // TODO: scanNewMessages — requires message pipeline integration
    await this.checkNewMatches();
    await this.notifyPendingMatches();
    await this.decayStaleInterests();
  }

  async checkNewMatches(): Promise<void> {
    // Placeholder: scan all group members for new matches
    // Actual implementation requires message pipeline to track groups
  }

  async notifyPendingMatches(): Promise<void> {
    // Placeholder: scan pending matches and send notifications
    // Actual implementation requires knowing which groups/users to scan
  }

  async decayStaleInterests(): Promise<void> {
    const cutoff = new Date(Date.now() - 14 * 86400 * 1000);
    await this.repo.decayIfStale(cutoff, 0.5);
  }
}
