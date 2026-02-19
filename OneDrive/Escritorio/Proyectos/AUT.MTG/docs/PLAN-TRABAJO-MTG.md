# PLAN DE TRABAJO - MTG Automotora

> **Version:** 1.3  
> **Fecha:** 2026-02-18  
> **Stack:** Next.js + Cloudflare Pages + D1 + R2  
> **Repositorio:** https://github.com/selffene-cyber/automotora.mtg.git

---

## 1. Resumen Ejecutivo

### Objetivo del Proyecto
Plataforma marketplace automotriz para MTG SpA que permite:
- Catalogo-publico de vehiculos usados con filtros avanzados
- Sistema de reservas con abono (no compra total)
- Panel admin para gestion de inventario y leads
- Preparacion para modulos de consignacion y subastas

### Enfoque por Fases

| Fase | Alcance | Meta |
|------|---------|------|
| **MVP** | Catalogo + Reserva + Admin + Leads | Lanzamiento funcional |
| **Fase 2** | Consignacion + Subastas | Expansion de servicios |
| **Fase 3** | Rifas (condicional legal) | Solo si se valida legalmente |

---

## 2. MVP - Fase Prioritaria

### 2.1 Modulos del MVP

#### A) Catalogo Publico (`/catalogo`)
- Grid de vehiculos disponibles
- Filtros: precio, marca, modelo, ano, km, region
- Orden: precio (asc/desc), mas recientes
- SEO: slug unico por vehiculo (`/auto/[slug]`)

#### B) Ficha de Vehiculo (`/auto/[slug]`)
- Fotos (carrusel)
- Datos: VIN, km, ano, patente, region, descripcion
- Boton "Reservar" -> flujo de abono
- Boton "Hablar por WhatsApp"
- Descargar "Ficha MTG" (PDF)

#### C) Reserva con Abono
**Flujo:**
```
1. Seleccionar vehiculo
2. Completar datos cliente (nombre, email, telefono)
3. Pagar abono (webhook de confirmacion)
4. Agendar visita/videollamada
```

**Reglas:**
- Abono debe ser configurable (ej: $50.000 CLP)
- Reservas expiran en 48 horas
- Solo vehiculos en estado `published` son reservables
- Confirmacion de pago **exclusivamente** via webhook

#### D) Panel Admin (`/admin`)
- CRUD completo de vehiculos
- Carga de fotos drag & drop (optimizado movil)
- Gestion de leads (pipeline)
- Documentos por vehiculo

#### E) Modulo Leads
- Tracking de contactos (WhatsApp/email)
- Pipeline: new -> contacted -> scheduled -> closed_won / closed_lost
- Vinculacion a vehiculo
- Preparacion para N8N/Gemini (no implementado en MVP)

---

### 2.2 Modelo de Datos D1

#### Tabla: `vehicles`
```sql
CREATE TABLE vehicles (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  price INTEGER NOT NULL,
  km INTEGER,
  vin TEXT,
  plate TEXT,
  region TEXT,
  description TEXT,
  status TEXT DEFAULT 'draft' 
    CHECK(status IN ('draft','published','hidden','reserved','sold','archived')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_brand ON vehicles(brand);
CREATE INDEX idx_vehicles_price ON vehicles(price);
```

#### Tabla: `vehicle_photos`
```sql
CREATE TABLE vehicle_photos (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  url TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_photos_vehicle ON vehicle_photos(vehicle_id);
```

