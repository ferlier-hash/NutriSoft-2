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
- **Frontend:** conserva el modo mock por defecto. En modo real, el repositorio tipado de Fase 3.2 conecta perfil, métricas agregadas y la ruta de directorio administrativo para Platform Admin; búsqueda y filtros se aplican únicamente sobre filas ya autorizadas. Nunca habilita páginas mock dentro de una sesión real.
- **Límites:** no existe proyecto Supabase remoto ni SMTP real. El primer callback OAuth local de Google Calendar está en preparación: usa una Edge Function con estado de un solo uso y vencimiento, y los refresh tokens cifrados no se exponen al navegador. Las pantallas Profesional y Paciente todavía no se habilitan en sesiones reales salvo el recorrido de planes; Agenda/Citas/Ingresos dispone de su núcleo local, pero no de pantallas ni sincronización externa.
- **Planes individuales implementados localmente:** `app.meal_plans` fija un único paciente histórico; `app.meal_plan_versions` conserva snapshots y un solo borrador/publicado; `app.meal_plan_assignments` separa pendiente, activo y retirado; `app.meal_plan_meal_activity` conserva cumplimiento, último comentario y revisión. Todas las escrituras pasan por RPC `SECURITY DEFINER`, validan identidad actual y no aceptan tenant o actor del cliente.
- **Publicación:** asignar deja el plan pendiente. `api.publish_meal_plan` valida 7–30 días, publica el borrador, reemplaza la asignación activa del mismo tipo y actualiza la versión visible en una única transacción.
- **Duplicación:** `api.duplicate_meal_plan` crea una entidad sin paciente y regenera identificadores internos; no copia asignaciones, adherencia ni comentarios.
- **Citas e ingresos implementados localmente:** `app.appointments` es la fuente de verdad y evita solapamientos a nivel PostgreSQL. `app.appointment_private_notes` separa el contenido clínico del dato operativo. `app.appointment_payment_movements` conserva cobros manuales inmutables, con estado derivado en la vista API. Google Calendar conserva un primer callback OAuth local, sin lectura de eventos ni sincronización de Meet todavía.
