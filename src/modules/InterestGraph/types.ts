export interface InterestRecord {
  userId: string;
  groupId: string;
  topic: string;
  weight: number;
  lastMentioned: Date;
}

export interface GroupMemberRecord {
  userId: string;
  groupId: string;
  topic: string;
  weight: number;
  lastMentioned: Date;
}

export interface MatchRecord {
  id: string;
  userId: string;
  matchedUserId: string;
  groupId: string;
  interest: string;
  status: 'suggested' | 'revealed' | 'completed' | 'declined';
  createdAt: Date;
}

export interface Repository {
  findActive(userId: string, groupId: string): Promise<InterestRecord[]>;
  findByTopic(groupId: string, topic: string): Promise<GroupMemberRecord[]>;
  findPending(userId: string, matchedUserId: string, topic: string): Promise<MatchRecord | null>;
  create(match: Omit<MatchRecord, 'id' | 'createdAt'>): Promise<MatchRecord>;
  decayIfStale(cutoff: Date, decayWeight: number): Promise<void>;
  upsertInterest(userId: string, groupId: string, topic: string, weight: number, messageCount?: number): Promise<void>;
}