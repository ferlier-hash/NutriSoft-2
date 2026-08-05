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

## 🔒 Flujo de Acceso y Límites de la Fase 2.1

- **Acceso:** Todas las tablas poseen Row Level Security (RLS) activo y evaluado mediante funciones del contexto usuario actual.
- **Límites:** El frontend permanece en modo mock (sin Supabase conectado). No se ha configurado Supabase remoto ni autenticación visual.
