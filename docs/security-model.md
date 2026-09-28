# Modelo de Seguridad y Matriz de Permisos — Nutrify (Fase 2.1)

## 🛡️ Matriz de Roles y Accesos RLS

| Rol | Organizaciones | Pacientes | Respuestas Check-In | Alertas | Recomendaciones | Métricas Agregadas |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`platform_admin`** | Ver / Gestionar status | ❌ Denegado | ❌ Denegado | ❌ Denegado | ❌ Denegado | ✅ Permitido (Agregado) |
| **`organization_owner`** | Su organización | Directorio y operación | ❌ Denegado por el rol owner | ❌ Denegado por el rol owner | ❌ Denegado por el rol owner | Su org |
| **`nutritionist`** | Su organización | Asignados: clínica; no asignados: directorio básico | Solo asignados | Solo asignados | Solo asignados | No |
| **`assistant`** | Su organización | Directorio básico (Sin clínica) | ❌ Denegado | ❌ Denegado | ❌ Denegado | No |
| **`patient`** | Su organización | Su ficha propia | Responder propia | ❌ Denegado | Ver propias | No |

---

## 🔒 Reglas de Hardening Aplicadas en Fase 2.1

1. **Privacidad de `platform_admin` (ADMIN-01..06):** No puede consultar perfiles de otros usuarios (`app.profiles` restringido a perfil propio) ni acceder a datos clínicos de pacientes, respuestas o alertas.
2. **Privilegio Mínimo (GRANT-01..15):** Se revocaron los permisos `INSERT`, `UPDATE`, `DELETE` sobre `app` para el rol `authenticated`. Todas las escrituras deben ejecutarse mediante procedimientos RPC en `api`.
3. **Funciones de Usuario Actual (SEC-01..08):** Todas las políticas RLS utilizan funciones que obtienen la identidad exclusivamente de `auth.uid()`. Las funciones internas con parámetro `p_user_id` tienen `REVOKE EXECUTE` para `authenticated`.
4. **Organizaciones Suspendidas (SUSPEND-01..03):** Se deniega el acceso operacional clínico a cualquier usuario perteneciente a una organización con estado `suspended`.

## 👥 Composición de roles aprobada — 2026-08-17

1. Ser responsable del consultorio no concede acceso clínico. Permite administrar equipo, directorio, agenda y cobros del tenant.
2. Si la misma identidad es `organization_owner` y `nutritionist`, el acceso clínico deriva exclusivamente de su membresía profesional y de una asignación activa con el paciente.
3. Un nutricionista puede descubrir pacientes no asignados dentro de su consultorio sólo mediante el directorio básico. No puede consultar mediciones, planes, adherencia, check-ins, recomendaciones ni notas hasta quedar formalmente asignado.
4. Las notas privadas de una cita son visibles únicamente para el profesional asignado. El resumen destinado al paciente se persiste y autoriza por separado.
5. El rol `assistant` puede operar identidad básica, agenda y estado de cobro, pero nunca contenido clínico.
6. Toda asignación o reasignación clínica debe quedar auditada.

## ✅ Próximos pasos y adherencia — contrato funcional previo a persistencia

1. Las listas de próximos pasos, sus checks/comentarios y el cumplimiento por comida son información clínica identificable.
2. Sólo pueden leerlos o modificarlos el paciente titular y el nutricionista actualmente asignado dentro del mismo consultorio, según la acción correspondiente.
3. `platform_admin`, `organization_owner` no clínico y `assistant` no reciben contenido, comentarios ni detalle de cumplimiento. Un owner que también sea nutricionista accede únicamente por su asignación clínica.
4. Una lista de próximos pasos pertenece a un único paciente; duplicarla crea una entidad nueva sin paciente, checks ni comentarios.
5. Un plan alimentario queda ligado de forma permanente como máximo a un paciente. Duplicarlo crea una entidad nueva sin paciente, asignaciones, cumplimiento ni comentarios; no se permite reasignar el mismo identificador a otra persona.
6. Los comentarios por comida son información clínica identificable. Sólo el paciente titular puede crearlos, editarlos o vaciarlos mientras el ítem permanezca vigente, y sólo su nutricionista clínicamente asignado puede leerlos o marcarlos como revisados. Se conserva únicamente el texto más reciente: no existe historial ni auditoría del contenido editado.
7. En backend real, asignaciones, publicación de versiones, checks y cumplimiento por comida requieren RPC autorizada y auditoría. La escritura o revisión de comentarios requiere RPC autorizada, pero no versiona ni audita el texto anterior. La ausencia de registro se deriva como `sin respuesta` y nunca como incumplimiento.
8. Retirar un plan lo oculta inmediatamente del portal Paciente; el registro interno permanece disponible sólo para continuidad autorizada. Reasignar un paciente revoca al profesional anterior y no transfiere contenido al nuevo salvo acción explícita.

## 🔑 Autenticación y guards — Fase 3.1

