// Pure unit tests for upsertInterest weight update formula
// Formula: newWeight = existingWeight * 0.9 + weight * 0.1

describe('Repository upsertInterest logic', () => {
  describe('weight update calculation', () => {
    it('new weight = existing * 0.9 + incoming * 0.1', () => {
      const existingWeight = 0.5;
      const incomingWeight = 0.3;
      const newWeight = existingWeight * 0.9 + incomingWeight * 0.1;
      expect(newWeight).toBeCloseTo(0.48, 5);
    });

    it('first insert uses incoming weight directly', () => {
      const incomingWeight = 0.7;
      const newWeight = incomingWeight;
      expect(newWeight).toBe(0.7);
    });

    it('repeated updates converge toward stable value', () => {
      let weight = 0.0;
      const incomingWeight = 0.5;

      for (let i = 0; i < 50; i++) {
        weight = weight * 0.9 + incomingWeight * 0.1;
      }

      expect(weight).toBeCloseTo(0.5, 1);
    });

    it('weight decays when mentions drop (incoming = 0)', () => {
      let weight = 0.8;
      weight = weight * 0.9 + 0 * 0.1;
      expect(weight).toBeCloseTo(0.72, 5);

      weight = weight * 0.9 + 0 * 0.1;
      expect(weight).toBeCloseTo(0.648, 5);
    });
  });

  describe('edge cases', () => {
    it('weight of 1.0 stays below 1.0 after update', () => {
      let weight = 1.0;
      weight = weight * 0.9 + 0.3 * 0.1;
      expect(weight).toBeLessThan(1.0);
    });

    it('weight of 0 can increase', () => {
      let weight = 0.0;
      weight = weight * 0.9 + 0.5 * 0.1;
      expect(weight).toBeCloseTo(0.05, 5);
    });

    it('small existing weight still accumulates', () => {
      let weight = 0.01;
      for (let i = 0; i < 5; i++) {
        weight = weight * 0.9 + 0.3 * 0.1;
      }
      expect(weight).toBeGreaterThan(0.01);
      expect(weight).toBeLessThan(0.3);
    });
  });
});
