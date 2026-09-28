# Arquitectura Backend — Nutrify (Fase 2.1)

## 🏗️ Esquemas y Aislamiento Multi-Tenant

La base de datos PostgreSQL de Nutrify está dividida en tres esquemas diferenciados:

1. **`app` (Persistencia Interna):**
   Contiene todas las tablas internas (`organizations`, `profiles`, `patients`, `check_in_responses`, `alerts`, etc.). Permanece **fuera del Data API de Supabase**.
   - Privilegios: `authenticated` solo tiene permiso `SELECT` interno para RLS. No posee permisos DML directos de escritura (`INSERT`, `UPDATE`, `DELETE`).

2. **`security` (Funciones Auxiliares de Seguridad):**
   Contiene funciones de autorización de contexto de usuario actual (`auth.uid()`) como `security.is_current_platform_admin()`, `security.is_current_assigned_nutritionist()`, etc. (`SECURITY DEFINER SET search_path = ''`).

3. **`api` (Contrato de Acceso Público):**
   Contiene exclusivamente vistas (`security_invoker = true`) y funciones RPC transaccionales que constituyen el único punto de entrada de lectura y escritura.

---

## 🔒 Flujo de Acceso y límites vigentes

### Gestión REAL de profesionales

La migración `20260926000070_admin_professional_management.sql` habilita `/admin/nutritionists` mediante RPC allowlisted: directorio global por membresía profesional, suspensión/reactivación de acceso por consultorio y bloqueo global reversible. El directorio devuelve metadatos mínimos y un conteo de asignaciones; no devuelve pacientes ni contenido clínico. La membresía no puede suspenderse si mantiene asignaciones clínicas, debido al trigger de integridad. El Admin debe completar primero la transferencia clínica existente. El bloqueo global se comprueba en las funciones centrales de autorización de membresía, rol, profesional asignado, portal paciente y lectura temporal por transferencia. Las acciones conservan bitácora y no borran datos. No se modifica Auth ni se cierran sesiones existentes; el servidor niega inmediatamente las lecturas/escrituras protegidas.

### Reporte comercial agregado por consultorio

La migración `20260923000062_admin_organization_usage_report.sql` agrega `api.get_admin_organization_usage_report(p_from,p_to)`. La migración `20260924000063_admin_library_quota_report.sql` agrega `api.get_admin_library_quota_report()`, con conteos agregados de profesionales habilitados y cuotas PDF individuales cercanas/superadas. Ambas RPC sólo admiten Platform Admin y nunca retornan entidades o contenidos clínicos individuales. La página operativa consulta timestamps para actividad y representa capacidad/uso actual; una serie histórica separada se captura mensualmente desde septiembre de 2026. El límite comercial PDF por consultorio se presenta aparte de la suma informativa de cuotas técnicas individuales, que no constituye una cuota compartida.

La migración `20260924000064_admin_audit_trail.sql` agrega `api.get_admin_audit_events(...)` y enlaza `/admin/audit`. Proyecta acciones allowlisted de plataforma desde `app.audit_logs`; no expone la tabla general ni eventos clínicos, actor personal o texto libre. Las migraciones `20260926000070`–`72` incluyen además cambios de membresía y bloqueo global de profesionales, sin revelar identidades afectadas. Una suspensión por consultorio requiere transferir asignaciones y esperar el plazo de lectura de 14 días. El bloqueo global es reversible e interrumpe de inmediato todo acceso de esa cuenta, incluida la lectura temporal.

Desde 2026-09-28, `/admin/organizations/:organizationId` presenta una ficha REAL que compone los contratos administrativos allowlisted existentes para una organización. El cliente filtra filas agregadas y comerciales por ID después de que los servicios verifican Platform Admin; la vista no consulta datos clínicos ni agrega perfiles de pacientes. Las listas de membresías sólo muestran identidad profesional básica y cantidad agregada de asignaciones. Cambio operativo de estado reutiliza `api.set_organization_status`; plan, tarifa, cobros y prórrogas siguen en sus flujos existentes. No se agrega persistencia ni una escritura paralela.

### Retención y finanzas de plataforma

Las migraciones `20260925000065_admin_commercial_metrics.sql` y `20260925000066_admin_commercial_revenue_reconcile.sql` capturan mensualmente, mediante `pg_cron`, una fila agregada por consultorio (cliente activo, pacientes, profesionales, almacenamiento y actividad mensual). El corte contiene IDs de consultorio sólo en tablas privadas, sin FK que borre historia; no almacena identidades clínicas ni contenido. `api.get_admin_organization_retention_report` agrega tasas intermensuales únicamente para Platform Admin y devuelve cantidades, no consultorios individualizados.

