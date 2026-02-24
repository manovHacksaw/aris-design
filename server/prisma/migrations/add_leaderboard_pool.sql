-- Add leaderboardPool column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS "leaderboardPool" DOUBLE PRECISION;

-- Add leaderboardPoolUsdc column to event_rewards_pools table
ALTER TABLE event_rewards_pools ADD COLUMN IF NOT EXISTS "leaderboardPoolUsdc" DOUBLE PRECISION DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN events."leaderboardPool" IS 'Only for post_and_vote - separate pool for top 3 creators (50/35/15)';
COMMENT ON COLUMN event_rewards_pools."leaderboardPoolUsdc" IS 'Leaderboard pool for top 3 creators in USDC (50/35/15 split)';
