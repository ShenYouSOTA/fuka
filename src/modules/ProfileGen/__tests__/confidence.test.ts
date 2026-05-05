import { ConfidenceCalculator } from '../confidence.js';

describe('ConfidenceCalculator', () => {
  const calc = new ConfidenceCalculator();

  describe('calculate', () => {
    it('countScore = 0.7 when messageCount >= 30', () => {
      const result = calc.calculate(30, 0);
      expect(result).toBe(1.0); // 0.7 + 0.3
    });

    it('countScore = 0.35 when messageCount = 15', () => {
      const result = calc.calculate(15, 0);
      expect(result).toBe(0.65); // 0.35 + 0.3
    });

    it('recencyScore = 0.3 when windowDays = 0', () => {
      const result = calc.calculate(30, 0);
      expect(result).toBe(1.0);
    });

    it('recencyScore = 0 when windowDays >= 30', () => {
      const result = calc.calculate(30, 30);
      expect(result).toBe(0.7);
    });

    it('recencyScore decays linearly', () => {
      const d15 = calc.calculate(30, 15);
      expect(d15).toBe(0.85); // 0.7 + 0.15
    });

    it('returns rounded to 2 decimals', () => {
      const result = calc.calculate(10, 5);
      // countScore = 10/30 * 0.7 = 0.2333
      // recencyScore = (1 - 5/30) * 0.3 = 0.25
      // total = 0.4833 -> rounds to 0.48
      expect(result).toBe(0.48);
    });
  });
});