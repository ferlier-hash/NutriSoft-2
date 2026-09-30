# Guía de Desarrollo Local con Supabase — Nutrify (Fase 2.1)

## 🛠️ Comandos de Verificación y Generación de Reportes

```bash
# 1. Iniciar Supabase local (requiere Docker Desktop activo)
npm run supabase:start

# 2. Reconstruir base de datos y ejecutar las migraciones limpias con seed
npm run db:reset

# 3. Ejecutar todas las suites pgTAP vigentes
npm run db:test

# 4. Ejecutar el linter de base de datos
npm run db:lint

# 5. Generar y verificar sincronización de tipos TypeScript
npm run db:types
npm run db:verify-types

# 6. Verificar autenticación real local con un usuario temporal autolimpiable
npm run verify:auth

# 7. Verificar recorridos y aislamiento clínico REAL con sesiones profesionales y pacientes locales
npm run verify:clinical

# 8. Ejecutar verificación integral del proyecto
npm run verify:all

# 9. Ejecutar colector automático de evidencias de la Fase 2.1
node scripts/run-evidence-phase-2-1.js
```

## Prueba manual REAL de invitación y reserva (sólo local)

No ejecutes `npm run db:reset` para esta prueba: reconstruye la base local. Usá datos sintéticos y la sesión profesional REAL ya habilitada.

1. Mantené Supabase local arriba y ejecutá `npm exec supabase -- functions serve` desde la raíz para levantar el runtime local de Edge Functions.
2. La app principal puede seguir en `http://localhost:5173`. Para abrir el callback de activación local, levantá otra instancia Vite en `http://127.0.0.1:5174` con `npm run dev -- --host 127.0.0.1 --port 5174 --strictPort`.
3. Desde Profesional → Pacientes, invitá una identidad ficticia única (por ejemplo `paciente-citas-AAAAMMDD@nutrify.test`). Los correos locales se capturan en Mailpit: `http://127.0.0.1:54324`; no salen a Internet.
4. Abrí el enlace de invitación en Mailpit, creá una contraseña de prueba y completá la activación. Luego iniciá sesión como paciente en `http://localhost:5173`.
5. Como paciente, elegí el consultorio correspondiente si aparece el selector, pedí un horario y comprobá que queda pendiente. Cerrá sesión, regresá a Andrea en Profesional → Agenda, confirmá la solicitud y verificá el cambio de estado en ambos portales.
6. En Profesional → Citas, comprobá filtros, nota privada y cancelación con una de las opciones comerciales disponibles (sin cargo o importe pendiente). Completar/marcar ausencia sólo se habilita desde la hora de inicio; la base local también tiene pruebas automatizadas para esos límites y roles.

La Edge Function de invitaciones permite CORS sólo desde los orígenes locales enumerados en su código, y los enlaces de activación regresan a `127.0.0.1:5174`, permitido por Auth local. No uses correos personales, pacientes reales, staging ni producción para esta prueba. Las invitaciones y citas sintéticas permanecen en la base local y pueden cancelarse/archivarse desde la aplicación; no se borran automáticamente.
