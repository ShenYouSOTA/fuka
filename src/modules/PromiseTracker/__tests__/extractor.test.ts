import { PromiseExtractor } from '../extractor.js';

describe('PromiseExtractor', () => {
  let extractor: PromiseExtractor;

  beforeEach(() => {
    extractor = new PromiseExtractor();
  });

  describe('isPromiseStatement', () => {
    it('returns true for statements with promise keywords', () => {
      expect(extractor.isPromiseStatement('帮我记得提醒我给小王发链接')).toBe(true);
      expect(extractor.isPromiseStatement('答应朋友周末去吃饭')).toBe(true);
      expect(extractor.isPromiseStatement('说好了要还书')).toBe(true);
    });

    it('returns false for casual messages', () => {
      expect(extractor.isPromiseStatement('今天天气不错')).toBe(false);
      expect(extractor.isPromiseStatement('你好')).toBe(false);
    });
  });

  describe('extractTarget', () => {
    it('extracts target with 替 给 向 patterns', () => {
      expect(extractor.extractTarget('给 小王发链接')).toBe('小王');
      expect(extractor.extractTarget('向老板汇报')).toBe('老板');
    });

    it('extracts target with 发给 pattern', () => {
      expect(extractor.extractTarget('发给小王')).toBe('小王');
    });

    it('returns undefined when no target found', () => {
      expect(extractor.extractTarget('提醒我')).toBeUndefined();
    });
  });

  describe('extractTime', () => {
    it('parses 明天 correctly', () => {
      const result = extractor.extractTime('明天');
      expect(result).toBeInstanceOf(Date);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(result?.getDate()).toBe(tomorrow.getDate());
    });

    it('parses 今天 correctly', () => {
      const result = extractor.extractTime('今天');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(new Date().getDate());
    });

    it('parses 下午时间 correctly', () => {
      const result = extractor.extractTime('明天下午3点');
      expect(result).toBeInstanceOf(Date);
    });

    it('returns undefined for unrecognized time', () => {
      expect(extractor.extractTime('某天')).toBeUndefined();
    });
  });

  describe('isFieldExplicit', () => {
    it('content: always true when content non-empty', () => {
      expect(extractor.isFieldExplicit('content', 'some content')).toBe(true);
      expect(extractor.isFieldExplicit('content', '')).toBe(false);
    });

    it('target: returns true when target patterns detected', () => {
      expect(extractor.isFieldExplicit('target', '给小王发链接')).toBe(true);
      expect(extractor.isFieldExplicit('target', '提醒我健身')).toBe(false);
    });

    it('due_time: returns true for time keywords', () => {
      expect(extractor.isFieldExplicit('due_time', '明天下午3点')).toBe(true);
      expect(extractor.isFieldExplicit('due_time', '今天')).toBe(true);
      expect(extractor.isFieldExplicit('due_time', '提醒我')).toBe(false);
    });
  });

  describe('extract', () => {
    it('returns extracted promise with all fields', async () => {
      const msg = {
        id: '1',
        userId: 'user1',
        content: '明天给小王发链接',
        timestamp: new Date(),
      };

      const results = await extractor.extract(msg);
      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('明天给小王发链接');
      expect(results[0].targetPerson).toBe('小王');
      expect(results[0].dueAt).toBeInstanceOf(Date);
    });

    it('returns content-only when no target or time', async () => {
      const msg = {
        id: '1',
        userId: 'user1',
        content: '提醒我健身',
        timestamp: new Date(),
      };

      const results = await extractor.extract(msg);
      expect(results[0].content).toBe('提醒我健身');
      expect(results[0].targetPerson).toBeUndefined();
      expect(results[0].dueAt).toBeUndefined();
    });
  });
});