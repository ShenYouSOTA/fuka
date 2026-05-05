import type { Message } from '../../../types/core.js';
import type { Repository } from '../types.js';
import { InterestGraph, type InterestIntent } from '../graph.js';

// Pure function tests - no mocking needed
describe('InterestGraph', () => {
  const mockRepo: Repository = {
    findActive: () => Promise.resolve([]),
    findByTopic: () => Promise.resolve([]),
    findPending: () => Promise.resolve(null),
    create: () => Promise.resolve({} as any),
    upsertInterest: () => Promise.resolve(),
    decayIfStale: () => Promise.resolve(),
  };

  const mockBrain = {
    notify: () => Promise.resolve(),
  };

  const createGraph = () =>
    new InterestGraph(mockRepo, mockBrain as any, {
      triggerIntervalMs: 5000,
      pushEnabled: true,
      interestTtlDays: 14,
      decayWeight: 0.5,
    });

  describe('handle', () => {
    it('returns success for match_accept intent', async () => {
      const graph = createGraph();
      const result = await graph.handle('match_accept', 'user-1', 'group-1');
      expect(result).toEqual({ success: true });
    });

    it('returns success for match_decline intent', async () => {
      const graph = createGraph();
      const result = await graph.handle('match_decline', 'user-1', 'group-1');
      expect(result).toEqual({ success: true });
    });

    it('returns success for match_reveal intent', async () => {
      const graph = createGraph();
      const result = await graph.handle('match_reveal', 'user-1', 'group-1');
      expect(result).toEqual({ success: true });
    });

    it('returns success for interests_clear intent', async () => {
      const graph = createGraph();
      const result = await graph.handle('interests_clear', 'user-1', 'group-1');
      expect(result).toEqual({ success: true });
    });

    it('returns failure for unknown intent', async () => {
      const graph = createGraph();
      // Cast to never to get the default case
      const result = await (graph.handle as any)('unknown_intent', 'user-1', 'group-1');
      expect(result).toEqual({ success: false, reason: 'unknown intent' });
    });
  });

  describe('startScanLoop / stopScanLoop', () => {
    it('startScanLoop and stopScanLoop control the scan loop', () => {
      const graph = createGraph();

      graph.startScanLoop();
      const interval = (graph as any)['triggerEngine']?.interval;
      expect(interval).toBeDefined();

      graph.stopScanLoop();
      const intervalAfterStop = (graph as any)['triggerEngine']?.interval;
      expect(intervalAfterStop).toBeUndefined();
    });
  });
});
