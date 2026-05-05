import { ProfileAnalyzer } from '../analyzer.js';
import type { Message } from '../types.js';

describe('ProfileAnalyzer', () => {
  const analyzer = new ProfileAnalyzer();

  const makeMsg = (hour: number, content = 'test message'): Message => ({
    id: crypto.randomUUID(),
    userId: 'user1',
    content,
    timestamp: new Date(`2026-05-04T${hour.toString().padStart(2, '0')}:00:00`),
  });

  describe('aggregateMessages', () => {
    it('returns correct messageCount', () => {
      const msgs = [makeMsg(10), makeMsg(14), makeMsg(20)];
      const result = analyzer.aggregateMessages(msgs);
      expect(result.messageCount).toBe(3);
    });

    it('aggregates activeHours by hour', () => {
      const msgs = [makeMsg(10), makeMsg(10), makeMsg(14)];
      const result = analyzer.aggregateMessages(msgs);
      expect(result.activeHours['10']).toBe(2);
      expect(result.activeHours['14']).toBe(1);
    });

    it('returns empty topTopics (LLM extraction TODO)', () => {
      const msgs = [makeMsg(10, '聊装修')];
      const result = analyzer.aggregateMessages(msgs);
      expect(result.topTopics).toEqual([]);
    });

    it('handles empty messages array', () => {
      const result = analyzer.aggregateMessages([]);
      expect(result.messageCount).toBe(0);
      expect(result.activeHours).toEqual({});
      expect(result.topTopics).toEqual([]);
    });
  });
});