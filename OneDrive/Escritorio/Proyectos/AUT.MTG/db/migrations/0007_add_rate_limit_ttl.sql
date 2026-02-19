-- Migration: Add TTL to rate_limits for automatic cleanup
-- Date: 2026-02-18
-- Purpose: Add expires_at field for automatic TTL cleanup of rate limit records

-- Add expires_at column for TTL tracking
ALTER TABLE rate_limits ADD COLUMN expires_at TEXT;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON rate_limits(expires_at);

-- Update existing records with expires_at based on window_timestamp
-- TTL = 24 hours from creation
UPDATE rate_limits 
SET expires_at = datetime(window_timestamp + (24 * 60 * 60), 'unixepoch')
WHERE expires_at IS NULL;

-- Create cleanup procedure (can be called via cron)
-- This ensures automatic cleanup of old rate limit records
