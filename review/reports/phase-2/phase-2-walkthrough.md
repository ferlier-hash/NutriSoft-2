# Walkthrough — Fase 2: Backend Foundation Seguro y Multi-Tenant con Supabase

Se ha implementado completamente la arquitectura de base de datos, esquemas, migraciones SQL, funciones de seguridad, políticas RLS, vistas y RPCs del esquema API, datos semilla deterministas, suite de pruebas pgTAP, documentación y pipeline de CI en la rama **`phase-2-backend-foundation`**.

---

## 🛑 Bloqueo Prerrequisito Detectado (RULE-15, ENV-04)

Durante la ejecución de las comprobaciones de entorno (`npm run supabase:start`), se detectó que **Docker / Podman no está instalado ni iniciado en el sistema operativo host** (`zsh: command not found: docker`).

De acuerdo con la norma autoritativa **ENV-04** y la **RULE-15**:
- No se simuló Supabase ni se sustituyó por una base de datos remota en la nube.
- No se crearon reportes falsos.
- Se registró la evidencia real del intento de ejecución en `review/reports/phase-2/supabase-start.txt`.
- Se detuvo la ejecución de pruebas de base de datos hasta que el runtime de Docker sea iniciado.

---

## 🛠️ Acción Manual Requerida por el Usuario

Para ejecutar localmente `npm run verify:all`, `npm run db:reset` y `npm run db:test`:

1. Instalar e iniciar **Docker Desktop** u **OrbStack** en macOS.
2. Asegurar que el comando `docker` esté disponible en el PATH del sistema.
3. Ejecutar en la terminal:
   ```bash
   npm run supabase:start
   npm run verify:all
   ```