#### Tabla: `users`
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'sales' 
    CHECK(role IN ('admin','sales','ops')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabla: `reservations`
```sql
CREATE TABLE reservations (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  user_id TEXT REFERENCES users(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending_payment' 
    CHECK(status IN ('pending_payment','paid','confirmed','expired','cancelled','refunded')),
  expires_at TEXT NOT NULL,
  payment_id TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reservations_vehicle ON reservations(vehicle_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_expires ON reservations(expires_at);
```

#### Tabla: `leads`
```sql
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT REFERENCES vehicles(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  source TEXT,
  status TEXT DEFAULT 'new' 
    CHECK(status IN ('new','contacted','scheduled','closed_won','closed_lost')),
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_vehicle ON leads(vehicle_id);
```

> **IMPORTANTE: Indices Criticos para Rendimiento**
>
> Sin estos indices, el rendimiento fallara con >5,000 vehiculos.

```sql
-- vehicles
INDEX idx_vehicles_status (status)
INDEX idx_vehicles_created_at (created_at)
INDEX idx_vehicles_brand_model (brand, model)

-- reservations
INDEX idx_reservations_vehicle_id (vehicle_id)
INDEX idx_reservations_status (status)
INDEX idx_reservations_created_at (created_at)

-- auctions
INDEX idx_auctions_vehicle_id (vehicle_id)
INDEX idx_auctions_status (status)
INDEX idx_auctions_end_time (end_time)

-- leads
INDEX idx_leads_vehicle_id (vehicle_id)
INDEX idx_leads_status (status)
```

#### Tabla: `documents`
```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

### 2.3 Maquinas de Estado

#### 2.3.1 Maquina de Estados de Vehiculos

**Estados disponibles:**
- `draft` - Borrador (no visible publicamente)
- `published` - Publicado (visible en catalogo)
- `hidden` - Oculto (admin lo oculta del publica)
- `reserved` - Reservado (reserva activa con pago confirmado)
- `sold` - Vendido
- `archived` - Archivado (historico/retirado de operacion, no a la venta)

**Regla de Identidad de Estado Reservado:**
> Un vehiculo se considera "reservado" cuando existe una reserva activa asociada.
> No almacenar `reserved` en `vehicle.status`; en su lugar, verificar:
> ```sql
> SELECT id FROM reservations 
> WHERE vehicle_id = ? 
> AND status IN ('pending_payment', 'paid', 'confirmed')
> LIMIT 1
> ```

**Regla de Estado Terminal - archived:**
> `archived` es un estado terminal absoluto.
> - No puede volver a ningun otro estado
> - Solo el rol `admin` puede archivar
> - No hay transicion de salida desde `archived`
> - Un vehiculo archivado queda fuera de operacion permanentemente

```
+---------+           +-----------+            +---------------------+          +---------+
| draft   | --------> | published | ---------> | reserved_pending_   | -------> | reserved| --> sold
+---------+           +-----------+            |     payment         |          +---------+
      |                   |                    +---------------------+               |
      | hide              | cancel                          |                         |
      |                   |                                 | cancel                  |
      v                   v                                 v                         v
+-----------+         +--------+                      +------------+             +-----------+
|  hidden   |         | hidden |                      |  expired   |             | cancelled |
+-----------+         +--------+                      +------------+             +-----------+
       |                   |                                                         ^
       |                   | submit auction                                         |
       |                   v                                                         |
       |              +----------------+                                            |
       +----------->  | auction_pending | <-----------------------------------------+
                      +----------------+
                           |
                           | auction starts
                           v
                    (becomes auction)
```

**Nota:** El estado de la subasta vive en la tabla `auctions.status`, NO en `vehicle.status`. Si existe una subasta activa o programada (`auctions.status` IN ('active', 'scheduled')) para un `vehicle_id`, se bloquean nuevas reservas.

**Transiciones permitidas:**
| Desde | Hacia | Condicion |
|-------|-------|-----------|
| draft | published | Usuario admin |
| draft | hidden | Usuario admin |
| draft | archived | Usuario archiva |
| draft | archived | Admin archiva (solo admin) |
| published | reserved | Reserva activa detectada |
| published | hidden | Usuario admin |
| published | archived | Admin archiva (solo admin) |
| published | sold | Venta concretada |
| reserved | published | Reserva cancelada/expirada (libera vehiculo) |
| reserved | sold | Venta concretada |
| hidden | archived | Admin archiva (solo admin) |
| hidden | published | Admin re-publica |
| sold | (terminal) | Estado final |
| archived | (terminal) | Estado terminal - NO hay transicion de salida |

#### 2.3.2 Maquina de Estados de Reservas

**Definicion de Reserva Activa:**
> **Reserva activa =** `reservation.status` IN ('pending_payment', 'paid', 'confirmed')
>
> Esta definicion se usa en todos los guards y restricciones del sistema.

**Estados disponibles:**
- `pending_payment` - Iniciada, esperando pago
- `paid` - Pago recibido (webhook confirmado)
- `confirmed` - Pago confirmado, visita agendada
- `expired` - TTL excedido sin pago
- `cancelled` - Cancelada manualmente
- `refunded` - Pago reversado

```
+------------------+   payment   +-----+   confirm   +----------+
| pending_payment  | ----------> | paid| ----------> |confirmed |
+------------------+             +-----+             +----------+
        |                               |                     |
        | expire (48h)                  | cancel              | complete
        v                               v                     v
+-------------+               +-------------+          +---------+
|   expired   |               | cancelled   |          |  (done) |
+-------------+               +-------------+          +---------+
        |                               |
        | refund                       | refund
        v                               v
+-------------+               +-------------+
|  refunded   |               |  refunded   |
+-------------+               +-------------+
```

**Transiciones permitidas:**
| Desde | Hacia | Condicion |
|-------|-------|-----------|
| pending_payment | paid | Webhook de pago recibido |
| pending_payment | expired | TTL de 48h excedido |
| paid | confirmed | Admin confirma visita agendada |
| paid | cancelled | Admin cancela reserva |
| paid | refunded | Reembolso procesado |
| confirmed | (terminal) | Reserva completada |
| expired | cancelled | Cambio manual |
| cancelled | pending_payment | Reintento de pago |
| refunded | (terminal) | Estado final |

**Reglas:**
- Solo vehiculos en estado `published` pueden ser reservados
- Tiempo de expiracion: 48 horas desde creacion
- Cambio de estado vehicle->reserved solo tras webhook de pago confirmado
- No permitir double-booking (verificar disponibilidad en el momento del pago)
- **Idempotency key obligatorio** para evitar cobros duplicados
- **Transiciones solo hacia adelante**: pending_payment → paid → confirmed
- **Estados terminales manuales**: cancelled, refunded (no se pueden revertir automaticamente)
- **Webhook repetido**: debe ser ignorado (no cambiar estado ni duplicar reserva)

#### 2.3.3 Maquina de Estados de Subastas

**Definicion de Subasta Activa:**
> **Subasta activa =** `auction.status` IN ('scheduled', 'active', 'ended_pending_payment')
>
> Esta definicion se usa en todos los guards y restricciones del sistema.

**Estados disponibles:**
- `scheduled` - Subasta planificada, no iniciada
- `active` - Subasta en vivo con pujas
- `ended_pending_payment` - Subasta cerrada, ganador debe pagar deposito
- `closed_won` - Ganador completo el pago
- `closed_failed` - Ganador no pago a tiempo
- `cancelled` - Subasta cancelada por admin

```
+------------+         +--------+         +--------------------+         +---------+
| scheduled  | ------> | active | ------> | ended_pending_     | ------> | closed_ |
+------------+         +--------+         |     payment        |         |   won   |
      |                   |                +--------------------+         +---------+
      | cancel            | cancel                       |                     |
      v                   v                               | pay                 | complete
+-------------+         +---------+                       v                     v
| cancelled   |         |cancelled|              +-----------------+    +---------+
+-------------+         +---------+              |  closed_failed  |    |  (done) |
                                                  +-----------------+     +---------+
```

**Transiciones permitidas:**
| Desde | Hacia | Condicion |
|-------|-------|-----------|
| scheduled | active | Tiempo de inicio alcanzado |
| scheduled | cancelled | Admin cancela antes de iniciar |
| active | ended_pending_payment | Tiempo de fin alcanzado |
| active | cancelled | Admin cancela durante sesion |
| ended_pending_payment | closed_won | Ganador completa deposito |
| ended_pending_payment | closed_failed | TTL de pago excedido (24h) |
| closed_won | (terminal) | Subasta completada |
| closed_failed | published | Vehiculo vuelve al catalogo |

**Reglas:**
- Solo vehiculos en estado `published` o `auction_pending` pueden subastarse
- Pujas deben ser > ultimo monto + incremento minimo
- No permitir pujas despues de `end_time`
- Ganador tiene 24 horas para completar deposito
- Cierre automatico cambia vehiculo a `reserved` (reserva activa del ganador)

#### Tabla: `auctions`
```sql
CREATE TABLE auctions (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  starting_price INTEGER NOT NULL,
  min_increment INTEGER DEFAULT 100000,
  deposit_amount INTEGER DEFAULT 50000,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled' 
    CHECK(status IN ('scheduled','active','ended_pending_payment','closed_won','closed_failed','cancelled')),
  winner_id TEXT REFERENCES users(id),
  winner_bid_id TEXT REFERENCES bids(id),
  final_price INTEGER,
  payment_expires_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_auctions_vehicle ON auctions(vehicle_id);
CREATE INDEX idx_auctions_end_time ON auctions(end_time);
```

#### Tabla: `bids`
```sql
CREATE TABLE bids (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL REFERENCES auctions(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  is_winner BOOLEAN DEFAULT FALSE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bids_auction ON bids(auction_id);
CREATE INDEX idx_bids_amount ON bids(amount DESC);
```

#### 2.3.4 Pipeline de Leads
```
+------+   contact   +-----------+   schedule   +-----------+
| new  | ---------->| contacted | ------------>| scheduled |
+------+             +-----------+               +-----------+
                                                        |
                                            +-----------+-----------+
                                            |                       |
                                        close_won              close_lost
                                            |                       |
                                            v                       v
                                       +----------+           +----------+
                                       | closed_  |           | closed_  |
                                       |   won   |           |   lost   |
                                       +----------+           +----------+
```

**Reglas:**
- Nunca eliminar leads (usar archivado)
- Cada lead debe tener vehicle_id opcional
- Registrar fecha de cambio de estado

---

## 2.4 Reglas de Exclusion Entre Modulos

### 2.4.1 Reglas Fundamentales

| Regla | Descripcion |
|-------|-------------|
| **VEHICULO_PUBLICADO** | Un vehiculo puede tener UNA reserva activa MAXIMO (1:1). Si hay reserva activa → no se puede iniciar subasta |
| **VEHICULO_PUBLICADO** | Un vehiculo puede tener UNA subasta activa MAXIMO (1:1). Si hay subasta activa → no se puede crear nueva reserva |
| **SUBASTA_BLOQUEA_RESERVA** | Si `auctions.status` IN ('active', 'scheduled') para un `vehicle_id`, se bloquean nuevas reservas |
| **RESERVA_BLOQUEA_SUBASTA** | Si el vehiculo tiene reserva activa (`reservations.status` IN ('pending_payment', 'paid', 'confirmed')), se bloquean nuevas subastas |
| **EXCLUSIVIDAD** | Un vehiculo NO puede tener reserva Y subasta activas simultaneamente |

### 2.4.2 Matriz de Compatibilidad de Estados

| Estado del Vehiculo | Reserva Activa | Subasta Activa (en auctions table) |
|---------------------|----------------|-------------------------------------|
| draft | NO | NO |
| published | **SI** (1 maxima, si no hay subasta activa) | **SI** (1 maxima, si no hay reserva activa) |
| hidden | NO | **SI** (1 maxima) |
| reserved | **SI** (misma reserva activa) | NO |
| sold | NO | NO |
| archived | NO | NO |

**Nota:** Para determinar si un vehiculo esta "reservado", verificar:
```sql
EXISTS(SELECT 1 FROM reservations WHERE vehicle_id = X AND status IN ('pending_payment', 'paid', 'confirmed'))
```

### 2.4.3 Logica de Transicion

```typescript
// Pseudocodigo de validacion

// Verificar si el vehiculo tiene una subasta activa o programada
function hasActiveOrScheduledAuction(db: D1Database, vehicleId: string): boolean {
  const result = db.prepare(`
    SELECT id FROM auctions 
    WHERE vehicle_id = ? 
    AND status IN ('active', 'scheduled')
    LIMIT 1
  `).bind(vehicleId).first();
  return !!result;
}

// Verificar si el vehiculo tiene una reserva activa
function hasActiveReservation(db: D1Database, vehicleId: string): boolean {
  const result = db.prepare(`
    SELECT id FROM reservations 
    WHERE vehicle_id = ? 
    AND status IN ('pending_payment', 'paid', 'confirmed')
    LIMIT 1
  `).bind(vehicleId).first();
  return !!result;
}

function canTransitionToReserved(vehicleId: string): boolean {
  const vehicle = await getVehicle(vehicleId);
  const hasActiveAuction = await hasActiveAuction(vehicleId);
  
  return vehicle.status === 'published' && !hasActiveAuction;
}

function canSubmitToAuction(vehicleId: string): boolean {
  const vehicle = await getVehicle(vehicleId);
  const hasActiveReservation = await hasActiveReservation(vehicleId);
  const hasActiveAuction = await hasActiveOrScheduledAuction(db, vehicleId);
  
  return (vehicle.status === 'published' || vehicle.status === 'hidden') 
         && !hasActiveReservation && !hasActiveAuction;
}

function releaseVehicleOnExpiration(vehicleId: string): void {
  // Called by cron job when reservation expires
  await updateVehicleStatus(vehicleId, 'published');
}
```

---

## 2.5 Politica de Expiracion Automatica

### 2.5.1 Comportamiento de Expiracion (Reglas Explícitas)

**Reserva expirada:**
```
reservation.status = 'expired'
vehicle.status = 'published' (libera el vehículo para nuevas reservas)
```

**Pago de subasta expirado:**
```
auction.status = 'closed_failed'
vehicle.status = 'published' (o 'hidden' si requiere revalidación manual)
```

**Regla de idempotencia:**
- Webhook repetido: NO debe duplicar reservas ni cambiar estados hacia atrás
- Transiciones permitidas: solo "hacia adelante" (pending_payment → paid → confirmed)
- EXCEPTO: `cancelled`, `refunded` son estados terminales manuales

### 2.5.2 TTL Configurables

| Recurso | TTL Default | Configurable |
|---------|-------------|---------------|
| Reserva | 48 horas | Si (por sistema) |
| Pago de subasta | 24 horas | Si (por sistema) |
| Vehiculo publicado | Sin limite | - |

### 2.5.2 Trabajos Cron (Cloudflare Workers)

```typescript
// worker.ts - Cron jobs
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    await processExpiredReservations(env.DB);
    await processExpiredAuctionPayments(env.DB);
    await closeEndedAuctions(env.DB);
  }
};

async function processExpiredReservations(db: D1Database) {
  const expiredReservations = await db.prepare(`
    SELECT * FROM reservations 
    WHERE status = 'pending_payment' 
    AND expires_at < datetime('now')
  `).all();
  
  for (const reservation of expiredReservations) {
    // 1. Update reservation to expired
    await db.prepare(`
      UPDATE reservations SET status = 'expired' WHERE id = ?
    `).bind(reservation.id);
    
    // 2. Release vehicle back to published
    await db.prepare(`
      UPDATE vehicles SET status = 'published' WHERE id = ?
    `).bind(reservation.vehicle_id);
    
    // 3. Log audit
    await logAudit('reservations', reservation.id, 'expired', 
      { old_status: 'pending_payment', new_status: 'expired' });
  }
}

async function processExpiredAuctionPayments(db: D1Database) {
  const expiredPayments = await db.prepare(`
    SELECT * FROM auctions 
    WHERE status = 'ended_pending_payment' 
    AND payment_expires_at < datetime('now')
  `).all();
  
  for (const auction of expiredPayments) {
    // 1. Update auction to failed
    await db.prepare(`
      UPDATE auctions SET status = 'closed_failed' WHERE id = ?
    `).bind(auction.id);
    
    // 2. Release vehicle back to published
    await db.prepare(`
      UPDATE vehicles SET status = 'published' WHERE id = ?
    `).bind(auction.vehicle_id);
    
    // 3. Notify winner (email)
    // 4. Log audit
  }
}

async function closeEndedAuctions(db: D1Database) {
  const endedAuctions = await db.prepare(`
    SELECT * FROM auctions 
    WHERE status = 'active' 
    AND end_time < datetime('now')
  `).all();
  
  for (const auction of endedAuctions) {
    const winnerBid = await getHighestBid(auction.id);
    
    if (winnerBid) {
      await db.prepare(`
        UPDATE auctions SET 
          status = 'ended_pending_payment',
          winner_id = ?,
          winner_bid_id = ?,
          final_price = ?,
          payment_expires_at = datetime('now', '+24 hours')
        WHERE id = ?
      `).bind(winnerBid.user_id, winnerBid.id, winnerBid.amount, auction.id);
      
      // Update vehicle status (winner reservation is created separately)
      // Vehicle remains 'published' but is blocked by auction status
      await db.prepare(`
        UPDATE vehicles SET status = 'published'
        WHERE id = ?
      `).bind(auction.vehicle_id);
    } else {
      // No bids - return to published
      await db.prepare(`
        UPDATE auctions SET status = 'closed_failed' WHERE id = ?
      `).bind(auction.id);
      
      await db.prepare(`
        UPDATE vehicles SET status = 'published' WHERE id = ?
      `).bind(auction.vehicle_id);
    }
  }
}
```

### 2.5.3 Programacion de Cron

| Cron | Frecuencia | Funcion |
|------|------------|---------|
| `*/5 * * * *` | Cada 5 minutos | Verificar reservas expiradas |
| `*/5 * * * *` | Cada 5 minutos | Verificar pagos de subasta |
| `*/5 * * * *` | Cada 5 minutos | Cerrar subastas terminadas |

**Orden de Ejecucion (Importante):**

1. **Expirar reservas vencidas** (TTL > 48h)
   - Cambiar `reservation.status` a 'expired'
   - Liberar vehiculo: mantener en 'published'

2. **Expirar pagos de subasta** (TTL > 24h)
   - Cambiar `auction.status` a 'closed_failed'
   - Liberar vehiculo: mantener en 'published'

3. **Reconciliar pagos pendientes** (webhooks pendientes)
   - Verificar transactions con status 'pending' mayores a threshold
   - Reintentar verificacion o marcar para investigacion

---

## 2.6 Integracion de Pasarela de Pagos

### 2.6.1 Proveedores Soportados (Chile)

| Proveedor | Tipo | Estado |
|-----------|------|--------|
| MercadoPago |Wallet + Cards | Preparado |
| Webpay (Flow) | Cards | Preparado |

### 2.6.2 Flujo de Pago

```
1. Usuario inicia reserva
       |
       v
2. Generar idempotency_key (UUID)
       |
       v
3. Crear preferencia de pago (MercadoPago/Webpay)
       |
       v
4. Redirigir a pagina de pago
       |
       v
5. Receptor webhook de pago
       |
       v
6. Validar idempotency_key (no duplicar)
       |
       v
7. Confirmar reserva -> vehicle.status = 'reserved'
       |
       v
8. Notificar al usuario
```

### 2.6.3 Tabla: `payment_transactions`

```sql
CREATE TABLE payment_transactions (
  id TEXT PRIMARY KEY,
  reservation_id TEXT REFERENCES reservations(id),
  auction_id TEXT REFERENCES auctions(id),
  provider TEXT NOT NULL, -- 'mercadopago', 'webpay'
  provider_payment_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'CLP',
  status TEXT DEFAULT 'pending'
    CHECK(status IN ('pending','confirmed','failed','refunded','cancelled')),
  idempotency_key TEXT UNIQUE NOT NULL,
  webhook_payload JSON,
  confirmed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_idempotency ON payment_transactions(idempotency_key);
CREATE INDEX idx_payment_provider ON payment_transactions(provider);
```

### 2.6.4 Reglas de Seguridad

| Regla | Implementacion |
|-------|----------------|
| **Webhook only** | Nunca confiar en respuesta del frontend |
| **Idempotency** | Usar clave unica por intento de pago |
| **Signature validation** | Validar firma del webhook |
| **Double-spend prevention** | Verificar estado antes de confirmar |
| **Transaction log** | Registrar todos los eventos |

### 2.6.5 Manejo de Webhooks

```typescript
// app/api/webhooks/mercadopago/route.ts
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-signature');
  
  // 1. Validate signature
  if (!isValidSignature(signature, body)) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  const event = JSON.parse(body);
  
  // 2. Check idempotency
  const idempotencyKey = event.data.id;
  const existingTx = await getTransactionByIdempotency(idempotencyKey);
  
  if (existingTx) {
    // Already processed - return success (idempotent)
    return new Response('OK', { status: 200 });
  }
  
  // 3. Process based on event type
  switch (event.type) {
    case 'payment':
      await handlePaymentConfirmed(event.data);
      break;
    case 'payment.refunded':
      await handlePaymentRefunded(event.data);
      break;
  }
  
  return new Response('OK', { status: 200 });
}
```

---

## 3. Fase 2 - Consignacion y Subastas

### 3.1 Modulo de Consignacion

**Flujo:**
```
Owner: "Quiero vender mi auto" (formulario)
    |
    v
[received] ----> [under_review] ----> [approved] ----> [published]
                   |                   |
                   | reject            | reject
                   v                   v
              [rejected]          [rejected]
```

**Tabla: `consignments`**
```sql
CREATE TABLE consignments (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT REFERENCES vehicles(id),
  owner_name TEXT NOT NULL,
  owner_email TEXT,
  owner_phone TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  expected_price INTEGER,
  notes TEXT,
  status TEXT DEFAULT 'received' 
    CHECK(status IN ('received','under_review','approved','rejected','published')),
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Reglas:**
- No crear vehiculo automaticamente sin aprobacion manual
- Registrar: quien aprueba, cuando, precio aprobado
- Auditoria completa en tabla `audit_logs`

---

## 4. Fase 3 - Rifas (Condicional Legal)

> **IMPORTANTE:** No activar sin validacion legal previa

**Tabla: `raffles`**
```sql
CREATE TABLE raffles (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  ticket_price INTEGER NOT NULL,
  total_tickets INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT DEFAULT 'draft' 
    CHECK(status IN ('draft','active','completed','cancelled')),
  winner_ticket INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Tabla: `raffle_tickets`**
```sql
CREATE TABLE raffle_tickets (
  id TEXT PRIMARY KEY,
  raffle_id TEXT NOT NULL REFERENCES raffles(id),
  ticket_number INTEGER NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  buyer_phone TEXT NOT NULL,
  payment_id TEXT,
  status TEXT DEFAULT 'reserved' 
    CHECK(status IN ('reserved','paid','cancelled')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_tickets_raffle_number ON raffles(raffle_id, ticket_number);
```

**Reglas:**
- Cada ticket debe tener ID unico verificable
- Sistema debe permitir exportar listado completo para auditoria
- Trazabilidad total de pagos y ganadores

---

## 5. Arquitectura Modular

### 5.1 Estructura de Modulos

```
/modules/
├── core/                 # Nucleo compartido
│   ├── state-machine.ts  # Maquinas de estado
│   ├── guards.ts        # Guards de transicion
│   ├── errors.ts        # Errores custom
│   └── validators.ts    # Validadores de datos
│
├── catalog/              # Listados de vehiculos, filtros
│   ├── vehicles.ts      # CRUD vehiculos
│   ├── photos.ts        # Gestion de fotos
│   └── filters.ts       # Logica de filtros
│
├── reservations/        # Flujo de reservas
│   ├── create.ts        # Crear reserva
│   ├── confirm.ts       # Confirmar pago
│   ├── expire.ts        # Expirar reserva
│   └── cancel.ts        # Cancelar reserva
│
├── auctions/            # Logica de subastas
│   ├── create.ts        # Crear subasta
│   ├── bid.ts           # Gestion de pujas
│   ├── close.ts         # Cerrar subasta
│   └── validate.ts      # Validar pujas
│
├── consignments/        # Flujo de consignacion
│   ├── submit.ts        # Enviar solicitud
│   ├── review.ts        # Revisar solicitud
│   └── approve.ts       # Aprobar/rechazar
│
├── leads/               # Gestion de leads
│   ├── create.ts        # Crear lead
│   ├── update.ts        # Actualizar estado
│   └── pipeline.ts      # Logica de pipeline
│
├── payments/            # Procesamiento de pagos
│   ├── webhook.ts       # Receptores de webhooks
│   ├── providers/       # Adaptadores de proveedores
│   │   ├── mercadopago.ts
│   │   └── webpay.ts
│   └── transactions.ts  # Registro de transacciones
│
└── scheduler/           # Trabajos programados
    ├── expiration.ts    # Proceso de expiraciones
    └── auction-close.ts # Cierre de subastas
│
/lib/
├── db/                  # Encapsulamiento de queries D1
│   ├── vehicles.ts      # Queries de vehiculos
│   ├── reservations.ts # Queries de reservas
│   ├── auctions.ts     # Queries de subastas
│   ├── leads.ts        # Queries de leads
│   └── index.ts        # Exportaciones
│
└── utils/               # Utilidades compartidas
    ├── dates.ts        # Fechas y TTLs
    └── slug.ts         # Generador de slugs

/db/
└── migrations/          # Migraciones versionadas D1
    ├── 0001_init.sql
    └── ...
```

### 5.2 Principios de Modularidad

| Principio | Aplicacion |
|----------|------------|
| **Single Responsibility** | Cada modulo tiene una responsabilidad unica |
| **Low Coupling** | Modulos se comunican via interfaces definidas |
| **High Cohesion** | Logica relacionada dentro del mismo modulo |
| **Database Access** | Queries encapsuladas en `/lib/db/` del modulo |
| **No SQL Inline** | Nunca SQL en componentes UI |

---

## 6. Arquitectura de Base de Datos

### 6.1 Estrategia de Migraciones

```
/db/migrations/
├── 0001_init.sql          -- Tablas MVP
├── 0002_add_consignments.sql
├── 0003_add_auctions.sql
├── 0004_add_auction_fields.sql  -- Estados expandidos
├── 0005_add_payment_transactions.sql
├── 0006_add_reservation_fields.sql  -- Estados expandidos
└── ...
```

**Reglas:**
- Toda tabla nueva requiere migracion versionada
- Nunca modificar tablas en produccion sin migracion formal
- Queries encapsuladas en `/lib/db/`
- No usar SQL inline en componentes

### 6.2 Encapsulamiento de Queries

```typescript
// lib/db/vehicles.ts
export async function getPublishedVehicles(filters: VehicleFilters) {
  // Query parametrizada
  // Sin SQL inline en componentes
}

export async function getVehicleBySlug(slug: string) {
  // Query con slug unico
}

export async function updateVehicleStatus(id: string, status: VehicleStatus) {
  // Transaccion con validacion de transicion
}
```

---

## 7. Seguridad y Roles

### 7.1 Roles Definidos

| Rol | Permisos |
|-----|----------|
| `admin` | CRUD completo, aprobar consignaciones, cerrar subastas |
| `sales` | Ver/modificar leads, crear reservas, ver vehiculos |
| `ops` | Cargar vehiculos, fotos, documentos |

### 7.2 Rutas Protegidas

```
/admin/*           -> admin, sales, ops
/api/admin/*       -> admin, sales
/api/leads/*       -> admin, sales
/user/dashboard    -> usuario autenticado
```

### 7.3 Auditoria

```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_values JSON,
  new_values JSON,
  user_id TEXT REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Registrar en:**
- Cambios de estado de vehiculo
- Cambios de estado de reserva
- Cambios de estado de subasta
- Aprobacion de consignaciones
- Cierre de subastas
- Cambios de precio

---

## 8. Requisitos PWA

### 8.1 Estrategia Mobile-First

| Requisito | Implementacion |
|-----------|----------------|
| Instalabilidad | manifest.json + Service Workers |
| Offline | Cache catalogo, formularios basicos |
| Bottom Nav | Navegacion inferior (movil) |
| Sidebar | Navegacion lateral (escritorio) |

### 8.2 Comportamiento por Rol

**Visitante (publico):**
- Home
- Catalogo con filtros
- Ficha de vehiculo + WhatsApp

**Cliente (usuario):**
- Mis reservas
- Estado de mi consignacion
- Mis pujas en subastas

**Admin (personal):**
- CRUD vehiculos
- Carga fotos drag & drop (optimizado movil)
- Gestion leads
- Auditoria

---

## 9. Estrategia de Despliegue

### 9.1 Ramas Git

```
main           -> produccion (Cloudflare Pages)
develop        -> integracion
feature/*      -> nuevas funcionalidades
fix/*          -> correcciones
hotfix/*       -> parches criticos
```

### 9.2 Flujo de PR

1. Crear branch desde `develop`
2. Desarrollar funcionalidad
3. PR hacia `develop`
4. **Checklist obligatorio:**
   - [ ] Migracion aplicada (si corresponde)
   - [ ] Funciona en local (`npm run dev`)
   - [ ] Sin errores en consola
   - Estados correctamente validados
   - [ ] Documentacion actualizada
5. Code review -> Merge
6. PR de `develop` -> `main` para produccion

### 9.3 Despliegue

| Entorno | Trigger |
|---------|---------|
| Cloudflare Pages | Push a `main` |
| D1 (produccion) | Wrangler migration |

**Nota:** Cloudflare Pages despliega desde GitHub. No usar `wrangler deploy` para Pages.

---

## 10. KPIs y Metricas

### 10.1 Embudo de Conversion

| Metrica | Formula |
|---------|---------|
| Catalogo -> Lead | (Leads generados / Visitas catalogo) x 100 |
| Lead -> Visita | (Visitas agendadas / Leads) x 100 |
| Reserva -> Reserva | (Reservas / Visitas) x 100 |
| Reserva -> Venta | (Ventas concretadas / Reservas) x 100 |

### 10.2 Metricas Operativas

| Metrica | Descripcion |
|---------|-------------|
| Dias promedio en inventario | Tiempo medio desde publicacion hasta venta |
| Margen por unidad | Precio venta - Precio compra |
| % Margen | (Margen / Precio venta) x 100 |
| CAC por canal | Costo de adquisicion por fuente (IG, FB, Organico) |

---

## 11. Reglas de Referencia

**RULE – Identidad del vehiculo sin VIN**

La plataforma NO requiere VIN para crear ni publicar vehiculos.

La identidad unica del vehiculo se define por:
- `vehicle_id` (UUID/ULID interno, PK)
- `slug` unico publico (para SEO y link compartible)

El "auto" se trata como producto de inventario, no como entidad registral.

**DATOS MINIMOS OBLIGATORIOS para publicar** (`status = 'published'`):
- brand (marca)
- model (modelo)
- year
- price
- mileage_km
- region / city (ubicacion)
- transmission (opcional MVP)
- fuel_type (opcional MVP)
- >= 5 fotos (recomendacion operativa)

**DATOS OPCIONALES:**
- Patente: opcional, dato sensible operativo (solo admin/ops)
- VIN: opcional
- Version comercial Chile: desde catalogo MTG (manual)

---

Este plan trabaja en conjunto con las siguientes reglas del proyecto:

| Archivo | Contenido |
|---------|-----------|
| `.kilocode/rules/RULES - MTG SpA.txt` | Reglas globales de arquitectura, migraciones, estados |
| `.kilocode/rules/PWA Rules and Responsive.md` | Estrategia PWA y segmentacion de roles |
| `.kilocode/rules/Desing-MTG.md` | Sistema de diseno ShadCN Premium |
| `.kilocode/rules/USER-PASS.md` | Credenciales Cloudflare y D1 |

---

## 12. Proximos Pasos

1. **Inicializar proyecto** - Clonar repo, configurar `wrangler.toml`
2. **Ejecutar migracion 0001** - Crear tablas MVP
3. **Implementar shell PWA** - Layout con Bottom Nav + Sidebar
4. **Desarrollar Catalogo** - CRUD vehiculos + frontend
5. **Desarrollar Reserva** - Flujo con webhook de pago
6. **Desarrollar Admin** - Panel de gestion
7. **Desarrollar Leads** - Pipeline basico
8. **Implementar trabajos Cron** - Expiraciones automaticas
9. **QA y despliegue** - Revision + push a main

---

*Documento actualizado en modo Code - Kilo Code*