1. El acceso usa invitación, configuración de contraseña, login por correo/contraseña y recuperación por correo.
2. El cliente utiliza PKCE y nunca contiene `service_role` ni secretos de backend.
3. `api.get_current_access_context()` obtiene la identidad sólo desde `auth.uid()` y devuelve únicamente roles, membresías y accesos propios mínimos.
4. Si el usuario es `platform_admin`, el frontend lo limita exclusivamente al portal Admin, aunque exista una membresía accidental.
5. Una organización suspendida se informa en el contexto para bloquear la interfaz, pero RLS/RPC siguen siendo la barrera efectiva.
6. Sin perfil, rol o acceso activo se muestra “Acceso pendiente”; nunca se concede un rol por defecto.
7. Mientras los repositorios reales no estén conectados, una sesión real no puede renderizar contenido mock del portal.

## 📚 Primer corte de datos reales — Fase 3.2

1. Platform Admin puede consultar sólo su perfil, métricas agregadas y el directorio administrativo mínimo de consultorios.
2. `api.admin_organizations` usa la función sin parámetros `security.is_current_platform_admin()`; el cliente no puede elegir una identidad.
3. Owners, profesionales, assistants y pacientes reciben cero filas del directorio global y no pueden ejecutar las métricas globales.
4. La superficie real es sólo lectura. Toda ruta o acción todavía no conectada permanece bloqueada y no cae al proveedor mock.
5. La búsqueda y el filtro del directorio se ejecutan sobre el conjunto ya autorizado; no aceptan ni fabrican un tenant o usuario alternativo.

## Auditoría administrativa visible — 2026-09-24

Platform Admin no obtiene SELECT sobre `app.audit_logs`: la RPC `api.get_admin_audit_events` es una vista de lectura dedicada y exige identidad `platform_admin` calculada desde `auth.uid()`. Sólo retorna `CREATE_ORGANIZATION`, `SET_ORGANIZATION_STATUS` y `SET_ORGANIZATION_SUBSCRIPTION`, con identificador/fecha/consultorio/valores de plan o estado y cantidad de adicionales. No retorna `actor_id`, perfiles/email, `details` arbitrario, motivo libre, identificadores de pacientes ni eventos clínicos. La UI identifica al actor únicamente como “Platform Admin”. La RPC valida período ≤366 días, tipo permitido, búsqueda limitada y paginación 1–100. Otros roles son rechazados.

## Gestión de profesionales por Platform Admin — 2026-09-26

`api.get_admin_professionals` es un directorio allowlisted por membresía y sólo Platform Admin. Expone nombre/correo, consultorio, estado de membresía, fecha de alta y cantidad agregada de asignaciones activas; nunca IDs/nombres de pacientes ni contenido clínico. `api.set_admin_professional_membership_status` activa/inactiva únicamente una membresía `nutritionist`; impide suspenderla mientras existan asignaciones activas, y además espera que termine el acceso de sólo lectura de 14 días para transferencias ya realizadas. Los pacientes deben transferirse por el flujo clínico formal, junto con los planes alimentarios y sin agenda. No se borran datos.

El bloqueo global vive en `app.platform_account_suspensions`, es reversible y se impone en primitivas centrales de autorización, incluida la lectura temporal posterior a transferencias. Es la medida excepcional que puede interrumpir de inmediato esa lectura. No modifica las membresías ni elimina datos. El Platform Admin no puede bloquear cuentas con rol de plataforma. Ambas acciones se escriben en la bitácora con valores de estado y sin motivos libres ni datos clínicos. El Admin nunca obtiene lectura individual de perfiles clínicos.

## Detalle REAL administrativo por consultorio — 2026-09-28

La ruta `/admin/organizations/:organizationId` sólo compone contratos administrativos ya protegidos por sesión Platform Admin. Puede presentar métricas agregadas de uso, suscripción/capacidad, roster de nutricionistas con email laboral de cuenta y conteos agregados de asignaciones, y registros comerciales manuales. El roster no contiene identificadores ni datos de pacientes; no se muestran responsables adicionales no profesionales porque falta un contrato allowlisted específico. El cliente filtra al consultorio seleccionado, pero el límite efectivo sigue en las RPC fuente y la sesión Platform Admin. Suspender/reactivar reutiliza la RPC auditada existente. No se permite consulta de pacientes, notas, respuestas, mediciones, contenido de planes, actividad/citas individualizadas ni objetos de Storage.

## Retención e ingresos de plataforma — 2026-09-25

Snapshots mensuales viven en tablas `app` con RLS activo, sin grants para `authenticated`/`anon` y sin campos de pacientes/profesionales/archivos. Captura corre como job interno `pg_cron`, toma una sola vez por mes y conserva datos agregados por consultorio; el único ID almacenado es el de la organización. `api.get_admin_organization_retention_report` verifica rol actual desde `auth.uid()` y devuelve sólo series agregadas, sin identidad de consultorio.

