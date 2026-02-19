-- Seed Admin User for MTG Automotora
-- Migration: seed_admin_user.sql
-- Run this migration to create the initial admin user

-- The admin credentials will be:
-- Email: admin@mtg.cl
-- Password: MTGAdmin2024!

INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@mtg.cl',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.YPvN3IqVhY5Wda',  -- hashed 'MTGAdmin2024!'
  'Administrador',
  'admin',
  datetime('now'),
  datetime('now')
)
ON CONFLICT(email) DO NOTHING;

-- Also create a sales user for testing
INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'vendedor@mtg.cl',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.YPvN3IqVhY5Wda',  -- hashed 'MTGAdmin2024!'
  'Vendedor Demo',
  'sales',
  datetime('now'),
  datetime('now')
)
ON CONFLICT(email) DO NOTHING;
