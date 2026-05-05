import type { Repository } from './types.js';

export interface DecayEngineConfig {
  interestTtlDays: number;
  decayWeight: number;
}

export class DecayEngine {
  constructor(
    private repo: Repository,
    private config: DecayEngineConfig
  ) {}

  async decayStaleInterests(): Promise<void> {
    const cutoff = new Date(Date.now() - this.config.interestTtlDays * 86400 * 1000);
    await this.repo.decayIfStale(cutoff, this.config.decayWeight);
  }
}