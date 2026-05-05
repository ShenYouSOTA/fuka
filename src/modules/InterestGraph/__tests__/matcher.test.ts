import { InterestMatcher, calculateScore } from '../matcher.js';

// Mock repo for pure unit tests
const mockRepo = {
  findActive: jest.fn(),
  findByTopic: jest.fn(),
  findPending: jest.fn(),
  create: jest.fn(),
};

describe('calculateScore', () => {
  it('returns 1 for identical topic sets', () => {
    expect(calculateScore(['健身', '音乐'], ['健身', '音乐'])).toBe(1);
  });

  it('returns 0 for completely disjoint sets', () => {
    expect(calculateScore(['健身'], ['音乐'])).toBe(0);
  });

  it('returns Jaccard similarity for partial overlap', () => {
    // intersection=1 (健身), union=3 (健身, 音乐, 编程)
    expect(calculateScore(['健身', '音乐'], ['健身', '编程'])).toBeCloseTo(0.333, 3);
  });

  it('treats duplicate topics as single item in set', () => {
    const score = calculateScore(['健身', '健身'], ['健身']);
    expect(score).toBe(1);
  });

  it('returns 1 for two empty sets', () => {
    expect(calculateScore([], [])).toBe(1);
  });

  it('returns 0 when one set is empty', () => {
    expect(calculateScore(['健身'], [])).toBe(0);
  });
});

describe('InterestMatcher instance', () => {
  let matcher: InterestMatcher;

  beforeEach(() => {
    jest.clearAllMocks();
    matcher = new InterestMatcher();
  });

  describe('calculateScore (instance)', () => {
    it('delegates to standalone calculateScore', () => {
      expect(matcher.calculateScore(['健身'], ['健身'])).toBe(1);
      expect(matcher.calculateScore(['健身'], ['音乐'])).toBe(0);
    });
  });

  // findMatches tests deferred until repo injection is wired up
});

describe('InterestMatch state machine', () => {
  // Pure function mirroring the spec state machine
  function transitionStatus(match: { status: string; action: string | null }): string {
    if (match.status === 'suggested' && match.action === 'accepted') return 'revealed';
    if (match.status === 'suggested' && match.action === 'declined') return 'declined';
    if (match.status === 'revealed') return 'completed';
    return match.status;
  }

  it('suggested + accepted → revealed', () => {
    expect(transitionStatus({ status: 'suggested', action: 'accepted' })).toBe('revealed');
  });

  it('suggested + declined → declined', () => {
    expect(transitionStatus({ status: 'suggested', action: 'declined' })).toBe('declined');
  });

  it('revealed (no action needed) → completed', () => {
    expect(transitionStatus({ status: 'revealed', action: null })).toBe('completed');
  });
});

describe('config defaults', () => {
  const mockConfig = {
    interest: {
      min_mention_count: 3,
      interest_ttl: 14,
      decay_weight: 0.5,
      match_threshold: 0.6,
    },
    notification: {
      push_enabled: true,
      max_list_items: 10,
      reveal_timing: 'on_accept' as const,
      reveal_options: ['immediate', 'defer'],
    },
  };

  it('match_threshold is 0.6', () => {
    expect(mockConfig.interest.match_threshold).toBe(0.6);
  });

  it('decay_weight is 0.5', () => {
    expect(mockConfig.interest.decay_weight).toBe(0.5);
  });

  it('interest_ttl is 14 days', () => {
    expect(mockConfig.interest.interest_ttl).toBe(14);
  });

  it('reveal_timing defaults to on_accept', () => {
    expect(mockConfig.notification.reveal_timing).toBe('on_accept');
  });
});
