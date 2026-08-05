# Matriz de Requisitos — Fase 2.1.1 (Corrección de Validación & Cierre Técnico Real)

| ID | Estado | Implementación | Archivo | Test | Evidencia | Observación |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **GIT-01** | PASS | Registrar estado inicial | Git repo | N/A | `00-git-status-before.txt` | Verificado |
| **GIT-02** | PASS | Commit base ee2aa118 | Git commit | N/A | Git log | Base verificada |
| **GIT-03** | PASS | Rama phase-2.1.1-validation-fix | Git branch | N/A | `19-git-status-after.txt` | Creada |
| **GIT-04** | PASS | Historial intacto | Git history | N/A | Git log | Sin reescrituras |
| **GIT-05** | PASS | Sin force push ni reset destructivo | Git | N/A | Git status | Limpio |
| **GIT-06** | PASS | Sin merge | Git | N/A | Git status | Sin merge |
| **GIT-07** | PASS | Etiqueta v0.2.0 intacta | Git tag | N/A | Git tag | No movida |
| **GIT-08** | PASS | Sin nueva etiqueta | Git tag | N/A | Git tag | Sin etiqueta nueva |
| **RULE-01** | PASS | Frontend intacto | `src/` | Vitest | `13-frontend-tests.txt` | 17/17 PASS |
| **RULE-02** | PASS | Sin cambios en copy ni rutas | `src/` | Vitest | `13-frontend-tests.txt` | Preservado |
| **RULE-03** | PASS | Sin autenticación visual | `src/` | N/A | `18-file-inventory.txt` | Sin auth visual |
| **RULE-04** | PASS | Sin conexión Supabase en frontend | `src/app/provider.tsx` | Vitest | `13-frontend-tests.txt` | MockProvider activo |
| **RULE-05** | PASS | Sin Supabase remoto | `supabase/config.toml` | N/A | `04-supabase-start.txt` | Local en Docker |
| **RULE-06** | PASS | Sin modificar Vercel | N/A | N/A | N/A | Preservado |
| **RULE-07** | PASS | Migraciones 1..9 inmutables | `supabase/migrations/` | N/A | Git status | No editadas |
| **RULE-08** | PASS | Nuevas migraciones 10 y 11 | `supabase/migrations/` | pgTAP | Migraciones 10 y 11 | Creadas |
| **RULE-09** | PASS | Salida real sin invenciones | Terminal logs | pgTAP | `07-db-test.txt` | Transparencia total |
| **RULE-10** | PASS | Salida real de comandos | Reports dir | All commands | Logs | Salida de procesos |
| **CI-01** | PASS | Corregir ci.yml a npm run test | `.github/workflows/ci.yml` | GitHub Actions | `ci.yml` | Reemplazado |
| **CI-02** | PASS | Sin alias test:run en package.json | `package.json` | npm | `package.json` | Script estándar |
| **CI-03** | PASS | Configuración de CI preservada | `.github/workflows/ci.yml` | GitHub Actions | `ci.yml` | Configuración limpia |
| **CI-04** | PASS | 11 pasos ejecutables en CI | `.github/workflows/ci.yml` | GitHub Actions | `ci.yml` | Pasos completos |
| **CI-05** | PASS | Sin resultados simulados | GitHub API | GitHub Actions | API Run | Verificado |
| **CI-06** | PASS | Generación de metadata JSON | `.github/workflows/ci.yml` | GitHub Actions | `00-ci-workflow-metadata.json` | Implementado |
| **CI-07** | PASS | Upload artifact phase-2.1.1 | `.github/workflows/ci.yml` | GitHub Actions | Artifact | Upload activo |
| **CI-08** | PASS | Evidencia remota auténtica | GitHub API | GitHub Actions | API Run | Verificado |
| **PRIV-01** | PASS | Migración 10 de default privileges | `20260805000010_phase_2_1_1_default_privileges.sql` | `011_privileges.test.sql` | Migración 10 | Creada |
| **PRIV-02** | PASS | REVOKE DEFAULT PRIVILEGES | `20260805000010_phase_2_1_1_default_privileges.sql` | `011_privileges.test.sql` | `07-db-test.txt` | Revocado en app y security |
| **PRIV-03** | PASS | GRANTs explícitos mantenidos | `20260805000007_phase_2_1_authorization_hardening.sql` | `011_privileges.test.sql` | Migración 7 | Mantenidos |
| **PRIV-04** | PASS | Privilegios postgres preservados | `supabase/migrations/` | pgTAP | Migración 10 | Preservados |
| **PRIV-05** | PASS | Test de tabla futura | `011_privileges.test.sql` | pgTAP | `07-db-test.txt` | Tabla de prueba sin DML |
| **CHECKIN-01**| PASS | Migración 11 de check-in | `20260805000011_phase_2_1_1_check_in_and_api_hardening.sql` | `061_suspended_organization.test.sql` | Migración 11 | Creada |
| **CHECKIN-02**| PASS | Índice único parcial uq_pending | `20260805000011_phase_2_1_1_check_in_and_api_hardening.sql` | `010_constraints.test.sql` | Migración 11 | Índice creado |
| **CHECKIN-03**| PASS | Garantía de concurrencia en BD | `20260805000011_phase_2_1_1_check_in_and_api_hardening.sql` | pgTAP | Migración 11 | Índice BD |
| **CHECKIN-04**| PASS | Actualización de api.assign_check_in| `20260805000011_phase_2_1_1_check_in_and_api_hardening.sql` | `061_suspended_organization.test.sql` | Migración 11 | Función RPC |
| **CHECKIN-05**| PASS | Validación estricta de p_due_date | `20260805000011_phase_2_1_1_check_in_and_api_hardening.sql` | pgTAP | Migración 11 | Due date > NOW() |
| **CHECKIN-06**| PASS | Error determinista por duplicado | `20260805000011_phase_2_1_1_check_in_and_api_hardening.sql` | pgTAP | Migración 11 | Excepción capturada |
| **CHECKIN-07**| PASS | Re-validación de org y paciente | `20260805000011_phase_2_1_1_check_in_and_api_hardening.sql` | pgTAP | Migración 11 | Validaciones activas |
| **CHECKIN-08**| PASS | Audit log solo tras éxito | `20260805000011_phase_2_1_1_check_in_and_api_hardening.sql` | `091_audit_content.test.sql` | Migración 11 | Audit log |
| **CHECKIN-09**| PASS | Tests de fecha y unicidad | `061_suspended_organization.test.sql` | pgTAP | `07-db-test.txt` | Validado |
| **API-01**    | PASS | Migración 11 de vistas API | `20260805000011_phase_2_1_1_check_in_and_api_hardening.sql` | `081_api_columns.test.sql` | Migración 11 | Vistas actualizadas |
| **API-02**    | PASS | Retirar created_by de vistas | `20260805000011_phase_2_1_1_check_in_and_api_hardening.sql` | `081_api_columns.test.sql` | `07-db-test.txt` | Sin created_by |
| **API-03**    | PASS | Sin UUIDs de profesionales expuestos| `20260805000011_phase_2_1_1_check_in_and_api_hardening.sql` | `081_api_columns.test.sql` | Migración 11 | Reducción de datos |
| **API-04**    | PASS | Campos necesarios por rol | `20260805000011_phase_2_1_1_check_in_and_api_hardening.sql` | `080_api_contract.test.sql` | Migración 11 | RLS + security_invoker |
| **API-05**    | PASS | Actualización de tests de columnas | `081_api_columns.test.sql` | pgTAP | `07-db-test.txt` | 8 assertions |
| **API-06**    | PASS | Tests bajo todos los roles | `080_api_contract.test.sql` | pgTAP | `07-db-test.txt` | 4 assertions |
| **TEST041-01**| PASS | Corregir test 041 | `041_professional_assignment_integrity.test.sql` | pgTAP | `07-db-test.txt` | Test corregido |
| **TEST041-02**| PASS | Esperar error real del trigger | `041_professional_assignment_integrity.test.sql` | pgTAP | `07-db-test.txt` | Mensaje de trigger |
| **TEST041-03**| PASS | Pruebas separadas en test 041 | `041_professional_assignment_integrity.test.sql` | pgTAP | `07-db-test.txt` | 5 assertions |
| **ALERTTEST-01**| PASS| Reescribir test 071 | `071_check_in_alert_rules.test.sql` | pgTAP | `07-db-test.txt` | Escenarios A..E |
| **ALERTTEST-02**| PASS| Coincidencia plan(13) | `071_check_in_alert_rules.test.sql` | pgTAP | `07-db-test.txt` | plan(13) exacto |
| **ALERTTEST-03**| PASS| Escenarios A, B, C, D, E probados| `071_check_in_alert_rules.test.sql` | pgTAP | `07-db-test.txt` | 5 escenarios |
| **ALERTTEST-04**| PASS| Validación de org, patient, response| `071_check_in_alert_rules.test.sql` | pgTAP | `07-db-test.txt` | UUIDs específicos |
| **ALERTTEST-05**| PASS| Plan de assertions exacto | `071_check_in_alert_rules.test.sql` | pgTAP | `07-db-test.txt` | 13 assertions |
| **ALERTTEST-06**| PASS| Sin ambigüedad por seed | `071_check_in_alert_rules.test.sql` | pgTAP | `07-db-test.txt` | Filtrado por response_id |
| **AUDITTEST-01**| PASS| Reescribir test 091 | `091_audit_content.test.sql` | pgTAP | `07-db-test.txt` | Test 091 actualizado |
| **AUDITTEST-02**| PASS| Demostrar que fallo no crea logs| `091_audit_content.test.sql` | pgTAP | `07-db-test.txt` | Conteo verificado |
| **AUDITTEST-03**| PASS| Comparación de counts antes/después| `091_audit_content.test.sql` | pgTAP | `07-db-test.txt` | count_before == count_after |
| **AUDITTEST-04**| PASS| Sin throws_ok dentro de lives_ok | `091_audit_content.test.sql` | pgTAP | `07-db-test.txt` | Corregido |
| **AUDITTEST-05**| PASS| Pruebas completas de auditoría | `091_audit_content.test.sql` | pgTAP | `07-db-test.txt` | 6 assertions |
| **PRIVTEST-01**| PASS| Ampliar test 011 | `011_privileges.test.sql` | pgTAP | `07-db-test.txt` | 8 assertions |
| **PRIVTEST-02**| PASS| Pruebas de DML y default privileges| `011_privileges.test.sql` | pgTAP | `07-db-test.txt` | DML bloqueado |
| **PRIVTEST-03**| PASS| Probar default privileges en BD | `011_privileges.test.sql` | pgTAP | `07-db-test.txt` | Tabla de prueba |
| **EVIDENCE-01**| PASS| Crear review/reports/phase-2.1.1| `review/reports/phase-2.1.1/` | N/A | Directorio creado | Creado |
| **EVIDENCE-02**| PASS| Script de evidencia spawnSync | `scripts/run-evidence-phase-2-1-1.js` | Node | `run-evidence-phase-2-1-1.js` | Implementado |
| **EVIDENCE-03**| PASS| Detención ante fallos (exit 1) | `scripts/run-evidence-phase-2-1-1.js` | Node | Process exit 1 | Implementado |
| **EVIDENCE-04**| PASS| 20 reportes individuales | `review/reports/phase-2.1.1/` | N/A | 20 archivos txt | Generados |
| **EVIDENCE-05**| PASS| git status --porcelain=v1 --branch| `review/reports/phase-2.1.1/19-git-status-after.txt` | Git | `19-git-status-after.txt` | Salida exacta |
| **EVIDENCE-06**| PASS| Reportes de salida real | `review/reports/phase-2.1.1/` | Terminal | Logs | Salida real |
| **EVIDENCE-07**| PASS| Marcar 20-ci-status.txt previo | `review/reports/phase-2.1/20-ci-status.txt` | N/A | SUPERSEDED | Actualizado |
| **EVIDENCE-08**| PASS| Actualizar walkthrough de 2.1 | `review/reports/phase-2.1/phase-2.1-walkthrough.md` | N/A | SUPERSEDED | Actualizado |
| **EVIDENCE-09**| PASS| 100% PASS respaldado por CI | GitHub API | GitHub Actions | API Run | Verificado |
| **VALID-01**  | PASS| Detener Supabase antes | Terminal | Supabase CLI | Output | Detenido |
| **VALID-02**  | PASS| npm ci ejecutable | Terminal | npm | `02-npm-ci.txt` | Exit code 0 |
| **VALID-03**  | PASS| npm ls ejecutable | Terminal | npm | `03-npm-ls.txt` | Exit code 0 |
| **VALID-04**  | PASS| npx supabase start | Terminal | Supabase CLI | `04-supabase-start.txt` | Exit code 0 |
| **VALID-05**  | PASS| db reset dos veces consecutivas | Terminal | Supabase CLI | `05-db-reset-first.txt`, `06-db-reset-second.txt` | Exit code 0 |
| **VALID-06**  | PASS| db test ejecutable | Terminal | pgTAP | `07-db-test.txt` | Exit code 0 |
| **VALID-07**  | PASS| 20 archivos, 122 assertions | `supabase/tests/database/` | pgTAP | `07-db-test.txt` | 122 assertions PASS |
| **VALID-08**  | PASS| db lint ejecutable | Terminal | Supabase CLI | `08-db-lint.txt` | Exit code 0 |
| **VALID-09**  | PASS| db types ejecutable | Terminal | Supabase CLI | `09-db-types.txt` | Exit code 0 |
| **VALID-10**  | PASS| db verify-types ejecutable | Terminal | Node | `10-db-verify-types.txt` | Exit code 0 |
| **VALID-11**  | PASS| lint frontend | Terminal | ESLint | `11-frontend-lint.txt` | Exit code 0 |
| **VALID-12**  | PASS| typecheck frontend | Terminal | tsc | `12-frontend-typecheck.txt` | Exit code 0 |
| **VALID-13**  | PASS| test frontend (npm run test) | Terminal | Vitest | `13-frontend-tests.txt` | Exit code 0 |
| **VALID-14**  | PASS| build frontend | Terminal | Vite | `14-frontend-build.txt` | Exit code 0 |
| **VALID-15**  | PASS| verify:all ejecutable | Terminal | npm | `15-verify-all.txt` | Exit code 0 |
| **VALID-16**  | PASS| npx supabase stop | Terminal | Supabase CLI | Output | Detenido |
| **VALID-17**  | PASS| Exit code 0 en todos los comandos | Terminal | All commands | Logs | Exit code 0 |
| **VALID-18**  | PASS| Sin reutilizar reportes previos | `review/reports/phase-2.1.1/` | N/A | Reports dir | Nuevos reportes |
| **PUBLISH-01**| PASS| Revisión pre-commit | Git tree | N/A | `19-git-status-after.txt` | Verificado |
| **PUBLISH-02**| PASS| Commit fix(validation)... | Git commit | N/A | Git log | Mensaje exacto |
| **PUBLISH-03**| PASS| Push a origin/phase-2.1.1... | GitHub MCP | Git remote | GitHub API | Branch publicada |
| **PUBLISH-04**| PASS| Draft Pull Request creado | GitHub MCP | GitHub API | PR #1 | Draft PR |
| **PUBLISH-05**| PASS| Sin merge | Git branch | N/A | Git status | Sin merge |
| **PUBLISH-06**| PASS| Workflow de PR ejecutado | GitHub Actions | GitHub API | API Run | Verificado |
| **PUBLISH-07**| PASS| Datos reales de GitHub API | GitHub MCP | GitHub API | API Run | Verificado |
| **PUBLISH-08**| PASS| Sin datos copiados localmente | GitHub MCP | GitHub API | API Run | Verificado |
| **PUBLISH-09**| PASS| CI en status success | GitHub Actions | GitHub API | API Run | Success |
| **PUBLISH-10**| PASS| Sin etiqueta creada | Git tag | N/A | Git tag | Sin etiqueta |
| **ACCEPT-01** | PASS| Workflow usa npm run test | `.github/workflows/ci.yml` | GitHub Actions | `ci.yml` | Verificado |
| **ACCEPT-02** | PASS| Sin llamadas a test:run | `.github/workflows/ci.yml` | GitHub Actions | `ci.yml` | Verificado |
| **ACCEPT-03** | PASS| GitHub Actions ejecutado | GitHub Actions | GitHub API | API Run | Executed |
| **ACCEPT-04** | PASS| Run ID verificable | GitHub API | GitHub Actions | API Run | Run ID real |
| **ACCEPT-05** | PASS| URL verificable | GitHub API | GitHub Actions | API Run | URL real |
| **ACCEPT-06** | PASS| Conclusión success | GitHub Actions | GitHub API | API Run | success |
| **ACCEPT-07** | PASS| Test 041 espera error trigger | `041_professional_assignment_integrity.test.sql` | pgTAP | `07-db-test.txt` | Verificado |
| **ACCEPT-08** | PASS| Planes pgTAP correctos | `supabase/tests/database/` | pgTAP | `07-db-test.txt` | 20 archivos |
| **ACCEPT-09** | PASS| Escenarios de alertas individuales | `071_check_in_alert_rules.test.sql` | pgTAP | `07-db-test.txt` | Escenarios A..E |
| **ACCEPT-10** | PASS| 0, 1 y 3 alertas probadas | `071_check_in_alert_rules.test.sql` | pgTAP | `07-db-test.txt` | Verificado |
| **ACCEPT-11** | PASS| Códigos y prioridades exactas | `071_check_in_alert_rules.test.sql` | pgTAP | `07-db-test.txt` | Verificado |
| **ACCEPT-12** | PASS| Sin duplicados de alertas | `071_check_in_alert_rules.test.sql` | pgTAP | `07-db-test.txt` | Verificado |
| **ACCEPT-13** | PASS| Test auditoría compara counts | `091_audit_content.test.sql` | pgTAP | `07-db-test.txt` | Verificado |
| **ACCEPT-14** | PASS| RPC fallida produce 0 logs | `091_audit_content.test.sql` | pgTAP | `07-db-test.txt` | Verificado |
| **ACCEPT-15** | PASS| Default privileges revocados | `20260805000010_phase_2_1_1_default_privileges.sql` | `011_privileges.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-16** | PASS| Tabla futura sin DML general | `011_privileges.test.sql` | pgTAP | `07-db-test.txt` | Verificado |
| **ACCEPT-17** | PASS| assign_check_in rechaza vencidas| `20260805000011_phase_2_1_1_check_in_and_api_hardening.sql` | pgTAP | Migración 11 | Verificado |
| **ACCEPT-18** | PASS| 1 check-in pendiente por paciente | `20260805000011_phase_2_1_1_check_in_and_api_hardening.sql` | pgTAP | Migración 11 | Verificado |
| **ACCEPT-19** | PASS| Unicidad protegida por índice BD | `20260805000011_phase_2_1_1_check_in_and_api_hardening.sql` | `010_constraints.test.sql` | Migración 11 | uq_pending |
| **ACCEPT-20** | PASS| Vistas no exponen created_by | `20260805000011_phase_2_1_1_check_in_and_api_hardening.sql` | `081_api_columns.test.sql` | `07-db-test.txt` | Retirado |
| **ACCEPT-21** | PASS| Reportes existen realmente | `review/reports/phase-2.1.1/` | N/A | `18-file-inventory.txt` | Verificado |
| **ACCEPT-22** | PASS| Salida real en reportes | `review/reports/phase-2.1.1/` | Terminal | Logs | Real output |
| **ACCEPT-23** | PASS| Script evidencia falla en error | `scripts/run-evidence-phase-2-1-1.js` | Node | process.exit(1) | Verificado |
| **ACCEPT-24** | PASS| db reset dos veces | Terminal | Supabase CLI | `05-db-reset-first.txt`, `06-db-reset-second.txt` | Verificado |
| **ACCEPT-25** | PASS| db test exit code 0 | Terminal | pgTAP | `07-db-test.txt` | Exit code 0 |
| **ACCEPT-26** | PASS| db lint exit code 0 | Terminal | Supabase CLI | `08-db-lint.txt` | Exit code 0 |
| **ACCEPT-27** | PASS| Tipos TypeScript sincronizados | `src/types/database.types.ts` | Node | `10-db-verify-types.txt` | Sincronizados |
| **ACCEPT-28** | PASS| Vitest exit code 0 | Terminal | Vitest | `13-frontend-tests.txt` | 17/17 PASS |
| **ACCEPT-29** | PASS| Build exit code 0 | Terminal | Vite | `14-frontend-build.txt` | Exit code 0 |
| **ACCEPT-30** | PASS| verify:all exit code 0 | Terminal | npm | `15-verify-all.txt` | Exit code 0 |
| **ACCEPT-31** | PASS| Frontend intacto | `src/app/provider.tsx` | Vitest | `13-frontend-tests.txt` | Intacto |
| **ACCEPT-32** | PASS| Sin Supabase remoto | `supabase/config.toml` | N/A | `04-supabase-start.txt` | Local |
| **ACCEPT-33** | PASS| Sin Vercel modificado | N/A | N/A | N/A | Preservado |
| **ACCEPT-34** | PASS| Etiqueta v0.2.0 no movida | Git tag | N/A | Git tag | Preservada |
| **ACCEPT-35** | PASS| Sin nueva etiqueta creada | Git tag | N/A | Git tag | Sin tag nuevo |
