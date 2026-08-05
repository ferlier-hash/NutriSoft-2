# Guía de Desarrollo Local con Supabase — NutriSoft

## 🛠️ Comandos Básicos

```bash
# Iniciar Supabase local (requiere Docker Desktop / Podman activo)
npm run supabase:start

# Detener Supabase local
npm run supabase:stop

# Reconstruir la base de datos desde cero con seed
npm run db:reset

# Ejecutar la suite de pruebas pgTAP
npm run db:test

# Ejecutar el linter de base de datos
npm run db:lint

# Regenerar tipos TypeScript
npm run db:types

# Verificar sincronización de tipos TypeScript
npm run db:verify-types
```
