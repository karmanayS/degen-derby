-- Degen Derby: Initial Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE races (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coins JSONB NOT NULL,
  -- coins: [{address, name, symbol, logo, startPrice, endPrice}]
  winning_coin TEXT,
  entry_fee NUMERIC DEFAULT 0.05,
  race_duration INTEGER DEFAULT 300, -- seconds
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'finished')),
  total_pot NUMERIC DEFAULT 0,
  is_vip BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  race_id UUID REFERENCES races(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  picked_coin TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payout NUMERIC,
  tx_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE leaderboard (
  wallet_address TEXT PRIMARY KEY,
  degen_score INTEGER DEFAULT 0,
  total_races INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  win_streak INTEGER DEFAULT 0,
  total_earned NUMERIC DEFAULT 0
);

CREATE TABLE race_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  race_id UUID REFERENCES races(id) ON DELETE CASCADE,
  prices JSONB NOT NULL,
  -- prices: [{symbol, address, price, percentChange}]
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_races_status ON races(status);
CREATE INDEX idx_races_start_time ON races(start_time DESC);
CREATE INDEX idx_bets_race_id ON bets(race_id);
CREATE INDEX idx_bets_wallet ON bets(wallet_address);
CREATE INDEX idx_race_prices_race_id ON race_prices(race_id);
CREATE INDEX idx_race_prices_recorded ON race_prices(recorded_at DESC);
CREATE INDEX idx_leaderboard_score ON leaderboard(degen_score DESC);

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Increment race pot atomically
CREATE OR REPLACE FUNCTION increment_pot(race_id UUID, amount NUMERIC)
RETURNS void AS $$
BEGIN
  UPDATE races SET total_pot = total_pot + amount WHERE id = race_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update or insert leaderboard entry after a race
CREATE OR REPLACE FUNCTION update_leaderboard(
  p_wallet TEXT,
  p_won BOOLEAN,
  p_earned NUMERIC DEFAULT 0
)
RETURNS void AS $$
BEGIN
  INSERT INTO leaderboard (wallet_address, degen_score, total_races, wins, win_streak, total_earned)
  VALUES (
    p_wallet,
    CASE WHEN p_won THEN 10 ELSE 1 END,
    1,
    CASE WHEN p_won THEN 1 ELSE 0 END,
    CASE WHEN p_won THEN 1 ELSE 0 END,
    p_earned
  )
  ON CONFLICT (wallet_address) DO UPDATE SET
    degen_score = leaderboard.degen_score + CASE WHEN p_won THEN 10 ELSE 1 END,
    total_races = leaderboard.total_races + 1,
    wins = leaderboard.wins + CASE WHEN p_won THEN 1 ELSE 0 END,
    win_streak = CASE
      WHEN p_won THEN leaderboard.win_streak + 1
      ELSE 0
    END,
    total_earned = leaderboard.total_earned + p_earned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_prices ENABLE ROW LEVEL SECURITY;

-- Races: everyone can read, only service role can write
CREATE POLICY "races_read" ON races FOR SELECT USING (true);
CREATE POLICY "races_service_write" ON races FOR ALL USING (true) WITH CHECK (true);

-- Bets: everyone can read, anyone can insert (app validates wallet ownership via MWA)
CREATE POLICY "bets_read" ON bets FOR SELECT USING (true);
CREATE POLICY "bets_insert" ON bets FOR INSERT WITH CHECK (true);
CREATE POLICY "bets_service_update" ON bets FOR UPDATE USING (true) WITH CHECK (true);

-- Leaderboard: everyone can read, only service role can write
CREATE POLICY "leaderboard_read" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "leaderboard_service_write" ON leaderboard FOR ALL USING (true) WITH CHECK (true);

-- Race prices: everyone can read, only service role can write
CREATE POLICY "race_prices_read" ON race_prices FOR SELECT USING (true);
CREATE POLICY "race_prices_service_write" ON race_prices FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- REALTIME
-- ============================================

-- Enable realtime for race_prices (live race updates) and races (status changes)
ALTER PUBLICATION supabase_realtime ADD TABLE race_prices;
ALTER PUBLICATION supabase_realtime ADD TABLE races;
ALTER PUBLICATION supabase_realtime ADD TABLE bets;