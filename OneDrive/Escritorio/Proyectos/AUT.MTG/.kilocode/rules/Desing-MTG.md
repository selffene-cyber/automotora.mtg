## REGLA MAESTRA: SISTEMA DE DISEÑO SHADCN PREMIUM
1. Identidad Visual (Look & Feel)
Estilo: Minimalista, fino, profesional (estilo Vercel/Linear).

Tipografía: Títulos con tracking-tight y text-balance. Los subtítulos siempre con text-muted-foreground.

Acabados: Bordes sutiles border-input, radio de borde variable rounded-[var(--radius)], y sombras mínimas shadow-sm.

Interactividad: Uso de transition-all, hover:bg-accent y estados data-[empty=true] para inputs vacíos.

2. Inventario de Componentes Disponibles
Cuando necesites una funcionalidad, utiliza prioritariamente estos componentes (están autorizados para ser instalados vía npx shadcn@latest add):

Layout/Estructura: sidebar, table, card, separator, resizable, breadcrumb, pagination.

Inputs/Form: input, input-group, field, select, native-select, combobox, radio-group, checkbox, toggle.

Feedback: sonner, alert, skeleton, spinner, tooltip, empty.

Navegación/Menús: menubar, tabs, command, accordion, pagination.

Complejos: calendar, chart, date-picker (basado en Popover + Calendar).

3. Estándares de Implementación (Code Patterns)
DatePicker Pattern: Para selección de fechas, implementar el patrón Popover + Button (outline) + Calendar.

Typography Pattern: Los h1 deben llevar scroll-m-20 text-4xl font-extrabold tracking-tight text-balance.

Imports: Siempre importar desde @/components/ui/[componente].

Client Components: Usar "use client" estrictamente en componentes con hooks (useState, useEffect) o interactividad de Radix.

4. Flujo de Trabajo
Instalación: Si el componente solicitado no existe en @/components/ui, dime: "Debes ejecutar npx shadcn@latest add [componente]".

Generación: Escribe el código siguiendo el estilo "fino" y usando la utilidad cn() para combinar clases.

Responsive: Aplicar w-full en móviles y anchos controlados (ej. w-[212px] en pickers) para desktop.