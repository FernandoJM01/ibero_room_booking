-- Migration: Add password reset token columns
-- Run on existing databases that were created before reset tokens were added.
-- Idempotent (uses IF NOT EXISTS).

ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_reset_token
  ON users(reset_token_hash) WHERE reset_token_hash IS NOT NULL;