Tarifas, vencimientos y cobros de Nutrify son datos comerciales internos y no son pagos clínicos. Sus tablas no tienen acceso directo desde cliente. RPC dedicadas verifican `platform_admin`; tarifas sólo se versionan, cobros admiten escritura idempotente y anulación lógica para preservar evidencia. La prórroga se concede manualmente por ciclo, guarda fecha anterior/nueva, actor y timestamp, y se incluye en bitácora; ningún tenant profesional accede a estos datos. Montos se agregan por moneda; no hay endpoint de procesamiento de pago ni conversión. Consultorio, fecha, monto y ciclo comercial no se exponen a otros tenants.

## 🍽️ Núcleo real de planes individuales — Fase 3.2

## Reporte comercial de uso por consultorio — 2026-09-23

`api.get_admin_organization_usage_report(p_from,p_to)` sólo admite Platform Admin y devuelve agregados por consultorio: pacientes con acceso vigente, profesionales/owners activos y capacidad, PDF, asignaciones activas de planes, configuración CUSTOM, calendarios Google conectados, citas, respuestas de check-in, versiones de planes publicadas e ingresos manuales por moneda dentro del período. No devuelve identificadores, nombres ni estados individuales de pacientes, profesionales o archivos, notas, respuestas ni contenido de planes. La función valida un período de hasta 366 días, usa identidad de sesión, `SECURITY DEFINER` y `search_path` cerrado; sólo se concede ejecución a `authenticated` y rechaza otros roles.

`api.get_admin_library_quota_report()` también exige Platform Admin y devuelve por organización el número de profesionales activos con aceptación de biblioteca vigente, suma de sus límites individuales configurados y cuántos perfiles están al 80% o sobre su propio límite. No devuelve usuario, archivo ni ruta, y esta suma nunca se interpreta como cuota compartida del consultorio.

1. `app.meal_plans`, versiones, asignaciones y actividad por comida tienen RLS habilitado y niegan DML directo a `authenticated`.
2. Sólo la profesional autora que conserva la asignación clínica activa puede editar, publicar, retirar, duplicar o revisar comentarios del plan ligado. El paciente titular sólo recibe la asignación activa y su versión publicada.
3. Platform Admin, assistant, owner no clínico, otro profesional y otro paciente reciben cero filas. Ser owner sólo habilita el flujo clínico si esa misma identidad posee una asignación profesional activa.
4. Asignar fija permanentemente `bound_patient_id`. La asignación histórica es única por plan; reutilizar exige duplicar y regenera identificadores de días, comidas y elementos.
5. Publicar cambia la versión visible en una transacción. El borrador nunca se filtra al paciente y retirar finaliza la asignación sin borrar el historial interno.
6. Cumplimiento, asignación, publicación, retiro, duplicación y revisión generan auditoría desidentificada. El comentario conserva sólo su texto actual; el log registra que cambió, pero nunca su contenido ni el valor anterior.

## 📅 Núcleo de Citas e Ingresos — Fase 3.2

Antropometría real local: las revisiones sólo se leen con asignación clínica activa y membresía profesional activa en el consultorio; Platform Admin está excluido explícitamente. Corregir/eliminar requiere además ser autor. Campos personalizados son privados del profesional por consultorio, no se admiten claves ajenas. Las vistas usan `security_invoker`, el rol autenticado sólo tiene SELECT protegido por RLS sobre tablas y toda escritura usa RPC. Las pruebas de antropometría verifican permisos, fecha civil y archivo sin pérdida de datos. La auditoría no incluye valores ni notas.

Reportes clínicos REAL no introduce una vista agregadora ni almacenamiento adicional: compone exclusivamente lecturas clínicas ya autorizadas para el nutricionista actualmente asignado. Platform Admin, owner no clínico, assistant y profesionales sin asignación continúan recibiendo cero filas en cada fuente y no poseen ruta al módulo. El PDF se genera en memoria en el navegador y no se persiste ni entrega automáticamente. Objetivo, resumen profesional y próximos pasos también permanecen sólo en memoria. Correo, teléfono y ciudad se excluyen por defecto; tanto su inclusión como la de notas de check-in requieren controles explícitos e independientes.

1. Las citas operativas y los movimientos de cobro tienen RLS, niegan DML directo a `authenticated` y se escriben sólo por RPC autorizada.
2. Una cita pertenece a un consultorio, paciente y nutricionista asignado. Una restricción de base impide horarios superpuestos para la misma profesional.
3. Las notas profesionales viven en `appointment_private_notes`, separadas de la cita administrativa. Sólo el nutricionista clínicamente asignado las puede leer; nunca owner no clínico, assistant, Platform Admin, otro profesional ni paciente.
4. Owner y assistant pueden consultar la cita operativa y registrar cobros manuales dentro de su tenant, pero no reciben notas privadas.
5. Los movimientos de cobro son inmutables: una corrección se realiza por movimiento compensatorio. Nutrify registra, no procesa dinero.
6. Los códigos de moneda se fijan en cada cita y movimiento; no se reescriben si la configuración profesional cambia después.
