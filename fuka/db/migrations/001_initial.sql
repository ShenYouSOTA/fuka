-- Fuka Database Schema
-- PostgreSQL

-- Messages storage
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  group_id VARCHAR(64),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_group_id ON messages(group_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Promises (场景1)
CREATE TABLE promises (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  target_person VARCHAR(64),
  due_at TIMESTAMPTZ,
  status VARCHAR(16) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promises_user_id ON promises(user_id);
CREATE INDEX idx_promises_status ON promises(status);
CREATE INDEX idx_promises_due_at ON promises(due_at) WHERE status = 'pending';

-- Interests (场景2)
CREATE TABLE interests (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  group_id VARCHAR(64),
  topic VARCHAR(128) NOT NULL,
  weight FLOAT DEFAULT 1.0,
  last_mentioned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interests_user_id ON interests(user_id);
CREATE INDEX idx_interests_group_id ON interests(group_id);
CREATE INDEX idx_interests_topic ON interests(topic);

-- Profiles (场景3)
CREATE TABLE profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL UNIQUE,
  summary TEXT,
  confidence FLOAT,
  message_count INT DEFAULT 0,
  active_hours JSONB DEFAULT '{}',
  top_topics TEXT[] DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- Interest matches
CREATE TABLE interest_matches (
  id BIGSERIAL PRIMARY KEY,
  group_id VARCHAR(64) NOT NULL,
  user_a VARCHAR(64) NOT NULL,
  user_b VARCHAR(64) NOT NULL,
  shared_topics TEXT[] NOT NULL,
  match_score FLOAT,
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interest_matches_group ON interest_matches(group_id);
CREATE INDEX idx_interest_matches_notified ON interest_matches(notified) WHERE NOT notified;

-- Trigger logs
CREATE TABLE trigger_logs (
  id BIGSERIAL PRIMARY KEY,
  trigger_type VARCHAR(32) NOT NULL,
  source_user_id VARCHAR(64),
  target_user_id VARCHAR(64),
  action_type VARCHAR(32) NOT NULL,
  payload JSONB DEFAULT '{}',
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trigger_logs_executed_at ON trigger_logs(executed_at);
