-- ============================================================
-- MTG Automotora - Migration 0005
-- Auction Deposit Payment Fields
-- Version: 0005
-- Fecha: 2026-02-18
-- Descripcion: Agrega campos adicionales para pagos de deposito en subastas
-- ============================================================

-- Agregar columnas faltantes a payment_transactions
-- provider: proveedor de pago (webpay, mercadopago, mock)
-- webhook_payload: payload completo del webhook para auditoria
-- confirmed_at: fecha de confirmacion del pago

ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'mock' CHECK(provider IN ('webpay', 'mercadopago', 'mock'));

ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS webhook_payload TEXT;

ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS confirmed_at TEXT;

-- Crear indice para busquedas por auction deposits
CREATE INDEX IF NOT EXISTS idx_payment_auction_deposit ON payment_transactions(entity_type, entity_id) WHERE entity_type = 'auction_deposit';

-- Actualizar auctions para agregar columna de precio final
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS final_price INTEGER;

-- ============================================================
-- Tabla: auction_payment_attempts
-- Registro de intentos de pago por auction (para debugging)
-- ============================================================
CREATE TABLE IF NOT EXISTS auction_payment_attempts (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL,
  payment_transaction_id TEXT,
  amount INTEGER NOT NULL,
  provider TEXT DEFAULT 'mock',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  payment_url TEXT,
  expires_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_auction_payment_attempts_auction ON auction_payment_attempts(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_payment_attempts_status ON auction_payment_attempts(status);
