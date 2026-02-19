-- ============================================================
-- MTG Automotora - Migracion Inicial D1
-- Version: 0001
-- Fecha: 2026-02-18
-- Descripcion: Creacion de tablas base para el MVP
-- ============================================================

-- ============================================================
-- Tabla: users
-- Descripcion: Usuarios del sistema (admin, sales, ops)
-- ============================================================
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'sales' CHECK(role IN ('admin', 'sales', 'ops')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Tabla: vehicles
-- Descripcion: Inventario de vehiculos
-- ============================================================
CREATE TABLE vehicles (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    price INTEGER NOT NULL,
    mileage_km INTEGER,
    transmission TEXT CHECK(transmission IN ('manual', 'auto')),
    fuel_type TEXT,
    region TEXT,
    city TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'reserved', 'sold', 'hidden', 'archived')),
    description TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Tabla: vehicle_photos
-- Descripcion: Fotos de vehiculos almacenadas en R2
-- ============================================================
CREATE TABLE vehicle_photos (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Tabla: leads
-- Descripcion: Contactos potenciales / Pipeline de ventas
-- ============================================================
CREATE TABLE leads (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT REFERENCES vehicles(id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    source TEXT,
    status TEXT DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'scheduled', 'closed_won', 'closed_lost')),
    notes TEXT,
    assigned_to TEXT REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Tabla: reservations
-- Descripcion: Reservas con abono de vehiculos
-- ============================================================
CREATE TABLE reservations (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
    user_id TEXT REFERENCES users(id),
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending_payment' CHECK(status IN ('pending_payment', 'paid', 'confirmed', 'expired', 'cancelled', 'refunded')),
    payment_id TEXT,
    idempotency_key TEXT UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Tabla: documents
-- Descripcion: Documentos asociados a vehiculos
-- ============================================================
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    type TEXT CHECK(type IN ('contract', 'checklist', 'inspection', 'registration', 'other')),
    url TEXT,
    uploaded_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Tabla: audit_logs
-- Descripcion: Registro de auditoria para cambios en entidades
-- ============================================================
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('created', 'updated', 'deleted', 'status_changed')),
    old_value TEXT,
    new_value TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Indices para vehicles
-- ============================================================
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_created_at ON vehicles(created_at);
CREATE INDEX idx_vehicles_brand_model ON vehicles(brand, model);

-- ============================================================
-- Indices para vehicle_photos
-- ============================================================
CREATE INDEX idx_vehicle_photos_vehicle_id ON vehicle_photos(vehicle_id);

-- ============================================================
-- Indices para leads
-- ============================================================
CREATE INDEX idx_leads_vehicle_id ON leads(vehicle_id);
CREATE INDEX idx_leads_status ON leads(status);

-- ============================================================
-- Indices para reservations
-- ============================================================
CREATE INDEX idx_reservations_vehicle_id ON reservations(vehicle_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_created_at ON reservations(created_at);

-- ============================================================
-- Indices para documents
-- ============================================================
CREATE INDEX idx_documents_vehicle_id ON documents(vehicle_id);

-- ============================================================
-- Indices para audit_logs
-- ============================================================
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
