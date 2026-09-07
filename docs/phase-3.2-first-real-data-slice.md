# NutriSoft — Contrato del primer corte de datos reales (Fase 3.2)

**Estado:** aprobado para implementación local el 14 de agosto de 2026.

## Objetivo

Conectar una primera superficie real y reversible sin reemplazar el prototipo estable: el `Platform Admin` autenticado podrá consultar su perfil, métricas comerciales agregadas y un directorio básico de consultorios desde Supabase local.

## Usuario y permisos

- Usuario: `platform_admin` autenticado.
- Lectura permitida: perfil propio, conteos agregados y campos administrativos de consultorios (`id`, nombre, slug, estado y fechas técnicas).
- Lectura prohibida: pacientes identificables, perfiles de profesionales, check-ins, alertas clínicas, recomendaciones, notas y cualquier dato clínico.
- Escritura: ninguna en este corte.
- La autorización efectiva permanece en RLS y RPC; ocultar controles en el frontend no reemplaza controles de backend.

## Comportamiento de interfaz

- El modo demostración conserva las pantallas y acciones existentes sin modificaciones funcionales.
- Una sesión real de Admin muestra una superficie identificada como “Datos reales · Sólo lectura”.
- Cargando: conserva la jerarquía y anuncia el estado.
- Vacío: explica que todavía no hay consultorios registrados.
- Error recuperable: mensaje neutral y acción `Reintentar`; no muestra detalles internos.
- Sin perfil, rol o permiso: deriva al estado de acceso pendiente o bloqueado definido en Fase 3.1.
- Las rutas todavía no conectadas muestran un estado de integración; nunca renderizan datos mock dentro de una sesión real.

## Fuentes de verdad

- Perfil: `api.current_profile`.
- Permisos: `api.get_current_access_context()`.
- Métricas agregadas: `api.get_admin_metrics()`.
- Consultorios: `api.admin_organizations`.

## Fuera de alcance

- Crear o editar consultorios.
- Cambiar plan, estado, vencimiento o tarifa.
- Registrar pagos.
- Invitar responsables o profesionales.
- Conectar portales Profesional y Paciente.
- Email real, dominio, staging o producción.

## Criterios de aceptación

1. El modo demo mantiene todos sus flujos existentes.
2. Una sesión real de Admin no depende de `MockProvider`.
3. Los datos recibidos se validan antes de renderizarse.
4. La vista define carga, vacío, error, reintento y éxito.
5. Un usuario no Admin no puede consultar métricas ni organizaciones administrativas por backend.
6. No se expone información clínica ni identificable de pacientes.
7. Lint, typecheck, tests, build, pgTAP, tipos y Auth E2E permanecen en verde.