Tarifas negociadas se versionan por consultorio en `app.organization_commercial_terms`; aceptan día de vigencia flexible. Un ciclo mensual va desde ese día hasta el día anterior a su aniversario mensual (p. ej., 15–14); los anclajes 29–31 se limitan al último día de los meses más cortos. Los ciclos anuales usan el aniversario anual con el mismo ajuste. El reporte devuelve tarifas futuras como programadas. Una programación futura reemplazada se conserva como cancelada; no se permite cambiar vigencias que se superpongan con períodos ya cobrados. Cobros manuales recibidos están en `app.organization_commercial_receipts` con llave idempotente y anulación no destructiva. Sólo RPC `SECURITY DEFINER` de Platform Admin leen/escriben; las tablas tienen RLS y sin DML para roles cliente. La vista agregada separa total recibido por moneda del cobro manual clínico de pacientes. No factura, procesa pagos ni convierte monedas. Staging/producción siguen pendientes.

La migración `20260925000069_admin_commercial_billing_status.sql` agrega `api.get_admin_platform_billing_report(p_from,p_to)`, que calcula los ciclos completos cubiertos, saldo por ciclo y estados comerciales agregados. El vencimiento base coincide con `period_start`. `api.extend_admin_commercial_billing_due_date(term_id,period_start,new_due_date)` permite sólo a Platform Admin otorgar prórroga individual a un ciclo aún no pagado, con fecha posterior a la vigente y no pasada. `app.organization_commercial_due_date_changes` es append-only para el cliente; conserva fechas anterior/nueva, actor, hora y ciclo. La RPC de reporte expone el vencimiento efectivo, cantidad y timestamp de la última prórroga. Las extensiones generan además una acción de auditoría. No modifica facturas fiscales, acceso operativo ni ciclos futuros.

- **Acceso:** Todas las tablas poseen Row Level Security (RLS) activo y evaluado mediante funciones del contexto usuario actual.
- **Contexto de sesión:** `api.get_current_access_context()` calcula roles, membresías y accesos propios exclusivamente desde `auth.uid()` para los guards de Fase 3.1.
- **Frontend:** conserva el modo mock para demostración. En modo real, repositorios tipados conectan las superficies locales vigentes de Admin, Profesional y Paciente; búsqueda y filtros operan únicamente sobre filas ya autorizadas. Nunca habilita páginas mock dentro de una sesión real.
- **Límites:** existe un proyecto Supabase remoto exclusivo de staging, pero sus datos/configuración deben prepararse antes de validarlo. La suite de Admin E2E remota está preparada para ejecutarse manualmente con dos identidades sintéticas y sólo lectura; aún no se declara validada hasta que el proyecto tenga las migraciones desplegadas, esas identidades estén configuradas y el workflow concluya correctamente. No existe SMTP ni hosting productivo. OAuth local de Google Calendar, selección de calendario y proyección degradable de citas confirmadas están implementados; los refresh tokens permanecen cifrados y no se exponen al navegador. Los recorridos centrales Profesional/Paciente y el constructor local de Reportes clínicos funcionan en REAL local. Historial profesional independiente de Citas, persistencia/entrega de reportes e infraestructura productiva continúan pendientes. La puesta en producción se rige por `docs/production-deployment-and-operations.md`.
- **Planes individuales implementados localmente:** `app.meal_plans` fija un único paciente histórico; `app.meal_plan_versions` conserva snapshots y un solo borrador/publicado; `app.meal_plan_assignments` separa pendiente, activo y retirado; `app.meal_plan_meal_activity` conserva cumplimiento, último comentario y revisión. Todas las escrituras pasan por RPC `SECURITY DEFINER`, validan identidad actual y no aceptan tenant o actor del cliente.
- **Publicación:** asignar deja el plan pendiente. `api.publish_meal_plan` valida 7–30 días, publica el borrador, reemplaza la asignación activa del mismo tipo y actualiza la versión visible en una única transacción.
- **Duplicación:** `api.duplicate_meal_plan` crea una entidad sin paciente y regenera identificadores internos; no copia asignaciones, adherencia ni comentarios.
- **Citas e ingresos implementados localmente:** `app.appointments` es la fuente de verdad y evita solapamientos a nivel PostgreSQL. `app.appointment_private_notes` separa el contenido clínico del dato operativo. `app.appointment_payment_movements` conserva cobros manuales inmutables, con estado derivado en la vista API. Google Calendar conserva un primer callback OAuth local, sin lectura de eventos ni sincronización de Meet todavía.
