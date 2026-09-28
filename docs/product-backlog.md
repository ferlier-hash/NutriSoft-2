# Backlog de producto y arquitectura

### Implementado local — primera brecha DEMO → REAL cerrada: Citas (2026-09-21)

La ruta `/professional/appointments` ya no queda pendiente en REAL. Consume `api.appointments` y `api.patient_directory` con filtros por paciente, estado, pago, modalidad y período; muestra historial, importe, Meet cuando existe y deriva las acciones operativas a Agenda. No duplica escrituras ni expone notas privadas: esas capacidades quedan sujetas a las RPC correspondientes de Agenda. La aceptación inicial cubre acceso desde navegación REAL, aislamiento por organización, estado vacío, filtros y responsive; la paridad completa de notas/acciones permanece dentro del cierre específico de Citas.

Este documento organiza pedidos sin mezclar cambios rápidos con decisiones que
afectan seguridad, datos o arquitectura. Ningún ítem pasa a implementación sin
alcance y criterio de aceptación claros.

## Cómo se prioriza

### Implementado local — horarios y reglas REAL (2026-09-03)

Configuración y Agenda comparten franjas/descansos, pausas, bloqueos/vacaciones y plazos. RPC privadas por profesional, control de versión y validación servidor al crear/mover/aprobar turnos; solicitudes tardías identificadas sin cambios automáticos. Sin horarios pregrabados para usuarios. Pruebas automáticas y revisión móvil; sigue pendiente recorrido manual de cambio de cita. Paridad restante de Configuración: moneda, duración/precios sugeridos, avisos internos y resumen; no confundir con precio editable por cita en Ingresos.

### Implementado local — cierre funcional de Ingresos REAL (2026-09-03)

Completados los pendientes del 02/09: indicadores de proyectado y no cobrado por cancelaciones/ausencias sin cargo; corrección de cobros sin motivo obligatorio, separada de reembolso y con original inmutable; meses vacíos y netos negativos bajo cero en el gráfico. Probados cálculos, reintentos, revisión concurrente y permisos en local; revisión de pantalla/formulario en escritorio y móvil sin alterar cobros existentes. Queda la revisión del usuario. Citas todavía necesita su pantalla REAL; las vistas compartidas ya reflejan correcciones. No implica despliegue de producción ni procesamiento de dinero.

### Implementado local — cierre CUSTOM REAL (2026-09-18)

La experiencia Custom REAL queda cerrada en código local: imágenes en bucket privado mediante URL firmada de cinco minutos, carga por cuarentena y aceptación exclusiva de archivos saneados; logo y cabeceras independientes; reemplazos no referenciados elegibles para limpieza automatizada. El job de limpieza procesa hasta cinco lotes, informa examinados/eliminados/fallidos y no marca registros como eliminados si Storage o la actualización de estado fallan.

Al reemplazar o quitar una imagen, primero se guarda la nueva configuración y recién después se elimina físicamente el archivo anterior. Storage vuelve a comprobar que la ruta ya no esté referenciada antes de aceptar el borrado. Si la solicitud inmediata se interrumpe, el archivo queda inaccesible y vencido para que el job periódico complete la eliminación; nunca se borra la imagen vigente antes de confirmar el guardado.

En sesiones con varios consultorios el editor exige elegir el consultorio concreto, identifica que el cambio afecta sólo a esa entidad y protege borradores antes de cambiar. Las vistas que agregan información de más de un consultorio conservan marca neutral: elegir una marca nunca se interpreta como filtro de datos. Se mantienen edición exclusiva del responsable, habilitación backend y aislamiento multi-tenant. Hay aceptación automatizada del editor a 390 × 844 y 768 × 1024 sin desborde horizontal, con selector multi-consultorio y protección del borrador. La activación operativa del job periódico y sus secretos se realiza al desplegar infraestructura productiva; no se presenta como activa en local.

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
| Implementar autenticación y route guards reales | P0 | Alta | Fase 3.1 | Corte local completado y E2E PASS: sesión, pantallas, guards, contexto backend y limpieza de cuenta; proyecto de staging creado, faltan migraciones, configuración, invitaciones/SMTP y validación remota |
| Conectar repositorios Supabase sin mostrar mocks en sesiones reales | P0 | Alta | Fase 3.2 | Recorridos centrales Admin, Profesional y Paciente completados en REAL local; faltan dominios explícitamente planificados y despliegue remoto |
| Dividir `MockProvider` en contratos, selectores, repositorios y servicios | P1 | Media | Antes de conectar datos reales | En progreso: contratos, selectores y primer repositorio Admin real extraídos; siguientes repositorios pendientes |
| Incorporar E2E por rol y observabilidad central | P1 | Media | Antes del piloto | Playwright REAL local cubre creación de plan, respuesta de check-in, antropometría, cita, cobro y denegaciones de assistant, owner no clínico, Platform Admin y profesional no asignado; Sentry staging creado, endurecido y con 2FA obligatoria. Pendientes DSN/dominio en hosting, source maps privados, backend remoto y ampliar variantes/destructivos de cada flujo. |
| Persistir perfil profesional, invitaciones y planes alimentarios | P0 | Alta | Siguiente corte de datos reales | Completado en REAL local; entrega remota de invitaciones condicionada a SMTP y staging |
| Completar editor multidía, enlaces a recetas e importación CSV | P2 | Media | — | Completado en REAL local con plantilla, validación por fila y borrador revisable |
| Evaluar importación asistida desde PDF/Word | P3 | Alta | Después de elegir proveedor y política de tratamiento documental | Futuro; CSV es el único formato REAL aceptado actualmente |
| Exclusividad de plan por paciente y comentarios por comida | P1 | Media/Alta | Antes de persistir planes reales | Constraint, RLS, RPC e integración UI REAL completados; transferencia explícita ante una futura reasignación permanece fuera del flujo actual |
| Próximos pasos y cumplimiento cotidiano del paciente | P1 | Media | Antes de persistir el portal clínico | Completado en demo y REAL local con aislamiento, checks y comentarios |
| Supervisión general de check-ins del profesional | P1 | Media | Antes de persistir el portal clínico | Completado en demo y REAL local con filtros, historial y Bandeja autorizada; falta recorrido manual integral |
| Definir backups, PITR, RPO/RTO y restauración | P1 | Media | Antes de producción | Política aprobada: RPO 1 h, RTO 4 h, backup diario 30 días, copia mensual 12 meses y prueba mensual; configuración y primera restauración pendientes de staging/producción |
| Reducir bundle inicial de frontend | P3 | Media | Después de integrar rutas reales | Completado el 2026-09-14: carga diferida por ruta y DEMO separado; bundle inicial 1.528,19→463,47 kB, con regresión y navegación REAL verificadas |

## Bandeja de pedidos del usuario

Los pedidos nuevos se registrarán primero aquí, aun cuando lleguen como notas
desordenadas, capturas o ideas. Después se dividirán en entregas pequeñas con
criterios de aceptación verificables.

| Pedido original | Tipo | Prioridad | Complejidad | Dependencias | Decisión |
|---|---|---:|---:|---|---|
| Ver `docs/feature-ideas-inbox.md` | Producto | Variable | Variable | Se define por idea | Bandeja central creada el 2026-08-14 |
