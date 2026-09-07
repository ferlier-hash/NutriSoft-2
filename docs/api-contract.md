# Contrato de la API — NutriSoft (Fase 2.1)

## Horarios y reglas REAL — migración 45

`get_my_schedule_settings(p_org)` y `save_my_schedule_settings(p_org,p_settings,p_expected)` sólo permiten al nutricionista activo administrar su propia configuración en un consultorio activo; Platform Admin excluido. Persistencia privada en `app.professional_schedule_settings`, sin acceso directo authenticated/anon. Save requiere versión actual, valida franjas/zonas/plazos/bloqueos, serializa por profesional y audita sólo conteos, sin notas. No modifica preferencias monetarias ni Google.

Trigger interno valida nuevas posiciones de citas requested/confirmed contra franjas activadas, bloques y pausa, independientemente de RPC de origen. Ediciones no horarias preservan citas previas. `get_patient_appointment_policy(p_appointment)` devuelve sólo plazos para cita propia autorizada; no expone notas, agenda ni datos profesionales. Nuevas solicitudes guardan `notice_hours`/`is_late` calculados en servidor; vista profesional pendiente expone ambas columnas. El plazo no cancela ni rechaza automáticamente: se mantiene aprobación humana.

## Ingresos REAL

Migración 44: `update_income_appointment_price(p_appointment,p_expected,p_amount)` modifica sólo `quoted_amount`, con permiso operativo, bloqueo de cita, versión `updated_at` y auditoría. Permite 0 y reducciones bajo el neto cobrado; no modifica pagos ni genera devoluciones ni cambia `billing_disposition`. Un reintento con el mismo precio no crea otro ajuste. Importes negativos, fuera de numeric(12,2) o más de dos decimales se rechazan.

Migración 43: `correct_income_payment(p_payment,p_expected,p_request,p_amount,p_date,p_method,p_note)` corrige únicamente un cobro original autorizado, mediante par compensatorio inmutable (reversal/replacement) en una transacción. `p_expected` es el `revision_id` vigente; UUID de solicitud protege reintentos. Rechaza futuro en zona de cita, importes no positivos, aumento sobre saldo, importe inferior a devoluciones existentes y fecha posterior a ellas. No exige motivo. El original y todos los ajustes permanecen en `app`; `api.income_movements` devuelve la versión efectiva con `revision_id`, `correction_count` y `original_amount`, sin presentar compensaciones como reembolsos reales. Reembolsos conservan vínculo al cobro raíz y usan su importe corregido. Las vistas `appointments` e `appointment_income_summary` consumen movimientos efectivos, sin inflar cobros, devoluciones ni cantidad de pagos por correcciones. Sólo alcance operativo vigente; paciente y Platform Admin excluidos. Nunca actualiza ni elimina un movimiento previo.

`income_movements` usa security_invoker y RLS operativo, sin acceso paciente ni Admin. `record_income_movement` registra cobro o devolución con autorización de cita, bloqueo transaccional, request UUID, monto positivo de hasta dos decimales y fecha no futura. Reembolsos apuntan al cobro original de la misma cita y no superan su remanente. Cobros no superan saldo ni se aplican a citas sin cargo. No modifica registros anteriores ni procesa pagos externos. La RPC histórica `record_appointment_payment` conserva su contrato previo; el nuevo frontend usa exclusivamente la operación idempotente.

## Marca CUSTOM local

`get_my_branding()` devuelve únicamente consultorios activos autorizados del usuario, habilitación, permiso de edición, settings y versión. `save_organization_branding` exige responsable activo y entitlement de backend, valida campos/paleta/rutas propias y versión previa. No otorga clínica. Storage privado `consultorio-branding`: imágenes hasta 2 MB, INSERT por responsable, SELECT de imágenes guardadas por miembros/pacientes autorizados y de borradores por responsable. Sin UPDATE/DELETE de objetos por cliente. Capacidad comercial no editable por usuarios; no implica facturación implementada. URLs firmadas de 5 minutos: una ya emitida puede seguir disponible hasta vencer tras retirar la habilitación.

## Biblioteca educativa — real local

- `api.content_library`: recetas, PDF y enlaces autorizados por RLS. Autor nutricionista activo por consultorio; paciente sólo publicaciones de profesionales con asignación activa. Admin, owner no clínico y assistant excluidos.
- `save_library_content`: alta/corrección y estados draft/published/retired, identidad desde sesión; edición exige timestamp previo para rechazar sobrescrituras concurrentes. Duplicación crea nueva identidad en borrador desde la UI.
- Bucket privado `educational-documents`: PDF hasta 10 MB; ruta usuario/consultorio/UUID, carga por autor activo. Descarga autenticada sujeta a publicación/asignación, sin URL pública. No sobrescritura ni borrado directo. Archivos huérfanos por cargas abandonadas requieren futura limpieza; escaneo antimalware pendiente antes de producción.
- Enlaces de recetas en versiones de planes validados en servidor contra publicación, autor y consultorio. Detalle aplica RLS incluso si la receta se retira posteriormente.

