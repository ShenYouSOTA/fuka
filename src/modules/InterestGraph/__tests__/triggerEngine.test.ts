import type { InterestMatcher } from '../matcher.js';
import type { TriggerEngineConfig } from '../triggerEngine.js';
import { TriggerEngine } from '../triggerEngine.js';

const createMockRepo = () => ({
  findActive: () => Promise.resolve([]),
  findByTopic: () => Promise.resolve([]),
  findPending: () => Promise.resolve(null),
  create: () => Promise.resolve({} as any),
  upsertInterest: () => Promise.resolve(),
  decayIfStale: () => Promise.resolve(),
});

const createMockMatcher = (): InterestMatcher => ({
  findMatches: () => Promise.resolve([]),
  calculateScore: () => 0,
});

interface MockNotifier {
  notify: () => Promise<void>;
}

const createMockNotifier = (): MockNotifier => ({
  notify: () => Promise.resolve(),
});

const defaultConfig: TriggerEngineConfig = {
  intervalMs: 5000,
  pushEnabled: true,
};

describe('TriggerEngine', () => {
  describe('scanAll', () => {
    it('calls decayStaleInterests which calls repo.decayIfStale', async () => {
      let decayCalled = false;
      const mockRepo = createMockRepo();
      (mockRepo as any).decayIfStale = async () => { decayCalled = true; };
      const engine = new TriggerEngine(
        mockRepo as any,
        createMockMatcher(),
        createMockNotifier() as any,
        'user-1',
        defaultConfig
      );

      await engine.scanAll();

      expect(decayCalled).toBe(true);
    });
  });

  describe('decayStaleInterests', () => {
    it('calls repo.decayIfStale with correct cutoff and decayWeight', async () => {
      let decayCalls: unknown[] = [];
      const mockRepo = createMockRepo();
      (mockRepo as any).decayIfStale = async (...args: unknown[]) => { decayCalls = args; };
      const engine = new TriggerEngine(
        mockRepo as any,
        createMockMatcher(),
        createMockNotifier() as any,
        'user-1',
        defaultConfig
      );

      await engine.decayStaleInterests();

      expect(decayCalls.length).toBe(2);
      const [calledDate, decayWeight] = decayCalls as [Date, number];
      expect(calledDate instanceof Date).toBe(true);
      expect(decayWeight).toBe(0.5);
    });
  });

  describe('startScanLoop / stopScanLoop', () => {
    it('startScanLoop sets an interval on the engine', () => {
      const engine = new TriggerEngine(
        createMockRepo() as any,
        createMockMatcher(),
        createMockNotifier() as any,
        'user-1',
        defaultConfig
      );

      engine.startScanLoop();
      expect((engine as any).interval).toBeDefined();
      engine.stopScanLoop();
    });

    it('stopScanLoop clears the interval', () => {
      const engine = new TriggerEngine(
        createMockRepo() as any,
        createMockMatcher(),
        createMockNotifier() as any,
        'user-1',
        defaultConfig
      );

      engine.startScanLoop();
      engine.stopScanLoop();
      expect((engine as any).interval).toBeUndefined();
    });
  });
});
