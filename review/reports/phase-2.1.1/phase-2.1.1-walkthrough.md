# Walkthrough — Fase 2.1.1: Corrección de Validación, Evidencia y Cierre Técnico Real

Se han corregido las inconsistencias de validación, suites pgTAP, script de CI y privilegios por defecto en la rama **`phase-2.1.1-validation-fix`**.

---

## 🛠️ Resumen de Verificaciones Ejecutadas (100% PASS)

1. **Docker Desktop:** Activo en macOS ARM64.
2. **Resets de Base de Datos:** `npm run db:reset` (aplica 11 migraciones) ejecutado dos veces consecutivas sin errores.
3. **Suite pgTAP:** 20/20 archivos de prueba SQL en verde, **122 assertions exitosas** (0 fallos, 0 omitidos).
4. **Prueba de Alertas (071):** Reescrita con 5 escenarios independientes A, B, C, D, E (13 assertions exactas).
5. **Prueba de Auditoría (091):** Reescrita comparando el conteo de filas de `audit_logs` antes y después de una RPC fallida (demostrado que crea 0 logs).
6. **Default Privileges:** Revocados privilegios por defecto en `app` y `security` para `authenticated` en la migración 10.
7. **Concurrencia Check-In:** Creado índice único parcial `uq_pending_checkin_assignment` e inspección estricta de fechas en migración 11.
8. **Vistas API:** Retirado `created_by` de `api.check_in_assignments` y `api.patient_recommendations`.
9. **Frontend Vitest:** 17/17 tests Vitest pasados (`npm run test`), build Vite exitoso.
10. **Workflow CI:** Corregido ejecutor a `npm run test` y agregado paso generador de metadata.
