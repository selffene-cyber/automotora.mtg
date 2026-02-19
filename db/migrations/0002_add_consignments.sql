-- ============================================================
-- MTG Automotora - Migracion Consignments
-- Version: 0002
-- Fecha: 2026-02-18
-- Descripcion: Tablas para gestion de consignaciones de vehiculos
-- ============================================================

-- ============================================================
-- Tabla: consignments
-- Descripcion: Consignaciones de vehiculos de clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS consignments (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT NULL REFERENCES vehicles(id),
    owner_name TEXT NOT NULL,
    owner_email TEXT NULL,
    owner_phone TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    expected_price INTEGER NULL,
    notes TEXT NULL,
    status TEXT DEFAULT 'received' CHECK(status IN ('received','under_review','approved','rejected','published')),
    reviewed_by TEXT NULL REFERENCES users(id),
    reviewed_at TEXT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Tabla: consignment_photos
-- Descripcion: Fotos de vehiculos en consignacion
-- ============================================================
CREATE TABLE IF NOT EXISTS consignment_photos (
    id TEXT PRIMARY KEY,
    consignment_id TEXT NOT NULL REFERENCES consignments(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Indices para optimizacion de consultas
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_consignments_status ON consignments(status);
CREATE INDEX IF NOT EXISTS idx_consignments_created_at ON consignments(created_at);
CREATE INDEX IF NOT EXISTS idx_consignments_reviewed_at ON consignments(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_consignments_owner_phone ON consignments(owner_phone);
CREATE INDEX IF NOT EXISTS idx_consignment_photos_consignment_id ON consignment_photos(consignment_id);
