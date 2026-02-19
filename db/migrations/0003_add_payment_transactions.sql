-- ============================================================
-- MTG Automotora - Migracion Payment Transactions
-- Version: 0003
-- Fecha: 2026-02-18
-- Descripcion: Tabla para seguimiento de transacciones de pago
-- ============================================================

-- ============================================================
-- Tabla: payment_transactions
-- Descripcion: Registro de todas las transacciones de pago
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('reservation', 'auction_deposit', 'auction_winner')),
  entity_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'CLP',
  payment_method TEXT,
  payment_id TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
  idempotency_key TEXT UNIQUE,
  metadata TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Indices para optimizacion de consultas
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_payment_transactions_entity ON payment_transactions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_idempotency ON payment_transactions(idempotency_key);
