# Arquitectura Backend — NutriSoft (Fase 2)

## 🏗️ Esquemas y Aislamiento Multi-Tenant

La base de datos PostgreSQL de NutriSoft está dividida en tres esquemas diferenciados:

1. **`app` (Persistencia Interna):**
   Contiene todas las tablas internas (`organizations`, `profiles`, `patients`, `check_in_responses`, `alerts`, etc.). Permanece **fuera del Data API de Supabase**.

2. **`security` (Funciones Auxiliares de Seguridad):**
   Contiene funciones auxiliares de autorización que evalúan pertenencia organizacional, rol y asignación clínica (`SECURITY DEFINER SET search_path = ''`).

3. **`api` (Contrato de Acceso Público):**
   Contiene exclusivamente vistas (`security_invoker = true`) y funciones RPC que conforman la interfaz futura del cliente.

---

## 🔒 Flujo de Acceso y Límites de la Fase 2

- **Acceso:** Todas las tablas poseen Row Level Security (RLS) activo.
- **Límites:** En esta fase no se conecta Supabase con las pantallas React. El frontend continúa funcionando con los datos mock purificados de la Fase 1.1.2.
