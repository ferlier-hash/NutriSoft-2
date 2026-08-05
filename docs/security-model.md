# Modelo de Seguridad y Matriz de Permisos — NutriSoft (Fase 2)

## 🛡️ Matriz de Roles y Accesos RLS

| Rol | Organizaciones | Pacientes | Respuestas Check-In | Alertas | Recomendaciones | Métricas Agregadas |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`platform_admin`** | Ver / Gestionar status | ❌ Denegado | ❌ Denegado | ❌ Denegado | ❌ Denegado | ✅ Permitido |
| **`organization_owner`** | Su organización | Todos sus pacientes | ✅ Permitido | ✅ Permitido | ✅ Permitido | Su org |
| **`nutritionist`** | Su organización | Solo asignados | Solo asignados | Solo asignados | Solo asignados | No |
| **`assistant`** | Su organización | Directorio básico | ❌ Denegado | ❌ Denegado | ❌ Denegado | No |
| **`patient`** | Su organización | Su ficha propia | Responder propia | ❌ Denegado | Ver propias | No |
