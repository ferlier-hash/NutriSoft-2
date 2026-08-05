# Modelo de Seguridad y Matriz de Permisos — NutriSoft (Fase 2.1)

## 🛡️ Matriz de Roles y Accesos RLS

| Rol | Organizaciones | Pacientes | Respuestas Check-In | Alertas | Recomendaciones | Métricas Agregadas |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`platform_admin`** | Ver / Gestionar status | ❌ Denegado | ❌ Denegado | ❌ Denegado | ❌ Denegado | ✅ Permitido (Agregado) |
| **`organization_owner`** | Su organización | Todos sus pacientes | ✅ Permitido | ✅ Permitido | ✅ Permitido | Su org |
| **`nutritionist`** | Su organización | Solo asignados | Solo asignados | Solo asignados | Solo asignados | No |
| **`assistant`** | Su organización | Directorio básico (Sin clínica) | ❌ Denegado | ❌ Denegado | ❌ Denegado | No |
| **`patient`** | Su organización | Su ficha propia | Responder propia | ❌ Denegado | Ver propias | No |

---

## 🔒 Reglas de Hardening Aplicadas en Fase 2.1

1. **Privacidad de `platform_admin` (ADMIN-01..06):** No puede consultar perfiles de otros usuarios (`app.profiles` restringido a perfil propio) ni acceder a datos clínicos de pacientes, respuestas o alertas.
2. **Privilegio Mínimo (GRANT-01..15):** Se revocaron los permisos `INSERT`, `UPDATE`, `DELETE` sobre `app` para el rol `authenticated`. Todas las escrituras deben ejecutarse mediante procedimientos RPC en `api`.
3. **Funciones de Usuario Actual (SEC-01..08):** Todas las políticas RLS utilizan funciones que obtienen la identidad exclusivamente de `auth.uid()`. Las funciones internas con parámetro `p_user_id` tienen `REVOKE EXECUTE` para `authenticated`.
4. **Organizaciones Suspendidas (SUSPEND-01..03):** Se deniega el acceso operacional clínico a cualquier usuario perteneciente a una organización con estado `suspended`.
