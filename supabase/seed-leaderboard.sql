-- Seed dummy users and leaderboard data for testing
-- Run this in Supabase SQL Editor

-- Insert dummy users
INSERT INTO users (wallet_address, username) VALUES
  ('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', 'DegenKing'),
  ('3nFv8E2x9R7qYpLmN4wZjK1cB5hD6gT8sA0oP2uI4yW', 'SolRider'),
  ('9pQw3rT5yU8iO1aS4dF6gH7jK0lZ2xC5vB8nM3qW6eR', 'MoonShot'),
  ('2mN4bV6cX8zL0kJ3hG5fD7sA9qW1eR4tY6uI8oP0lK2j', 'CoinFlip'),
  ('5tR7yU9iO1pA3sD5fG7hJ9kL2zX4cV6bN8mQ0wE3rT5y', 'RaceAce'),
  ('8uI0oP2aS4dF6gH8jK1lZ3xC5vB7nM9qW2eR4tY6uI0o', 'LuckyDegen'),
  ('1qW3eR5tY7uI9oP2aS4dF6gH8jK0lZ3xC5vB7nM9qW1e', 'WhaleWatch'),
  ('4dF6gH8jK0lZ2xC4vB6nM8qW0eR2tY4uI6oP8aS0dF2g', 'TokenHunter'),
  ('6gH8jK0lZ2xC4vB6nM8qW0eR2tY4uI6oP8aS0dF2gH4j', 'SpeedDemon'),
  ('0lZ2xC4vB6nM8qW0eR2tY4uI6oP8aS0dF2gH4jK6lZ8x', 'PumpChaser')
ON CONFLICT (wallet_address) DO NOTHING;

-- Insert leaderboard entries (ordered by total_earned descending)
INSERT INTO leaderboard (wallet_address, degen_score, total_races, wins, win_streak, total_earned) VALUES
  ('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', 150, 30, 12, 4, 8.75),
  ('3nFv8E2x9R7qYpLmN4wZjK1cB5hD6gT8sA0oP2uI4yW', 120, 25, 10, 2, 6.30),
  ('9pQw3rT5yU8iO1aS4dF6gH7jK0lZ2xC5vB8nM3qW6eR', 95,  20, 8,  3, 4.50),
  ('2mN4bV6cX8zL0kJ3hG5fD7sA9qW1eR4tY6uI8oP0lK2j', 80,  18, 7,  1, 3.20),
  ('5tR7yU9iO1pA3sD5fG7hJ9kL2zX4cV6bN8mQ0wE3rT5y', 70,  15, 6,  0, 2.85),
  ('8uI0oP2aS4dF6gH8jK1lZ3xC5vB7nM9qW2eR4tY6uI0o', 55,  12, 5,  2, 2.10),
  ('1qW3eR5tY7uI9oP2aS4dF6gH8jK0lZ3xC5vB7nM9qW1e', 45,  10, 4,  1, 1.65),
  ('4dF6gH8jK0lZ2xC4vB6nM8qW0eR2tY4uI6oP8aS0dF2g', 30,  8,  3,  0, 0.90),
  ('6gH8jK0lZ2xC4vB6nM8qW0eR2tY4uI6oP8aS0dF2gH4j', 20,  6,  2,  1, 0.45),
  ('0lZ2xC4vB6nM8qW0eR2tY4uI6oP8aS0dF2gH4jK6lZ8x', 10,  4,  1,  0, 0.15)
ON CONFLICT (wallet_address) DO UPDATE SET
  degen_score = EXCLUDED.degen_score,
  total_races = EXCLUDED.total_races,
  wins = EXCLUDED.wins,
  win_streak = EXCLUDED.win_streak,
  total_earned = EXCLUDED.total_earned;