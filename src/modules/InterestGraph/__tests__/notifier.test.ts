import { InterestNotifier } from '../notifier.js';
import type { MatchResult } from '../matcher.js';

describe('InterestNotifier', () => {
  let notifier: InterestNotifier;
  let mockBrain: { notify: jest.Mock };

  beforeEach(() => {
    mockBrain = { notify: jest.fn().mockResolvedValue(undefined) };
    notifier = new InterestNotifier(mockBrain as any);
  });

  it('calls brain.notify with match and groupId', async () => {
    const match: MatchResult = {
      userA: 'user1',
      userB: 'user2',
      sharedTopics: ['健身', '音乐'],
      matchScore: 0.75,
    };

    await notifier.notifyMatch(match, 'group-A');

    expect(mockBrain.notify).toHaveBeenCalledTimes(1);
    expect(mockBrain.notify).toHaveBeenCalledWith({
      type: 'interest_match',
      payload: { match, groupId: 'group-A' },
    });
  });

  it('propagates errors from brain.notify', async () => {
    mockBrain.notify.mockRejectedValue(new Error('QQ offline'));
    const match: MatchResult = {
      userA: 'user1',
      userB: 'user2',
      sharedTopics: ['健身'],
      matchScore: 0.8,
    };

    await expect(notifier.notifyMatch(match, 'group-A')).rejects.toThrow('QQ offline');
  });
});
