import { InterestNotifier } from '../notifier.js';
import type { MatchResult } from '../matcher.js';

describe('InterestNotifier', () => {
  describe('notifyMatch', () => {
    it('calls brain.notify with match and groupId', async () => {
      let receivedArgs: unknown = null;
      const mockNotify = async (args: unknown) => { receivedArgs = args; };
      const notifier = new InterestNotifier({ notify: mockNotify } as any);

      const match: MatchResult = {
        userA: 'user1',
        userB: 'user2',
        sharedTopics: ['健身', '音乐'],
        matchScore: 0.75,
      };

      await notifier.notifyMatch(match, 'group-A');

      expect(receivedArgs).toEqual({
        type: 'interest_match',
        payload: { match, groupId: 'group-A' },
      });
    });

    it('propagates errors from brain.notify', async () => {
      const mockNotify = async () => { throw new Error('QQ offline'); };
      const notifier = new InterestNotifier({ notify: mockNotify } as any);

      const match: MatchResult = {
        userA: 'user1',
        userB: 'user2',
        sharedTopics: ['健身'],
        matchScore: 0.8,
      };

      await expect(notifier.notifyMatch(match, 'group-A')).rejects.toThrow('QQ offline');
    });
  });
});
