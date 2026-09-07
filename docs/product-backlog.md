# Backlog de producto y arquitectura

Este documento organiza pedidos sin mezclar cambios rápidos con decisiones que
afectan seguridad, datos o arquitectura. Ningún ítem pasa a implementación sin
alcance y criterio de aceptación claros.

## Cómo se prioriza

### Implementado local — horarios y reglas REAL (2026-09-03)

Configuración y Agenda comparten franjas/descansos, pausas, bloqueos/vacaciones y plazos. RPC privadas por profesional, control de versión y validación servidor al crear/mover/aprobar turnos; solicitudes tardías identificadas sin cambios automáticos. Sin horarios pregrabados para usuarios. Pruebas automáticas y revisión móvil; sigue pendiente recorrido manual de cambio de cita. Paridad restante de Configuración: moneda, duración/precios sugeridos, avisos internos y resumen; no confundir con precio editable por cita en Ingresos.

### Implementado local — cierre funcional de Ingresos REAL (2026-09-03)

Completados los pendientes del 02/09: indicadores de proyectado y no cobrado por cancelaciones/ausencias sin cargo; corrección de cobros sin motivo obligatorio, separada de reembolso y con original inmutable; meses vacíos y netos negativos bajo cero en el gráfico. Probados cálculos, reintentos, revisión concurrente y permisos en local; revisión de pantalla/formulario en escritorio y móvil sin alterar cobros existentes. Queda la revisión del usuario. Citas todavía necesita su pantalla REAL; las vistas compartidas ya reflejan correcciones. No implica despliegue de producción ni procesamiento de dinero.

### Pendiente explícito — cierre CUSTOM REAL (2026-09-02)

Retomado el 03/09: texto y contactos visibles en las cabeceras de inicio de ambos portales incluso sin imagen; teléfono/email con enlaces seguros, recarga efectiva del borrador y confirmación de guardado. La primera versión REAL está implementada, pero no se declara completa. Restan: marca contextual para sesiones con varios consultorios y revisión visual del editor e imágenes con sesión de responsable en escritorio, móvil y tablet. Las pantallas agregadas conservan marca neutral: seleccionar marca no equivale a filtrar datos. Conservar la edición exclusiva del responsable y la habilitación backend; no cambiar roles para facilitar la prueba. Antes de producción también revisar procesamiento de imágenes y limpieza de archivos no utilizados.

### Pendiente explícito — prueba de cambio de cita REAL (2026-09-02)

El usuario difiere la validación manual paciente → solicitud de reprogramación de una cita de prueba → aprobación profesional → comprobación de Agenda y Meet. El recorrido implementado no se considera validado end-to-end por esta anotación. Retomar con las sesiones correspondientes, sin modificar credenciales ni roles para facilitar la prueba.

Cada pedido se evalúa con cinco dimensiones:

| Dimensión | Pregunta |
|---|---|
| Impacto | ¿Mejora el flujo central o evita un daño relevante? |
| Urgencia | ¿Bloquea la siguiente fase o puede esperar? |
| Riesgo | ¿Afecta privacidad, autorización, datos o migraciones? |
| Esfuerzo | ¿Es un ajuste aislado o exige reorganización interna? |
| Dependencias | ¿Necesita autenticación, backend real o una decisión previa? |

## Clases de trabajo

### P0 — Bloqueante

Seguridad, pérdida de datos, aislamiento multi-tenant o una condición que
impide validar/publicar la fase actual.

### P1 — Antes de la siguiente fase

No bloquea el uso local, pero debe resolverse antes de autenticación o datos
reales.

### P2 — Mejora importante

Aporta valor claro al MVP y se agenda después de los bloqueantes.

### P3 — Backlog posterior

Pulido, optimización o ampliaciones que no justifican retrasar el corte actual.

## Estado técnico conocido

| Pedido | Prioridad | Complejidad | Momento recomendado | Estado |
|---|---:|---:|---|---|
| Publicar Fase 2.1.1 con CI reproducible | P0 | Media | Ahora | Cierre local PASS; falta commit, push y CI remota |
| Cerrar contratos funcionales 2.2 del frontend mock | P0 | Media | Antes de Fase 3 | Completado y verificado localmente el 2026-08-14 |
| Resolver vulnerabilidades de dependencias antes de auth | P1 | Media/Alta | Antes de Fase 3 | Completado el 2026-08-14: React Router 7.18.2, Nano ID corregido y `npm audit` en cero |
| Configurar contrato de ambientes y secretos públicos | P1 | Baja | Inicio de Fase 3 | Completado el 2026-08-14 con `.env.example`, validación Zod y documentación |
| Implementar autenticación y route guards reales | P0 | Alta | Fase 3.1 | Corte local completado y E2E PASS: sesión, pantallas, guards, contexto backend y limpieza de cuenta; faltan invitaciones/SMTP y staging |
| Conectar repositorios Supabase sin mostrar mocks en sesiones reales | P0 | Alta | Fase 3.2 | Admin read-only completado. Repositorio real de planes y actividad tipado; faltan pantallas reales Profesional/Paciente y demás dominios |
| Dividir `MockProvider` en contratos, selectores, repositorios y servicios | P1 | Media | Antes de conectar datos reales | En progreso: contratos, selectores y primer repositorio Admin real extraídos; siguientes repositorios pendientes |
| Incorporar E2E por rol y observabilidad central | P1 | Media | Antes del piloto | Pendiente |
| Persistir perfil profesional, invitaciones y planes alimentarios | P0 | Alta | Siguiente corte de datos reales | Núcleo real de planes, versiones, asignación, duplicación, publicación y actividad completado localmente; perfil, invitaciones, email e integración visual real pendientes |
| Completar editor multidía de planes y enlaces a recetas | P2 | Media | Después de validar el primer corte visual | Completado en demo: editor 7–30 días y enlaces autorizados a recetas publicadas; persistencia real pendiente dentro del corte de datos |
| Exclusividad de plan por paciente y comentarios por comida | P1 | Media/Alta | Antes de persistir planes reales | Constraint, RLS, RPC, publicación versionada, retiro, duplicación limpia y comentarios completados localmente; falta integración UI real y transferencia explícita ante reasignación |
| Próximos pasos y cumplimiento cotidiano del paciente | P1 | Media | Antes de persistir el portal clínico | Completado en demo: lista individual 7–15 días, comentarios, plan completo, checks por comida y reporte contextual; falta persistencia/auditoría real |
| Supervisión general de check-ins del profesional | P1 | Media | Antes de persistir el portal clínico | Completado en demo: última respuesta por paciente autorizado, filtros de fecha/prioridad, orden y acceso al historial; falta repositorio real |
| Definir backups, PITR, RPO/RTO y restauración | P1 | Media | Antes de producción | Pendiente |
| Reducir bundle inicial de frontend | P3 | Media | Después de integrar rutas reales | Backlog |

## Bandeja de pedidos del usuario

Los pedidos nuevos se registrarán primero aquí, aun cuando lleguen como notas
desordenadas, capturas o ideas. Después se dividirán en entregas pequeñas con
criterios de aceptación verificables.

| Pedido original | Tipo | Prioridad | Complejidad | Dependencias | Decisión |
|---|---|---:|---:|---|---|
| Ver `docs/feature-ideas-inbox.md` | Producto | Variable | Variable | Se define por idea | Bandeja central creada el 2026-08-14 |
