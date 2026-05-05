import { InterestTagger, type InterestTag } from '../tagger.js';

describe('InterestTagger', () => {
  describe('updateWeight', () => {
    it('returns 0.1 for no existing weight and 1 mention', () => {
      expect(new InterestTagger().updateWeight(0, 1)).toBeCloseTo(0.1);
    });

    it('accumulates weight with repeated mentions', () => {
      const tagger = new InterestTagger();
      let weight = tagger.updateWeight(0, 1); // 0.1
      weight = tagger.updateWeight(weight, 1); // 0.1*0.9 + 0.1 = 0.19
      weight = tagger.updateWeight(weight, 1); // 0.19*0.9 + 0.1 = 0.271
      expect(weight).toBeCloseTo(0.271, 3);
    });

    it('weight plateaus toward 1.0 with many mentions', () => {
      const tagger = new InterestTagger();
      let weight = 0;
      for (let i = 0; i < 100; i++) {
        weight = tagger.updateWeight(weight, 1);
      }
      expect(weight).toBeLessThan(1);
      expect(weight).toBeGreaterThan(0.9);
    });

    it('weight decays when mentions drop to 0', () => {
      const tagger = new InterestTagger();
      // Build up weight first
      let weight = 0;
      for (let i = 0; i < 50; i++) {
        weight = tagger.updateWeight(weight, 1);
      }
      // Simulate decay when no new mentions (mentions=0) → weight *= 0.9
      const decayedOnce = tagger.updateWeight(weight, 0);
      expect(decayedOnce).toBeLessThan(weight);
      expect(decayedOnce).toBeGreaterThan(0.5); // was ~0.9, one decay → ~0.81
    });
  });
});