## 📡 Superficie Expuesta en el Esquema `api`

### Vistas Exclusivas (`security_invoker = true`):
- `api.current_profile`: Perfil del usuario autenticado.
- `api.current_organizations`: Organizaciones activas a las que pertenece el usuario.
- `api.patient_directory`: Directorio administrativo reducido (`id`, `organization_id`, `first_name`, `last_name`, `email`, `phone`, `status`, `created_at`). Excluye `birth_date`, `city` y datos clínicos.
- `api.patient_portal_home`: Ficha del portal del paciente autenticado.
- `api.check_in_assignments`: Asignaciones de check-in visibles según RLS.
- `api.attention_inbox`: Bandeja de alertas de atención para nutricionistas y owners.
- `api.patient_recommendations`: Recomendaciones emitidas.
- `api.admin_organizations`: Directorio administrativo mínimo visible sólo para `platform_admin`, autorizado con la identidad actual (`auth.uid()`) y sin datos clínicos.
- `api.appointments`: Citas operativas autorizadas con estado de pago derivado; no incluye notas clínicas.
- `api.professional_appointment_notes`: Notas privadas visibles sólo para el nutricionista clínicamente asignado.
- `api.patient_recent_appointments`: Resumen derivado de hasta cinco turnos, sin importes.
- `api.appointment_income_summary`: Agregados de movimientos manuales autorizados por profesional/consultorio.

### Funciones RPC Transaccionales:
- `api.get_admin_metrics()`: Devuelve JSON desidentificado con conteos agregados.
- `api.get_current_access_context()`: Devuelve el contexto mínimo del usuario actual (`platform_role`, membresías propias y accesos de paciente propios), calculado únicamente desde `auth.uid()`.
- `api.create_organization(p_name, p_slug)`: Crea organización (solo platform_admin).
- `api.set_organization_status(p_org_id, p_status)`: Activa/suspende organización (solo platform_admin).
- `api.create_patient(p_org_id, p_first_name, p_last_name, ...)`: Crea paciente y asignación en transacción.
- `api.assign_check_in(p_org_id, p_patient_id, p_due_date)`: Asigna check-in a paciente.
- `api.submit_check_in(p_assignment_id, p_energy, p_adherence, ...)`: Envía respuesta de check-in y genera alertas con bloqueo `FOR UPDATE`.
- `api.acknowledge_alert(p_alert_id)`: Reconoce alerta (unresolved -> acknowledged) verificando conteo de filas.
- `api.resolve_alert(p_alert_id, p_notes)`: Resuelve alerta (unresolved/acknowledged -> resolved) verificando conteo de filas.
- `api.create_recommendation(p_org_id, p_patient_id, p_text, p_response_id)`: Emite recomendación validando pertenencia y respuesta vinculada.
- `api.create_appointment(...)`: Crea una cita sin solapamiento, validando paciente, profesional asignado, duración, moneda y alcance del actor.
- `api.record_appointment_payment(...)`: Registra un cobro manual inmutable; no procesa pagos.
- `api.resolve_appointment_billing(...)`: Resuelve el aviso de cancelación/ausencia como sin cargo, pendiente o importe parcial/extra.
- `api.mark_appointment_notification_read(...)`: Marca una notificación propia como leída.
- `api.get_google_calendar_connection_status(p_organization_id)`: Devuelve sólo el estado de conexión y si ya se eligió un calendario; nunca expone tokens, scopes, identificadores de calendario ni eventos externos.

## Antropometría profesional — implementada en real local

- Vistas `anthropometry_patients`, `professional_anthropometric_fields` y `professional_patient_anthropometry`, con RLS y filtro de asignación clínica vigente para revisiones. El directorio de antropometría devuelve sólo identidad mínima de fichas autorizadas.
- RPC `save_anthropometric_field` administra alta, posición y archivo de campos propios por consultorio; conserva nombre/unidad históricos. No permite escritura directa.
- RPC `save_patient_anthropometric_revision` y `delete_patient_anthropometric_revision`: creación y corrección/eliminación por autor asignado. Fecha civil no futura, al menos un valor positivo, porcentajes hasta 100 y campos personalizados del profesional/tenant. Registros archivados conservan valores previos.
- El frontend real no usa MockProvider. Gráfico, tabla, comparación y filtros operan sobre revisiones autorizadas por servidor.

## 🍽️ Planes alimentarios individuales — implementado localmente

