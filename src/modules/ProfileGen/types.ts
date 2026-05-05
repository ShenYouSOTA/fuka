export enum ProfileIntent {
  VIEW = 'profile_view',
  DETAILED = 'profile_detailed',
  REFRESH = 'profile_refresh',
  LIST = 'profile_list',
  CLEAR = 'profile_clear',
}

export interface ProfileHandleInput {
  intent: ProfileIntent;
  targetName?: string;
  targetId?: string;
  viewerId: string;
  messages?: Message[];
}

export interface ProfileHandleOutput {
  summary?: string;
  detailed?: string;
  confidence?: number;
  profiles?: Profile[];
}

export interface Profile {
  id: string;
  userId: string;
  targetId: string;
  groupId?: string;
  summary: string;
  detailed?: string;
  confidence: number;
  messageCount: number;
  activeHours: Record<string, number>; // { "02": 5, "14": 3 }
  topTopics: string[];
  generatedAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  userId: string;
  groupId?: string;
  content: string;
  timestamp: Date;
}