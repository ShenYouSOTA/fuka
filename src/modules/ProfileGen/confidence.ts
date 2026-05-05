export class ConfidenceCalculator {
  calculate(messageCount: number, windowDays: number): number {
    const countScore = Math.min(messageCount / 30, 1.0) * 0.7;
    const recencyScore = Math.max(0, 1 - windowDays / 30) * 0.3;
    return Math.round((countScore + recencyScore) * 100) / 100;
  }
}
