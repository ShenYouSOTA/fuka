import type { TriggerEvent } from '../types/index.js';
import type { PromiseStorage } from '../modules/PromiseTracker/storage.js';
import type { PromiseNotifier, StoredPromise } from '../modules/PromiseTracker/notifier.js';

export class TriggerEngine {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private storage?: PromiseStorage;
  private notifier?: PromiseNotifier;
  private scanInterval?: NodeJS.Timeout;
  private scanIntervalMs = 60000; // 1 minute default

  setDeps(storage: PromiseStorage, notifier: PromiseNotifier): void {
    this.storage = storage;
    this.notifier = notifier;
  }

  async schedule(event: TriggerEvent): Promise<void> {
    if (event.type === 'time' && event.scheduledAt) {
      const delay = event.scheduledAt.getTime() - Date.now();
      if (delay > 0) {
        const timer = setTimeout(() => this.execute(event), delay);
        this.timers.set(this.getEventKey(event), timer);
      }
    }
    // TODO: implement context and active triggers
  }

  async cancel(event: TriggerEvent): Promise<void> {
    const key = this.getEventKey(event);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  async scanDuePromises(): Promise<void> {
    if (!this.storage || !this.notifier) {
      console.warn('[TriggerEngine] deps not set, skipping scan');
      return;
    }

    const pending = await this.storage.findPending();
    const now = new Date();

    for (const p of pending) {
      if (p.dueAt && p.dueAt <= now) {
        const stored: StoredPromise = {
          id: parseInt(p.id, 10) || 0,
          userId: p.userId,
          content: p.content,
          targetPerson: p.targetPerson,
          dueAt: p.dueAt,
          status: 'triggered',
          createdAt: now,
        };
        await this.notifier.sendReminder(stored);
        await this.storage.updateStatus(p.id, 'triggered');
      }
    }
  }

  startScanLoop(intervalMs?: number): void {
    if (intervalMs) this.scanIntervalMs = intervalMs;
    this.scanInterval = setInterval(() => {
      this.scanDuePromises().catch(err => console.error('[TriggerEngine] scan error:', err));
    }, this.scanIntervalMs);
  }

  stopScanLoop(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = undefined;
    }
  }

  private async execute(event: TriggerEvent): Promise<void> {
    console.log('Trigger executed:', event);
  }

  private getEventKey(event: TriggerEvent): string {
    return `${event.type}-${event.action}-${event.targetUserId}`;
  }

  destroy(): void {
    for (const timer of Array.from(this.timers.values())) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.stopScanLoop();
  }
}
