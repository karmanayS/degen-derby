-- Users table for storing usernames
CREATE TABLE users (
  wallet_address TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_username ON users(username);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Everyone can read users
CREATE POLICY "users_read" ON users FOR SELECT USING (true);

-- Anyone can insert (app validates wallet ownership via MWA)
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);