import { ProfileGenerator } from '../generator.js';
import type { Message } from '../types.js';

describe('ProfileGenerator', () => {
  const generator = new ProfileGenerator({
    generate: async () => 'Mocked profile text',
  } as any);

  const makeMsg = (content: string): Message => ({
    id: crypto.randomUUID(),
    userId: 'user1',
    content,
    timestamp: new Date(),
  });

  describe('generateSummary', () => {
    it('generates summary for given messages', async () => {
      const msgs = [makeMsg('hello'), makeMsg('world'), makeMsg('foo')];
      const result = await generator.generateSummary(msgs, '小李');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('handles fewer than 3 messages', async () => {
      const msgs = [makeMsg('hello')];
      const result = await generator.generateSummary(msgs, '小李');
      expect(typeof result).toBe('string');
    });
  });

  describe('generateDetailed', () => {
    it('generates detailed profile', async () => {
      const msgs = [makeMsg('msg1'), makeMsg('msg2')];
      const result = await generator.generateDetailed(msgs, '小李');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
