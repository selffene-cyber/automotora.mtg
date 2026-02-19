# PWA Rules and Responsive.md

# WORKFLOW: ARQUITECTURA PWA Y ROLES MTG

## 1. Estrategia PWA (Mobile-First)
- **Instalabilidad:** El portal debe incluir un `manifest.json` y Service Workers para ser instalado como App en dispositivos móviles de administrativos y clientes.
- [cite_start]**Responsividad:** Priorizar layouts de una sola columna en móvil para el Panel Admin (gestión de stock y fotos en terreno)[cite: 2, 3].
- **Offline Ready:** Permitir la visualización del catálogo y formularios de inspección básica sin conexión (caché optimizada).

## 2. Segmentación de Modos (Roles)
- [cite_start]**Modo Público (Visitante):** Home, Catálogo con filtros (precio, marca, año) y Ficha de vehículo con botón de WhatsApp[cite: 1, 2, 7].
- [cite_start]**Modo Usuario (Cliente):** Gestión de sus Reservas, estado de Consignación y participación en Subastas[cite: 3, 4].
- [cite_start]**Modo Admin (Personal):** - CRUD de autos con carga de fotos "Drag & Drop" (optimizado para cámara de celular)[cite: 3].
    - [cite_start]Gestión de Leads y Pipeline de ventas[cite: 3, 8].
    - [cite_start]Auditoría y Logs de cambios por vehículo[cite: 6].

## 3. Workflow de Implementación (Prioridad MVP)
1. **Fase Shell:** Crear el Layout PWA con navegación inferior (Bottom Nav) para móviles y Sidebar para escritorio.
2. [cite_start]**Fase Datos:** Implementar el modelo `vehicles` y `vehicle_photos` con D1 y R2 de Cloudflare[cite: 2, 6].
3. [cite_start]**Fase Flujo:** Implementar el "Botón de Reserva" (abono) antes que el carrito completo[cite: 3].
4. [cite_start]**Fase Admin:** Panel simple de carga de inventario para validación rápida del stock.

## 4. Restricciones Técnicas
- **Imágenes:** Implementar compresión automática para subidas desde móvil (personal administrativo en terreno).
- **Seguridad:** Rutas protegidas por middleware según el rol (`/admin/*`, `/user/*`).
