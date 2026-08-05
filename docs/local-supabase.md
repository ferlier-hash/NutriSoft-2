# Guía de Desarrollo Local con Supabase — NutriSoft (Fase 2.1)

## 🛠️ Comandos de Verificación y Generación de Reportes

```bash
# 1. Iniciar Supabase local (requiere Docker Desktop activo)
npm run supabase:start

# 2. Reconstruir base de datos y ejecutar las 9 migraciones limpias con seed
npm run db:reset

# 3. Ejecutar las 20 suites de pruebas pgTAP (103 assertions)
npm run db:test

# 4. Ejecutar el linter de base de datos
npm run db:lint

# 5. Generar y verificar sincronización de tipos TypeScript
npm run db:types
npm run db:verify-types

# 6. Ejecutar verificación integral del proyecto
npm run verify:all

# 7. Ejecutar colector automático de evidencias de la Fase 2.1
node scripts/run-evidence-phase-2-1.js
```
