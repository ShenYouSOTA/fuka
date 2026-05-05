import { ProfileGenerator } from '../generator.js';
import type { Message } from '../types.js';

const mockLLM = {
  generate: jest.fn().mockResolvedValue('Mocked profile text'),
};

describe('ProfileGenerator', () => {
  const generator = new ProfileGenerator(mockLLM as any);

  const makeMsg = (content: string): Message => ({
    id: crypto.randomUUID(),
    userId: 'user1',
    content,
    timestamp: new Date(),
  });

  describe('generateSummary', () => {
    it('calls llm.generate with profile_summary template', async () => {
      const msgs = [makeMsg('hello'), makeMsg('world'), makeMsg('foo')];
      await generator.generateSummary(msgs, '小李');
      expect(mockLLM.generate).toHaveBeenCalledWith('profile_summary', expect.objectContaining({
        sender_name: '小李',
        message_1: 'hello',
        message_2: 'world',
        message_3: 'foo',
      }));
    });

    it('handles fewer than 3 messages', async () => {
      const msgs = [makeMsg('hello')];
      await generator.generateSummary(msgs, '小李');
      expect(mockLLM.generate).toHaveBeenCalledWith('profile_summary', expect.objectContaining({
        message_1: 'hello',
        message_2: '',
        message_3: '',
      }));
    });
  });

  describe('generateDetailed', () => {
    it('calls llm.generate with profile_detailed template', async () => {
      const msgs = [makeMsg('msg1'), makeMsg('msg2')];
      await generator.generateDetailed(msgs, '小李');
      expect(mockLLM.generate).toHaveBeenCalledWith('profile_detailed', expect.objectContaining({
        sender_name: '小李',
        count: 2,
      }));
    });

    it('formats messages as numbered list', async () => {
      const msgs = [makeMsg('first'), makeMsg('second')];
      await generator.generateDetailed(msgs, '小李');
      expect(mockLLM.generate).toHaveBeenCalledWith('profile_detailed', expect.objectContaining({
        messages: expect.stringContaining('1. first'),
      }));
      expect(mockLLM.generate).toHaveBeenCalledWith('profile_detailed', expect.objectContaining({
        messages: expect.stringContaining('2. second'),
      }));
    });
  });
});