- Vistas: `api.professional_meal_plans`, `api.patient_current_meal_plans` y `api.meal_plan_meal_activity` usan `security_invoker` y RLS de tablas internas.
- Escrituras: `create_meal_plan`, `update_meal_plan_draft`, `assign_meal_plan`, `publish_meal_plan`, `retire_meal_plan`, `duplicate_meal_plan`, `set_meal_plan_meal_activity` y `review_meal_plan_comment`.
- La asignación rechaza cualquier plan previamente ligado a otro paciente, incluso si terminó. Duplicar crea identidad e identificadores internos nuevos sin copiar actividad.
- El borrador no sustituye la versión visible hasta ejecutar `publish_meal_plan`. Retirar oculta inmediatamente el plan del portal Paciente.
- La identidad, el tenant y el paciente se derivan del contexto y de las relaciones persistidas; las RPC no aceptan actor ni organización arbitraria cuando el recurso ya está identificado.
- La transferencia clínica durante una futura reasignación sigue pendiente y deberá ser una RPC separada y explícita.
# Seguimiento cotidiano local

Migración 48: `get_free_checkin(p_patient)` devuelve sólo preguntas activas y versión de la biblioteca del profesional vigente a paciente titular. `submit_free_checkin(p_patient,p_request,p_version,p_answers)` crea asignación técnica libre y respuesta atómicamente; reutiliza validación/reglas de `submit_question_checkin`. Bloqueo por request UUID y retorno de respuesta previa en reintento autorizado. Versiones cambiadas se rechazan, snapshot histórico permanece. No modifica estados legacy. Sin frecuencia ni scheduler.

Migración 47: `attention_inbox` amplía la vista security_invoker con fechas de reconocimiento/resolución, nota y respuesta/snapshot original. Lectura y RPC `acknowledge_alert`/`resolve_alert` restringidas por `daily_professional`, organización activa; reemplaza permiso histórico owner. Transición bajo bloqueo de fila, nota hasta 500 caracteres, duplicados rechazados, auditoría sin texto clínico.

Migración 46: `get_checkin_questions(p_org)` y `save_checkin_questions(p_org,p_questions,p_expected)` administran biblioteca privada del nutricionista autenticado en el consultorio. Máximo 100 preguntas y dos reglas activas; guardado optimista. `assign_daily_checkin` congela preguntas activas y reglas de la biblioteca guardada, rechazando selección vacía; sin biblioteca mantiene compatibilidad legacy. `submit_question_checkin(p_assignment,p_answers)` acepta sólo claves y valores válidos de ese snapshot, verifica paciente, estado y vencimiento, registra respuesta inmutable y aviso consolidado si coincide una regla. `daily_checkins` agrega `questions`, `question_answers`, `alert_matches`; respuestas legacy conservan contrato anterior. El endpoint legacy no admite respuestas a asignaciones con snapshot nuevo. Sin acceso directo a biblioteca ni DML autenticado; Admin excluido.

Referencia inicial (migración 38): `clinical_patient_profiles` entrega identidad/contacto sólo a lectores clínicos autorizados; `patient_initial_measurements` conserva medidas opcionales por ficha. `save_patient_initial_measurements` verifica RLS equivalente, fecha, valores y versión previa; profesional puede corregir referencia pero no cambiar el objetivo autodeclarado. No produce pesos cotidianos ni revisiones antropométricas.

Migraciones 36–37: lecturas `api.daily_patients`, `daily_weights`, `daily_checkins`, `daily_lists`, `daily_task_activity`, `daily_phrases`, `daily_phrase_assignments`, `daily_checkin_settings` con RLS. Mutaciones exclusivamente RPC: `record_daily_weight`, `assign_daily_checkin`, `submit_daily_checkin`, `save_daily_checkin_settings`, `save_daily_list`, `set_daily_list_assignment`, `respond_daily_task`, `save_daily_phrase`, `assign_daily_phrase`. Peso usa request UUID idempotente. Listas/frases requieren `p_expected` para edición; listas no se reasignan entre pacientes. Sin DML clínico directo ni claves privilegiadas en cliente.

## Mi perfil profesional REAL

Migración 50: `get_my_professional_profile(p_org)` y `save_my_professional_profile(p_org,p_profile,p_expected_account,p_expected_practice)` exponen y guardan exclusivamente el perfil del nutricionista autenticado y activo en el consultorio solicitado. Separan `app.profiles` (nombre/teléfono) de `app.professional_profiles` contextual (especialidad, zona horaria y matrícula). No aceptan actor externo, no devuelven información a Platform Admin y no permiten DML directo autenticado. Guardar valida matrícula completa o vacía, zona horaria existente y versiones de cuenta/práctica; auditoría conserva sólo presencia de campos. El correo no forma parte de esta escritura y el cambio de contraseña usa el flujo autenticado de Supabase.
