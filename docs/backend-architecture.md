# Arquitectura Backend — NutriSoft (Fase 2.1)

## 🏗️ Esquemas y Aislamiento Multi-Tenant

La base de datos PostgreSQL de NutriSoft está dividida en tres esquemas diferenciados:

1. **`app` (Persistencia Interna):**
   Contiene todas las tablas internas (`organizations`, `profiles`, `patients`, `check_in_responses`, `alerts`, etc.). Permanece **fuera del Data API de Supabase**.
   - Privilegios: `authenticated` solo tiene permiso `SELECT` interno para RLS. No posee permisos DML directos de escritura (`INSERT`, `UPDATE`, `DELETE`).

2. **`security` (Funciones Auxiliares de Seguridad):**
   Contiene funciones de autorización de contexto de usuario actual (`auth.uid()`) como `security.is_current_platform_admin()`, `security.is_current_assigned_nutritionist()`, etc. (`SECURITY DEFINER SET search_path = ''`).

3. **`api` (Contrato de Acceso Público):**
   Contiene exclusivamente vistas (`security_invoker = true`) y funciones RPC transaccionales que constituyen el único punto de entrada de lectura y escritura.

---

## 🔒 Flujo de Acceso y límites vigentes

- **Acceso:** Todas las tablas poseen Row Level Security (RLS) activo y evaluado mediante funciones del contexto usuario actual.
- **Contexto de sesión:** `api.get_current_access_context()` calcula roles, membresías y accesos propios exclusivamente desde `auth.uid()` para los guards de Fase 3.1.
- **Frontend:** conserva el modo mock para demostración. En modo real, repositorios tipados conectan las superficies locales vigentes de Admin, Profesional y Paciente; búsqueda y filtros operan únicamente sobre filas ya autorizadas. Nunca habilita páginas mock dentro de una sesión real.
- **Límites:** no existe todavía proyecto Supabase remoto ni SMTP productivo. OAuth local de Google Calendar, selección de calendario y proyección degradable de citas confirmadas están implementados; los refresh tokens permanecen cifrados y no se exponen al navegador. Los recorridos centrales Profesional/Paciente y el constructor local de Reportes clínicos funcionan en REAL local. Historial profesional independiente de Citas, solicitud inicial de cita del paciente, persistencia/entrega de reportes e infraestructura productiva continúan pendientes. La puesta en producción se rige por `docs/production-deployment-and-operations.md`.
- **Planes individuales implementados localmente:** `app.meal_plans` fija un único paciente histórico; `app.meal_plan_versions` conserva snapshots y un solo borrador/publicado; `app.meal_plan_assignments` separa pendiente, activo y retirado; `app.meal_plan_meal_activity` conserva cumplimiento, último comentario y revisión. Todas las escrituras pasan por RPC `SECURITY DEFINER`, validan identidad actual y no aceptan tenant o actor del cliente.
- **Publicación:** asignar deja el plan pendiente. `api.publish_meal_plan` valida 7–30 días, publica el borrador, reemplaza la asignación activa del mismo tipo y actualiza la versión visible en una única transacción.
- **Duplicación:** `api.duplicate_meal_plan` crea una entidad sin paciente y regenera identificadores internos; no copia asignaciones, adherencia ni comentarios.
- **Citas e ingresos implementados localmente:** `app.appointments` es la fuente de verdad y evita solapamientos a nivel PostgreSQL. `app.appointment_private_notes` separa el contenido clínico del dato operativo. `app.appointment_payment_movements` conserva cobros manuales inmutables, con estado derivado en la vista API. Google Calendar conserva un primer callback OAuth local, sin lectura de eventos ni sincronización de Meet todavía.
