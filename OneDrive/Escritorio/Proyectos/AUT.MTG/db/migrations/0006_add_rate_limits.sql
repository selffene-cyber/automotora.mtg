-- Migration: Add rate_limits table for auction hardening
-- Date: 2026-02-18
-- Purpose: Store rate limiting data for bid spam prevention

-- Table for rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    `key` TEXT NOT NULL,
    identifier TEXT NOT NULL,
    type TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    window_timestamp INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Index for fast lookups
    INDEX idx_rate_limits_key_window (`key`, window_timestamp),
    INDEX idx_rate_limits_identifier (identifier, type, window_timestamp)
);

-- Add audit action types for rate limiting
-- This is already handled by audit_logs table, no migration needed
