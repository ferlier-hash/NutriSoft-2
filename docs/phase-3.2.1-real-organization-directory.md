# NutriSoft — Directorio real de consultorios (Fase 3.2.1)

**Estado:** aprobado para implementación local el 14 de agosto de 2026.

## Usuario y problema

- Usuario: `platform_admin` autenticado.
- Problema: consultar y localizar consultorios persistidos sin depender del modo demostración.
- Naturaleza: administrativa y comercial; no clínica.

## Datos y permisos

- Fuente de verdad: `api.admin_organizations`.
- Campos permitidos: identificador, nombre, slug, estado, fecha de alta y última actualización.
- Lectura: exclusivamente `platform_admin` calculado desde `auth.uid()`.
- Escritura: ninguna en este corte.
- Otros roles: cero filas y sin navegación al directorio global.

## Interfaz

- Ruta real: `/admin/organizations`.
- Búsqueda local por nombre o slug sobre el conjunto autorizado.
- Filtro de estado: Todos, Activos y Suspendidos.
- Estados obligatorios: cargando, error recuperable, vacío inicial y vacío por filtros.
- La tabla es responsive mediante scroll horizontal y no presenta acciones ficticias.
- La navegación “Consultorios” sólo se habilita en el layout real cuando esta ruta está conectada.

## Límites deliberados

Plan, tarifa, ubicación, responsables, vencimientos, pagos, almacenamiento y conteos detallados siguen siendo datos simulados. No se incorporarán a persistencia hasta definir su política comercial y contrato de integridad.

## Criterios de aceptación

1. El modo demo conserva la lista completa y sus acciones actuales.
2. La ruta real no requiere `MockProvider`.
3. Buscar y filtrar no vuelve a consultar el backend ni amplía permisos.
4. Un filtro sin coincidencias permite limpiar filtros.
5. Un error no muestra mensajes internos y permite reintentar.
6. No aparecen botones de alta, pagos, cambio de plan o cambio de estado.
7. Verificación frontend, base, tipos y E2E permanecen en verde.
