import { PromiseTracker } from '../index.js';
import { PromiseIntent } from '../../../types/core.js';
import { PromiseStorage } from '../storage.js';

// Manual mock for PromiseStorage
class MockPromiseStorage {
  async save(userId: string, promise: any): Promise<string> {
    return `mock-${Date.now()}`;
  }
  async findPending() { return []; }
  async updateStatus(id: string, status: string): Promise<void> {}
}

describe('PromiseTracker', () => {
  let tracker: PromiseTracker;
  let mockStorage: MockPromiseStorage;

  beforeEach(() => {
    mockStorage = new MockPromiseStorage();
    tracker = new PromiseTracker(mockStorage as any);
  });

  const createInput = (userMessage: string, userId = 'user1') => ({
    intent: PromiseIntent.CREATE,
    userMessage,
    userId,
  });

  const deferInput = (userMessage: string, userId = 'user1') => ({
    intent: PromiseIntent.DEFER_CHOICE,
    userMessage,
    userId,
  });

  describe('handle - promise_create', () => {
    it('returns 追问 when content is missing', async () => {
      const output = await tracker.handle(createInput('帮我记得'));
      expect(output.type).toBe('追问');
    });

    it('asks next field even when first message has some info', async () => {
      // First message: "明天下午3点给小王发链接"
      // Missing content, has target and due_time
      const output = await tracker.handle(createInput('明天下午3点给小王发链接'));
      expect(output.type).toBe('追问');
    });
  });

  describe('conflict protection', () => {
    it('returns 冲突询问 when pending context exists', async () => {
      // Create first context with CREATE intent
      await tracker.handle(createInput('记得提醒我健身'));

      // New CREATE while context exists triggers conflict
      const output = await tracker.handle(createInput('帮我给小王发链接'));
      expect(output.type).toBe('冲突询问');
    });

    it('continues context when user says 不要 via DEFER_CHOICE', async () => {
      await tracker.handle(createInput('记得提醒我健身'));

      // User responds "不要" to abandon conflict
      const output = await tracker.handle(deferInput('不要'));
      expect(output.type).toBe('追问');
    });

    it('starts new context when user says 好 via DEFER_CHOICE', async () => {
      await tracker.handle(createInput('记得提醒我健身'));

      // User chooses to abandon old and start new
      const output = await tracker.handle(deferInput('好'));
      expect(output.type).toBe('追问');
    });

    it('shows progress when user says 查看进度', async () => {
      await tracker.handle(createInput('记得提醒我健身'));

      // User asks for progress
      const output = await tracker.handle(deferInput('查看进度'));
      expect(output.type).toBe('摘要');
    });
  });

  describe('invalid response handling', () => {
    it('re-asks for empty value via DEFER_CHOICE', async () => {
      await tracker.handle(createInput('提醒我'));

      // Empty response to follow-up question
      const output = await tracker.handle(deferInput(''));
      expect(output.type).toBe('追问');
    });

    it('re-asks for content when value too short', async () => {
      const output = await tracker.handle(createInput('x'));
      expect(output.type).toBe('追问');
    });
  });

  describe('edge cases', () => {
    it('handles unknown intent', async () => {
      const output = await tracker.handle({
        intent: 'unknown_intent' as any,
        userMessage: 'test',
        userId: 'user1',
      });
      expect(output.type).toBe('错误');
    });

    it('handles DEFER_CHOICE without context', async () => {
      const output = await tracker.handle(deferInput('继续', 'user-no-context'));
      expect(output.type).toBe('错误');
    });
  });

  describe('context management', () => {
    it('getPendingContext returns undefined when no context', () => {
      expect(tracker.getPendingContext('nonexistent')).toBeUndefined();
    });

    it('clearPendingContext removes existing context', async () => {
      await tracker.handle(createInput('记得提醒我健身'));
      expect(tracker.getPendingContext('user1')).toBeDefined();

      tracker.clearPendingContext('user1');
      expect(tracker.getPendingContext('user1')).toBeUndefined();
    });
  });
});