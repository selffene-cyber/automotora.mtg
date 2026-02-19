# RULE - Normalización Vehiculos.md

🚗 RULE – Origen y Normalización de Datos de Vehículos
1️⃣ Principio General

La plataforma MTG Automotora utilizará un enfoque híbrido para la obtención de datos de vehículos:

APIs externas para autocompletado estructural.

Catálogo interno MTG para versiones comerciales Chile.

Ingreso manual como mecanismo validado y controlado.

Ninguna API externa será considerada fuente absoluta de verdad.

2️⃣ VIN Autocomplete (NHTSA vPIC)

Se utilizará la API gratuita NHTSA vPIC exclusivamente para:

Decodificación de VIN

Obtención de marca

Modelo

Año

Motor base

El resultado del VIN:

No se guardará automáticamente como definitivo.

Deberá pasar por validación manual antes de publicarse.

No se permitirá publicar un vehículo solo basado en datos crudos del VIN.

3️⃣ Dropdowns Marca / Modelo / Versión

Para selectores dinámicos se utilizará:

Primera opción: CarQuery API.

Alternativa escalable: CarAPI.app o API Ninjas (si se requiere mayor precisión).

Los datos obtenidos desde estas APIs:

Se utilizarán solo para poblar formularios.

No reemplazan el catálogo interno MTG.

No deben sobrescribir datos ya confirmados manualmente.

4️⃣ Catálogo Interno MTG (Fuente Comercial Oficial)

Cuando el usuario seleccione:

“Ingresar datos manualmente”

El sistema deberá:

Permitir crear una versión comercial propia (ej: “Mazda CX-5 2.5 AWD High 2022 Chile”).

Guardar esa versión en tabla interna vehicle_versions_mtg.

Asociar esa versión al vehículo publicado.

Permitir reutilizarla en futuros ingresos.

El catálogo interno MTG será la fuente de verdad para:

Versiones comerciales Chile

Equipamiento específico importador

Insignias locales

Paquetes especiales

Configuraciones no estandarizadas por APIs internacionales

5️⃣ Modelo de Datos Requerido

Debe existir separación entre:

vehicle_brands

vehicle_models

vehicle_api_trims

vehicle_versions_mtg (comercial Chile)

Nunca mezclar trims API con versiones comerciales MTG en la misma tabla.

6️⃣ Regla de Integridad

Si existe versión interna MTG, esta tiene prioridad sobre datos API.

Si el vehículo fue creado manualmente, no debe ser sobrescrito por llamadas API posteriores.

Las APIs solo completan; no gobiernan.

7️⃣ Escalabilidad

Si el volumen lo justifica:

Se podrá crear proceso de sincronización programado.

Se podrá cachear resultados API en D1 para reducir llamadas externas.

🎯 Resultado Estratégico

Con esta regla:

No dependes 100% de APIs externas.

Puedes adaptarte al mercado chileno.

Construyes activo propio (catálogo MTG).
