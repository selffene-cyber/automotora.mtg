Version: 1.0
Fecha: 2026-02-19
Responsable: Jeans Selfene
Relacionado con: PLAN-TRABAJO-MTG v1.x
---
Historial de cambios:
| Versión | Fecha | Responsable | Cambios |
|---------|-------|-------------|---------|
| 1.0 | 2026-02-19 | Jeans Selfene | Versión inicial |
```

---

# 📋 Manual Ejecutivo MTG Automotora

## ¿Qué es MTG?

Plataforma digital de gestión automotriz desarrollada con **Next.js + Cloudflare Pages + D1**. Permite la gestión integral de inventarios, reservas, subastas, consignaciones y CRM para una automotora profesional.

---

## ¿Cómo funciona el negocio?

| Modelo | Descripción |
|--------|-------------|
| **Inventario Propio** | La automotriz adquiere vehículos y los vende directamente |
| **Consignación** | Terceros entregan vehículos para venta (comisión por venta) |
| **Subastas** | Vehículos se subastan públicamente con depósitos |
| **Rifas** | Promoción comercial con tickets numerados |

---

## Flujo Completo: Adquisición → Venta

```
Adquisición → Recepción → Inspección → Fotografía → Publicación → (Reserva/Aución/Venta Directa) → Entrega
```

| Etapa | Estado Vehículo | Acción |
|-------|-----------------|--------|
| Recepción | `draft` | Admin registra vehículo |
| Revisión | `draft` | Validación de documentos |
| Publicación | `published` | Visible en catálogo |
| Reserva | `reserved` | Cliente paga abono |
| Subasta | `auction_active` | Pujas en curso |
| Venta | `sold` | Entrega al comprador |

---

## Módulos del Sistema

| Módulo | Ruta | Funcionalidad |
|--------|------|---------------|
| **Catálogo** | `/catalogo` | Filtros, búsqueda, vista pública |
| **Vehículos** | `/admin/vehiculos` | CRUD, fotos, estados |
| **Reservas** | `/admin/reservas` | Abonos, vencimiento 48h |
| **Consignaciones** | `/admin/consignaciones` | Recepción, revisión, aprobación |
| **Subastas** | `/admin/subastas` | Creación, pujas, cierre automático |
| **Rifas** | `/admin/rifas` | Tickets, sorteos |
| **Leads** | `/admin/leads` | CRM, seguimiento |
| **Pagos** | `/api/webhooks/payment` | Webhooks, confirmación |

---

## Riesgos Principales

- ⚠️ **Pago sin confirmación**: Cambiar estado solo tras webhook verificado
- ⚠️ **Expiración reservas**: Cron job debe ejecutar cada hora
- ⚠️ **Fotos en móvil**: Compresión automática para terreno
- ⚠️ **APIs externas**: NHTSA/CarQuery no son fuente de verdad; validar manualmente
- ⚠️ **Seguridad**: Rutas `/admin/*` protegidas por middleware

---

## Métricas Críticas

| Métrica | Fórmula | Meta |
|---------|---------|------|
| **Tasa de conversión** | Ventas / Visitas | >3% |
| **Tiempo en inventario** | Días promedio venta | <30 días |
| **Reservas efectivas** | Paid / Total reservas | >80% |
| **Leads cerrados** | Closed Won / Total leads | >25% |
| **Subastas completadas** | Vendidas / Total subastas | >70% |

---

## Stack Técnico

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, shadcn/ui
- **Backend**: Cloudflare Pages (Edge), D1 Database, R2 Storage
- **Auth**: Custom sessions con cookies seguras
- **Deployment**: GitHub → Cloudflare Pages (rama main)
