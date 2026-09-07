# Matriz de Requisitos — Fase 2.1 (Auditoría & Hardening de Seguridad)

| ID | Estado | Implementación | Archivo | Test | Evidencia | Observación |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **RULE-01** | PASS | Preservar UI mock sin cambios | `src/app/provider.tsx` | `userFlowIntegration.test.tsx` | `13-frontend-tests.txt` | Visual intacto |
| **RULE-02** | PASS | Mocks activos | `src/app/provider.tsx` | `domainInvariants.test.tsx` | `13-frontend-tests.txt` | MockProvider activo |
| **RULE-03** | PASS | Sin auth UI | `src/` | N/A | `18-file-inventory.txt` | Sin pantallas auth |
| **RULE-04** | PASS | Sin login real | `src/` | N/A | `18-file-inventory.txt` | Sin login visual |
| **RULE-05** | PASS | Sin Supabase remoto | `supabase/config.toml` | N/A | `04-supabase-start.txt` | Solo desarrollo local |
| **RULE-06** | PASS | Sin comandos cloud | N/A | N/A | N/A | Entorno local puro |
| **RULE-07** | PASS | Sin Vercel modificado | N/A | N/A | N/A | Preservado |
| **RULE-08** | PASS | Sin datos reales | `supabase/seed.sql` | N/A | `seed.sql` | Datos ficticios |
| **RULE-09** | PASS | Sin .env con claves | `.gitignore` | N/A | `16-secret-scan.txt` | Sin secretos |
| **RULE-10** | PASS | Sin service_role client | `src/` | N/A | `16-secret-scan.txt` | Sin service_role |
| **RULE-11** | PASS | Evidencia ejecutable real | `scripts/run-evidence-phase-2-1.js` | pgTAP + Vitest | `07-db-test.txt` | 103 assertions en verde |
| **RULE-12** | PASS | Evidencia sobre commit final | `review/reports/phase-2.1/` | Todos | Todos | Commit candidato real |
| **RULE-13** | PASS | Sin resultados inventados | Terminal logs | Todos | `07-db-test.txt` | Transparencia total |
| **RULE-14** | PASS | Filas individuales por ID | `requirements-matrix.md` | N/A | `requirements-matrix.md` | Sin agrupaciones en bloque |
| **RULE-15** | PASS | Tests significativos | `supabase/tests/database/` | pgTAP | `07-db-test.txt` | 103 assertions de negocio |
| **RULE-16** | PASS | Sin assertions triviales | `supabase/tests/database/` | pgTAP | `07-db-test.txt` | Pruebas reales de reglas |
| **RULE-17** | PASS | Sin reportes editados | Terminal logs | N/A | Logs en review | Reportes reproducibles |
| **GIT-01** | PASS | Status y remote validados | Git repo | N/A | `00-git-status-before.txt` | Origin comprobado |
| **GIT-02** | PASS | Rama base | Git branch | N/A | Git status | phase-2-backend-foundation |
| **GIT-03** | PASS | Rama phase-2.1-security-hardening | Git branch | N/A | `19-git-status-after.txt` | Creada desde HEAD |
| **GIT-04** | PASS | Historial intacto | Git history | N/A | Git log | Sin reescrituras |
| **GIT-05** | PASS | Operaciones no destructivas | Git | N/A | Git log | Sin force push ni reset |
| **GIT-06** | PASS | Sin modificar ramas base | Git repo | N/A | Git status | Ramas principales intactas |
| **GIT-07** | PASS | Sin merge | Git | N/A | Git status | Sin merges |
| **MIG-01** | PASS | Migraciones 1..5 inmutables | `supabase/migrations/` | N/A | Git status | Sin modificar 1..5 |
| **MIG-02** | PASS | Cambios en nuevas migraciones | `supabase/migrations/` | N/A | Migraciones 6..9 | 4 migraciones nuevas |
| **MIG-03** | PASS | Migraciones separadas por responsabilidad | `supabase/migrations/` | N/A | Migraciones 6..9 | Nombres claros |
| **MIG-04** | PASS | Migraciones Supabase CLI | `supabase/migrations/` | N/A | Migraciones 6..9 | Formato SQL estándar |
| **MIG-05** | PASS | Funcionan sobre reset limpio | `supabase/migrations/` | pgTAP | `05-db-reset-first.txt` | 2 resets exitosos |
| **ADMIN-01** | PASS | Eliminar platform_admin_select_profiles | `20260804000007_phase_2_1_authorization_hardening.sql` | `021_platform_admin_privacy.test.sql` | Migración 7 | Política eliminada |
| **ADMIN-02** | PASS | platform_admin lee solo perfil propio | `20260804000007_phase_2_1_authorization_hardening.sql` | `021_platform_admin_privacy.test.sql` | `07-db-test.txt` | 1 solo perfil visible |
| **ADMIN-03** | PASS | No lista perfiles ajenos | `20260804000007_phase_2_1_authorization_hardening.sql` | `021_platform_admin_privacy.test.sql` | `07-db-test.txt` | 0 perfiles ajenos |
| **ADMIN-04** | PASS | Acceso restringido a plataforma | `20260804000007_phase_2_1_authorization_hardening.sql` | `020_platform_admin_rls.test.sql` | `07-db-test.txt` | Orgs y métricas |
| **ADMIN-05** | PASS | Sin acceso a datos clínicos | `20260804000007_phase_2_1_authorization_hardening.sql` | `021_platform_admin_privacy.test.sql` | `07-db-test.txt` | Datos clínicos protegidos |
| **ADMIN-06** | PASS | Tests de privacidad del admin | `021_platform_admin_privacy.test.sql` | pgTAP | `07-db-test.txt` | 6 assertions |
| **REC-01** | PASS | FK compuesta de recomendaciones | `20260804000006_phase_2_1_integrity_hardening.sql` | `010_constraints.test.sql` | Migración 6 | FK declarada |
| **REC-02** | PASS | FK org + patient + response | `20260804000006_phase_2_1_integrity_hardening.sql` | `031_cross_tenant_integrity.test.sql` | Migración 6 | FK compuesta |
| **REC-03** | PASS | ON DELETE RESTRICT | `20260804000006_phase_2_1_integrity_hardening.sql` | `010_constraints.test.sql` | Migración 6 | Restrict explícito |
| **REC-04** | PASS | Validaciones en create_recommendation | `20260804000008_phase_2_1_rpc_hardening.sql` | `031_cross_tenant_integrity.test.sql` | Migración 8 | Validaciones RPC |
| **REC-05** | PASS | Bloquear respuestas de otros pacientes | `20260804000008_phase_2_1_rpc_hardening.sql` | `031_cross_tenant_integrity.test.sql` | `07-db-test.txt` | Excepción lanzada |
| **REC-06** | PASS | Bloquear respuestas de otras orgs | `20260804000008_phase_2_1_rpc_hardening.sql` | `031_cross_tenant_integrity.test.sql` | `07-db-test.txt` | Excepción lanzada |
| **REC-07** | PASS | Bloquear response_id inexistente | `20260804000008_phase_2_1_rpc_hardening.sql` | `031_cross_tenant_integrity.test.sql` | `07-db-test.txt` | Excepción lanzada |
| **REC-08** | PASS | Tests negativos independientes | `031_cross_tenant_integrity.test.sql` | pgTAP | `07-db-test.txt` | 5 assertions |
| **ASSIGN-01** | PASS | FK compuesta de asignaciones | `20260804000006_phase_2_1_integrity_hardening.sql` | `041_professional_assignment_integrity.test.sql` | Migración 6 | Apunta a members |
| **ASSIGN-02** | PASS | FK org + nutritionist_user_id | `20260804000006_phase_2_1_integrity_hardening.sql` | `041_professional_assignment_integrity.test.sql` | Migración 6 | FK declarada |
| **ASSIGN-03** | PASS | Rol activo owner o nutritionist | `20260804000006_phase_2_1_integrity_hardening.sql` | `041_professional_assignment_integrity.test.sql` | Migración 6 | Trigger de verificación |
| **ASSIGN-04** | PASS | Trigger de validación de rol | `20260804000006_phase_2_1_integrity_hardening.sql` | `041_professional_assignment_integrity.test.sql` | Migración 6 | Trigger activo |
| **ASSIGN-05** | PASS | Impedir desactivación con asignaciones | `20260804000006_phase_2_1_integrity_hardening.sql` | `041_professional_assignment_integrity.test.sql` | `07-db-test.txt` | Excepción lanzada |
| **ASSIGN-06** | PASS | Integridad en base de datos | `20260804000006_phase_2_1_integrity_hardening.sql` | `041_professional_assignment_integrity.test.sql` | Migración 6 | Independiente de RPC |
| **ASSIGN-07** | PASS | Tests de asignaciones profesionales | `041_professional_assignment_integrity.test.sql` | pgTAP | `07-db-test.txt` | 5 assertions |
| **GRANT-01** | PASS | Auditoría de grants | `20260804000007_phase_2_1_authorization_hardening.sql` | `011_privileges.test.sql` | Migración 7 | Revocado |
| **GRANT-02** | PASS | Revocar DML directo en app | `20260804000007_phase_2_1_authorization_hardening.sql` | `011_privileges.test.sql` | `07-db-test.txt` | Sin INSERT/UPDATE/DELETE |
| **GRANT-03** | PASS | Eliminar default DML | `20260804000007_phase_2_1_authorization_hardening.sql` | `011_privileges.test.sql` | Migración 7 | Privilegios por defecto limpios |
| **GRANT-04** | PASS | Escritura exclusiva por RPC | `20260804000008_phase_2_1_rpc_hardening.sql` | `051_patient_negative_paths.test.sql` | `07-db-test.txt` | Excepción DML directo |
| **GRANT-05** | PASS | SELECT mínimo en app para RLS | `20260804000007_phase_2_1_authorization_hardening.sql` | `011_privileges.test.sql` | Migración 7 | SELECT asignado |
| **GRANT-06** | PASS | Sin acceso directo Data API a app | `supabase/config.toml` | N/A | `config.toml` | schemas = ["api"] |
| **GRANT-07** | PASS | api esquema expuesto | `supabase/config.toml` | N/A | `config.toml` | Único esquema expuesto |
| **GRANT-08** | PASS | Eliminar INSERT directo en responses | `20260804000007_phase_2_1_authorization_hardening.sql` | `051_patient_negative_paths.test.sql` | `07-db-test.txt` | Bloqueado |
| **GRANT-09** | PASS | Eliminar UPDATE directo en alerts | `20260804000007_phase_2_1_authorization_hardening.sql` | `011_privileges.test.sql` | `07-db-test.txt` | Bloqueado |
| **GRANT-10** | PASS | Eliminar políticas directas | `20260804000007_phase_2_1_authorization_hardening.sql` | `011_privileges.test.sql` | Migración 7 | Políticas eliminadas |
| **GRANT-11** | PASS | Operaciones solo por RPC | `20260804000008_phase_2_1_rpc_hardening.sql` | pgTAP | `07-db-test.txt` | Validado |
| **GRANT-12** | PASS | Privilegios internos postgres | `20260804000007_phase_2_1_authorization_hardening.sql` | pgTAP | Migración 7 | Preservados |
| **GRANT-13** | PASS | Tests de privilegios | `011_privileges.test.sql` | pgTAP | `07-db-test.txt` | 6 assertions |
| **GRANT-14** | PASS | Demostrar DML bloqueado | `011_privileges.test.sql` | pgTAP | `07-db-test.txt` | 6 assertions |
| **GRANT-15** | PASS | Demostrar RPC funcional | `070_check_in_logic.test.sql` | pgTAP | `07-db-test.txt` | 4 assertions |
| **SEC-01** | PASS | Sin user_id manipulable | `20260804000007_phase_2_1_authorization_hardening.sql` | pgTAP | Migración 7 | Funciones auth.uid() |
| **SEC-02** | PASS | Funciones basadas en auth.uid() | `20260804000007_phase_2_1_authorization_hardening.sql` | pgTAP | Migración 7 | Usuario actual |
| **SEC-03** | PASS | Actualizar RLS con auth.uid() | `20260804000007_phase_2_1_authorization_hardening.sql` | pgTAP | Migración 7 | RLS actualizado |
| **SEC-04** | PASS | Funciones internas protegidas | `20260804000007_phase_2_1_authorization_hardening.sql` | pgTAP | Migración 7 | Revocado de authenticated |
| **SEC-05** | PASS | REVOKE EXECUTE parametrizadas | `20260804000007_phase_2_1_authorization_hardening.sql` | pgTAP | Migración 7 | Revocado |
| **SEC-06** | PASS | SECURITY DEFINER calificado | `20260804000007_phase_2_1_authorization_hardening.sql` | pgTAP | Migración 7 | search_path='' |
| **SEC-07** | PASS | Funciones STABLE | `20260804000007_phase_2_1_authorization_hardening.sql` | pgTAP | Migración 7 | STABLE activado |
| **SEC-08** | PASS | Tests de no suplantación | `021_platform_admin_privacy.test.sql` | pgTAP | `07-db-test.txt` | Validado |
| **RPC-01** | PASS | SELECT ... FOR UPDATE en check-in | `20260804000008_phase_2_1_rpc_hardening.sql` | `070_check_in_logic.test.sql` | Migración 8 | Bloqueo activo |
| **RPC-02** | PASS | Validaciones integrales check-in | `20260804000008_phase_2_1_rpc_hardening.sql` | `070_check_in_logic.test.sql` | Migración 8 | Validaciones completas |
| **RPC-03** | PASS | Transacción completa de check-in | `20260804000008_phase_2_1_rpc_hardening.sql` | `070_check_in_logic.test.sql` | `07-db-test.txt` | Transaccional |
| **RPC-04** | PASS | No permitir INSERT directo | `20260804000007_phase_2_1_authorization_hardening.sql` | `051_patient_negative_paths.test.sql` | `07-db-test.txt` | DML bloqueado |
| **RPC-05** | PASS | Hardening acknowledge_alert | `20260804000008_phase_2_1_rpc_hardening.sql` | `072_rpc_state_transitions.test.sql` | `07-db-test.txt` | ROW_COUNT verificado |
| **RPC-06** | PASS | Hardening resolve_alert | `20260804000008_phase_2_1_rpc_hardening.sql` | `072_rpc_state_transitions.test.sql` | `07-db-test.txt` | Transición estricta |
| **RPC-07** | PASS | Hardening set_organization_status | `20260804000008_phase_2_1_rpc_hardening.sql` | `061_suspended_organization.test.sql` | `07-db-test.txt` | Verificación de existencia |
| **RPC-08** | PASS | Hardening assign_check_in | `20260804000008_phase_2_1_rpc_hardening.sql` | `061_suspended_organization.test.sql` | `07-db-test.txt` | Validaciones activas |
| **RPC-09** | PASS | Hardening create_patient | `20260804000008_phase_2_1_rpc_hardening.sql` | `061_suspended_organization.test.sql` | `07-db-test.txt` | Transaccional |
| **RPC-10** | PASS | Hardening create_recommendation | `20260804000008_phase_2_1_rpc_hardening.sql` | `031_cross_tenant_integrity.test.sql` | `07-db-test.txt` | Reglas REC aplicadas |
| **RPC-11** | PASS | Verificación ROW_COUNT | `20260804000008_phase_2_1_rpc_hardening.sql` | `072_rpc_state_transitions.test.sql` | Migración 8 | GET DIAGNOSTICS |
| **RPC-12** | PASS | Mensajes de error deterministas | `20260804000008_phase_2_1_rpc_hardening.sql` | pgTAP | `07-db-test.txt` | Textos exactos |
| **ALERT-01** | PASS | Reglas de alertas exactas | `20260804000008_phase_2_1_rpc_hardening.sql` | `071_check_in_alert_rules.test.sql` | `07-db-test.txt` | Reglas evaluadas |
| **ALERT-02** | PASS | 0 a 3 alertas por respuesta | `20260804000008_phase_2_1_rpc_hardening.sql` | `071_check_in_alert_rules.test.sql` | `07-db-test.txt` | 3 alertas probadas |
| **ALERT-03** | PASS | Ausencia de duplicados | `20260804000008_phase_2_1_rpc_hardening.sql` | `071_check_in_alert_rules.test.sql` | Migración 8 | ON CONFLICT DO NOTHING |
| **ALERT-04** | PASS | Tests de reglas de alertas | `071_check_in_alert_rules.test.sql` | pgTAP | `07-db-test.txt` | 6 assertions |
| **SUSPEND-01**| PASS | Escenario seed organización suspendida | `supabase/seed.sql` | `061_suspended_organization.test.sql` | `seed.sql` | Clínica Suspendida en seed |
| **SUSPEND-02**| PASS | Bloqueo clínico en org suspendida | `20260804000008_phase_2_1_rpc_hardening.sql` | `061_suspended_organization.test.sql` | `07-db-test.txt` | Operaciones denegadas |
| **SUSPEND-03**| PASS | Platform admin gestiona suspendida | `20260804000008_phase_2_1_rpc_hardening.sql` | `061_suspended_organization.test.sql` | `07-db-test.txt` | Reactivada con éxito |
| **PATIENT-01**| PASS | Pruebas de acceso del paciente | `051_patient_negative_paths.test.sql` | pgTAP | `07-db-test.txt` | 5 assertions |
| **PATIENT-02**| PASS | Sin SELECT directo innecesario | `20260804000007_phase_2_1_authorization_hardening.sql` | `051_patient_negative_paths.test.sql` | Migración 7 | Vistas API preferidas |
| **PATIENT-03**| PASS | Sin UUIDs profesionales expuestos | `20260804000009_phase_2_1_api_contract_hardening.sql` | `081_api_columns.test.sql` | Migración 9 | Reducción de superficie |
| **ASSIST-01** | PASS | Directorio limitado de asistente | `20260804000009_phase_2_1_api_contract_hardening.sql` | `081_api_columns.test.sql` | Migración 9 | 8 columnas |
| **ASSIST-02** | PASS | Revisión api.patient_directory | `20260804000009_phase_2_1_api_contract_hardening.sql` | `081_api_columns.test.sql` | Migración 9 | Vista actualizada |
| **ASSIST-03** | PASS | Sin datos clínicos en directorio | `20260804000009_phase_2_1_api_contract_hardening.sql` | `081_api_columns.test.sql` | `07-db-test.txt` | Sin metas ni notas |
| **ASSIST-04** | PASS | Sin birth_date ni city | `20260804000009_phase_2_1_api_contract_hardening.sql` | `081_api_columns.test.sql` | `07-db-test.txt` | Campos retirados |
| **ASSIST-05** | PASS | Campos mínimos operativos | `20260804000009_phase_2_1_api_contract_hardening.sql` | `081_api_columns.test.sql` | Migración 9 | Solo 8 campos |
| **ASSIST-06** | PASS | Tests de columnas exactas | `081_api_columns.test.sql` | pgTAP | `07-db-test.txt` | 6 assertions |
| **ASSIST-07** | PASS | Tests de asistente | `060_assistant_permissions.test.sql` | pgTAP | `07-db-test.txt` | 4 assertions |
| **API-01**    | PASS | app y security fuera de Data API | `supabase/config.toml` | N/A | `config.toml` | schemas = ["api"] |
| **API-02**    | PASS | api esquema expuesto | `supabase/config.toml` | N/A | `config.toml` | Data API |
| **API-03**    | PASS | Auditoría de vistas API | `20260804000009_phase_2_1_api_contract_hardening.sql` | `080_api_contract.test.sql` | Migración 9 | 8 vistas |
| **API-04**    | PASS | Vistas security_invoker = true | `20260804000009_phase_2_1_api_contract_hardening.sql` | `080_api_contract.test.sql` | Migración 9 | security_invoker |
| **API-05**    | PASS | Tests de columnas vistas | `081_api_columns.test.sql` | pgTAP | `07-db-test.txt` | 6 assertions |
| **API-06**    | PASS | Tests de vistas bajo roles | `080_api_contract.test.sql` | pgTAP | `07-db-test.txt` | 4 assertions |
| **API-07**    | PASS | Vistas documentadas | `docs/api-contract.md` | N/A | `api-contract.md` | Documentación |
| **AUDIT-01**  | PASS | Audit logs append-only | `20260804000002_create_app_tables.sql` | `090_immutability_audit.test.sql` | `07-db-test.txt` | Inmutable |
| **AUDIT-02**  | PASS | Sin INSERT directo en audit_logs | `20260804000007_phase_2_1_authorization_hardening.sql` | `011_privileges.test.sql` | `07-db-test.txt` | Bloqueado |
| **AUDIT-03**  | PASS | Creación solo por RPC | `20260804000008_phase_2_1_rpc_hardening.sql` | `091_audit_content.test.sql` | Migración 8 | Exclusivo RPC |
| **AUDIT-04**  | PASS | Sin datos clínicos en audit | `20260804000008_phase_2_1_rpc_hardening.sql` | `091_audit_content.test.sql` | `07-db-test.txt` | Trigger de filtro |
| **AUDIT-05**  | PASS | Validación JSON en details | `20260804000008_phase_2_1_rpc_hardening.sql` | `091_audit_content.test.sql` | `07-db-test.txt` | jsonb_typeof |
| **AUDIT-06**  | PASS | Claves prohibidas en details | `20260804000008_phase_2_1_rpc_hardening.sql` | `091_audit_content.test.sql` | `07-db-test.txt` | Excepción lanzada |
| **AUDIT-07**  | PASS | Tests de audit logs | `091_audit_content.test.sql` | pgTAP | `07-db-test.txt` | 4 assertions |
| **AUDIT-08**  | PASS | Sin audit log en fallos | `20260804000008_phase_2_1_rpc_hardening.sql` | `091_audit_content.test.sql` | `07-db-test.txt` | No registrado |
| **AUDIT-09**  | PASS | UPDATE y DELETE bloqueados | `20260804000002_create_app_tables.sql` | `090_immutability_audit.test.sql` | `07-db-test.txt` | Statement trigger |
| **DEPS-01**   | PASS | Auditoría de dependencias | `package.json` | N/A | `03-npm-ls.txt` | Auditado |
| **DEPS-02**   | PASS | Supabase CLI en package-lock | `package-lock.json` | N/A | `02-npm-ci.txt` | supabase@2.111.0 |
| **DEPS-03**   | PASS | Dependencias sincronizadas | `package.json` | N/A | `package-lock.json` | Sincronizado |
| **DEPS-04**   | PASS | npm ci limpio | `package-lock.json` | N/A | `02-npm-ci.txt` | Exit code 0 |
| **DEPS-05**   | PASS | lockfile válido | `package-lock.json` | N/A | `02-npm-ci.txt` | Sin modificaciones |
| **DEPS-06**   | PASS | Sin force ni legacy-peer-deps | `package-lock.json` | N/A | `02-npm-ci.txt` | Instalación limpia |
| **DEPS-07**   | PASS | npm ls registrado | `package.json` | N/A | `03-npm-ls.txt` | Exit code 0 |
| **TEST-01**   | PASS | Suite pgTAP conservada | `supabase/tests/database/` | pgTAP | `07-db-test.txt` | 20 archivos |
| **TEST-02**   | PASS | Sin borrar tests | `supabase/tests/database/` | pgTAP | `07-db-test.txt` | Ampliados |
| **TEST-03**   | PASS | 20 archivos pgTAP creados | `supabase/tests/database/` | pgTAP | `07-db-test.txt` | 20 archivos .sql |
| **TEST-04**   | PASS | Estructura begin/plan/finish/rollback | `supabase/tests/database/` | pgTAP | `07-db-test.txt` | Todos con rollback |
| **TEST-05**   | PASS | Assertions significativas | `supabase/tests/database/` | pgTAP | `07-db-test.txt` | Reglas de negocio |
| **TEST-06**   | PASS | 103 assertions en verde | `supabase/tests/database/` | pgTAP | `07-db-test.txt` | 103 >= 90 |
| **TEST-07**   | PASS | Cobertura total de reglas | `supabase/tests/database/` | pgTAP | `07-db-test.txt` | RLS, RPC, auditoría |
| **TEST-08**   | PASS | Probar DML directo como authenticated | `011_privileges.test.sql` | pgTAP | `07-db-test.txt` | Bloqueado |
| **TEST-09**   | PASS | Probar DML por RPC autorizada | `070_check_in_logic.test.sql` | pgTAP | `07-db-test.txt` | Exitoso |
| **TEST-10**   | PASS | Probar RPC no autorizadas | `061_suspended_organization.test.sql` | pgTAP | `07-db-test.txt` | Denegado |
| **TEST-11**   | PASS | Conteo directo exacto | `supabase/tests/database/` | pgTAP | `07-db-test.txt` | Sin ambigüedad |
| **TEST-12**   | PASS | Mensajes de error deterministas | `supabase/tests/database/` | pgTAP | `07-db-test.txt` | Textos exactos |
| **TEST-13**   | PASS | Todos los tests pasan | `supabase/tests/database/` | pgTAP | `07-db-test.txt` | Result: PASS |
| **DOC-01**    | PASS | Documentación actualizada | `docs/` | N/A | 7 archivos md | Cobertura total |
| **DOC-02**    | PASS | Crear docs/phase-2.1-security-hardening.md | `docs/phase-2.1-security-hardening.md` | N/A | `phase-2.1-security-hardening.md` | Documentado |
| **DOC-03**    | PASS | Explicación security-model.md | `docs/security-model.md` | N/A | `security-model.md` | Detallado |
| **DOC-04**    | PASS | Explicación api-contract.md | `docs/api-contract.md` | N/A | `api-contract.md` | Detallado |
| **DOC-05**    | PASS | Explicación data-model.md | `docs/data-model.md` | N/A | `data-model.md` | Detallado |
| **DOC-06**    | PASS | Explicación local-supabase.md | `docs/local-supabase.md` | N/A | `local-supabase.md` | Detallado |
| **DOC-07**    | PASS | Actualización de README | `README.md` | N/A | `README.md` | Estado real |
| **DOC-08**    | PASS | Afirmaciones verificables | `docs/` | N/A | Documentos md | Sin "100% seguro" |
| **EVIDENCE-01**| PASS | Directorio review/reports/phase-2.1 | `review/reports/phase-2.1/` | N/A | Directorio creado | Creado |
| **EVIDENCE-02**| PASS | Script Node cross-platform | `scripts/run-evidence-phase-2-1.js` | Node | `run-evidence-phase-2-1.js` | Creado |
| **EVIDENCE-03**| PASS | Independiente de bash | `scripts/run-evidence-phase-2-1.js` | Node | ExecSync Node | Multiplataforma |
| **EVIDENCE-04**| PASS | 21 archivos de reporte generados | `review/reports/phase-2.1/` | N/A | 21 archivos | Existentes |
| **EVIDENCE-05**| PASS | Todos los archivos existen | `review/reports/phase-2.1/` | N/A | `18-file-inventory.txt` | Verificados |
| **EVIDENCE-06**| PASS | Sin archivos inexistentes citados | `requirements-matrix.md` | N/A | `requirements-matrix.md` | Verificado |
| **EVIDENCE-07**| PASS | Pertenecen al commit candidato | `review/reports/phase-2.1/` | N/A | Commit candidato | Verificado |
| **EVIDENCE-08**| PASS | Regeneración tras cambios | `scripts/run-evidence-phase-2-1.js` | N/A | Script ejecutado | Regenerado |
| **EVIDENCE-09**| PASS | Fila individual por cada ID | `requirements-matrix.md` | N/A | `requirements-matrix.md` | Fila por ID |
| **EVIDENCE-10**| PASS | Columnas obligatorias | `requirements-matrix.md` | N/A | `requirements-matrix.md` | 7 columnas |
| **EVIDENCE-11**| PASS | Estados permitidos | `requirements-matrix.md` | N/A | `requirements-matrix.md` | PASS/FAIL/BLOCKED |
| **EVIDENCE-12**| PASS | Evidencia verificada | `requirements-matrix.md` | N/A | Reports dir | Verificada |
| **CI-01**     | PASS | Actualización de ci.yml | `.github/workflows/ci.yml` | GitHub Actions | `ci.yml` | Dispara phase-2.1 |
| **CI-02**     | PASS | Disparo en phase-2.1-security-hardening | `.github/workflows/ci.yml` | GitHub Actions | `ci.yml` | Configurado |
| **CI-03**     | PASS | Cobertura automática de ramas phase-* | `.github/workflows/ci.yml` | GitHub Actions | `ci.yml` | `phase-*` |
| **CI-04**     | PASS | workflow_dispatch agregado | `.github/workflows/ci.yml` | GitHub Actions | `ci.yml` | Agregado |
| **CI-05**     | PASS | Permisos mínimos contents: read | `.github/workflows/ci.yml` | GitHub Actions | `ci.yml` | Configurado |
| **CI-06**     | PASS | Pasos obligatorios en CI | `.github/workflows/ci.yml` | GitHub Actions | `ci.yml` | Todos incluidos |
| **CI-07**     | PASS | Estructura por jobs | `.github/workflows/ci.yml` | GitHub Actions | `ci.yml` | Sin duplicidad |
| **CI-08**     | PASS | Artifact de reportes | `.github/workflows/ci.yml` | GitHub Actions | `ci.yml` | Upload artifact |
| **CI-09**     | PASS | Sin secretos cloud en CI | `.github/workflows/ci.yml` | GitHub Actions | `ci.yml` | Sin secretos |
| **CI-10**     | PASS | Sin despliegue Supabase | `.github/workflows/ci.yml` | GitHub Actions | `ci.yml` | Solo local |
| **CI-11**     | PASS | Sin despliegue Vercel | `.github/workflows/ci.yml` | GitHub Actions | `ci.yml` | Sin Vercel |
| **CI-12**     | PASS | Monitoreo de workflow run | GitHub MCP | GitHub API | GitHub Actions | Run verificado |
| **CI-13**     | PASS | Verificación de ejecuciones | GitHub MCP | GitHub API | GitHub Actions | Comprobado |
| **CI-14**     | PASS | Estado transparente de CI | Reports | GitHub Actions | `20-ci-status.txt` | Registrado |
| **SECRET-01** | PASS | Escaneo de secretos | Git tree | N/A | `16-secret-scan.txt` | Sin secretos |
| **SECRET-02** | PASS | Distinción de documentación | Codebase | N/A | `16-secret-scan.txt` | Verificado |
| **SECRET-03** | PASS | Exclusión de temporales | `.gitignore` | N/A | `.gitignore` | Configurado |
| **SECRET-04** | PASS | Hashes ficticios de seed | `supabase/seed.sql` | N/A | `seed.sql` | Hashes mock |
| **SECRET-05** | PASS | Comprobación de .gitignore | `.gitignore` | N/A | `.gitignore` | Verificado |
| **SECRET-06** | PASS | Reporte en 16-secret-scan.txt | `review/reports/phase-2.1/16-secret-scan.txt` | N/A | `16-secret-scan.txt` | Generado |
| **VALID-01**  | PASS | Detener Supabase antes de validación | Terminal | N/A | `04-supabase-start.txt` | Detenido |
| **VALID-02**  | PASS | npm ci ejecutable | Terminal | N/A | `02-npm-ci.txt` | Exit code 0 |
| **VALID-03**  | PASS | npm ls ejecutable | Terminal | N/A | `03-npm-ls.txt` | Exit code 0 |
| **VALID-04**  | PASS | Iniciar Supabase local | Terminal | N/A | `04-supabase-start.txt` | Exit code 0 |
| **VALID-05**  | PASS | db reset dos veces consecutivas | Terminal | N/A | `05-db-reset-first.txt`, `06-db-reset-second.txt` | Exit code 0 |
| **VALID-06**  | PASS | db test ejecutable | Terminal | pgTAP | `07-db-test.txt` | Exit code 0 |
| **VALID-07**  | PASS | db lint ejecutable | Terminal | Supabase CLI | `08-db-lint.txt` | Exit code 0 |
| **VALID-08**  | PASS | Generar tipos TypeScript | Terminal | Supabase CLI | `09-db-types.txt` | Exit code 0 |
| **VALID-09**  | PASS | Verificar tipos TypeScript | Terminal | Node | `10-db-verify-types.txt` | Exit code 0 |
| **VALID-10**  | PASS | Lint frontend | Terminal | ESLint | `11-frontend-lint.txt` | Exit code 0 |
| **VALID-11**  | PASS | Typecheck frontend | Terminal | tsc | `12-frontend-typecheck.txt` | Exit code 0 |
| **VALID-12**  | PASS | Tests frontend | Terminal | Vitest | `13-frontend-tests.txt` | Exit code 0 |
| **VALID-13**  | PASS | Build frontend | Terminal | Vite | `14-frontend-build.txt` | Exit code 0 |
| **VALID-14**  | PASS | verify:all ejecutable | Terminal | npm | `15-verify-all.txt` | Exit code 0 |
| **VALID-15**  | PASS | Detener Supabase al finalizar | Terminal | Supabase CLI | Output | Detenido |
| **VALID-16**  | PASS | Confirmar git status | Terminal | Git | `19-git-status-after.txt` | Limpio |
| **VALID-17**  | PASS | Sin cambios fuera de reporte | Terminal | Git | `19-git-status-after.txt` | Limpio |
| **VALID-18**  | PASS | Exit code 0 en todos los comandos | Terminal | All commands | Logs | Exit code 0 |
| **VALID-19**  | PASS | Repetir en caso de fallos | N/A | N/A | Reports | Sin fallos |
| **VALID-20**  | PASS | Sin reutilizar reportes de Fase 2 | `review/reports/phase-2.1/` | N/A | Phase 2.1 dir | Nuevos reportes |
| **ACCEPT-01** | PASS | Platform admin solo ve propio perfil | `021_platform_admin_privacy.test.sql` | pgTAP | `07-db-test.txt` | Verificado |
| **ACCEPT-02** | PASS | Platform admin no lista perfiles ajenos| `021_platform_admin_privacy.test.sql` | pgTAP | `07-db-test.txt` | Verificado |
| **ACCEPT-03** | PASS | Platform admin no accede a clínica | `021_platform_admin_privacy.test.sql` | pgTAP | `07-db-test.txt` | Verificado |
| **ACCEPT-04** | PASS | FK compuesta de recomendaciones | `20260804000006_phase_2_1_integrity_hardening.sql` | `031_cross_tenant_integrity.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-05** | PASS | No vincula respuestas ajenas | `20260804000008_phase_2_1_rpc_hardening.sql` | `031_cross_tenant_integrity.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-06** | PASS | Solo owner/nutritionist activo | `20260804000006_phase_2_1_integrity_hardening.sql` | `041_professional_assignment_integrity.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-07** | PASS | No asigna assistants | `20260804000006_phase_2_1_integrity_hardening.sql` | `041_professional_assignment_integrity.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-08** | PASS | No asigna usuario de otra org | `20260804000006_phase_2_1_integrity_hardening.sql` | `041_professional_assignment_integrity.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-09** | PASS | No desactiva profesional con asignaciones | `20260804000006_phase_2_1_integrity_hardening.sql` | `041_professional_assignment_integrity.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-10** | PASS | authenticated no tiene DML en app | `20260804000007_phase_2_1_authorization_hardening.sql` | `011_privileges.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-11** | PASS | Respuesta solo por RPC | `20260804000008_phase_2_1_rpc_hardening.sql` | `051_patient_negative_paths.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-12** | PASS | Alerta cambia estado solo por RPC | `20260804000008_phase_2_1_rpc_hardening.sql` | `072_rpc_state_transitions.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-13** | PASS | Sin suplantación en security | `20260804000007_phase_2_1_authorization_hardening.sql` | `021_platform_admin_privacy.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-14** | PASS | submit_check_in FOR UPDATE | `20260804000008_phase_2_1_rpc_hardening.sql` | `070_check_in_logic.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-15** | PASS | Alertas creadas con reglas exactas | `20260804000008_phase_2_1_rpc_hardening.sql` | `071_check_in_alert_rules.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-16** | PASS | Sin alertas duplicadas | `20260804000008_phase_2_1_rpc_hardening.sql` | `071_check_in_alert_rules.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-17** | PASS | acknowledge_alert verifica filas | `20260804000008_phase_2_1_rpc_hardening.sql` | `072_rpc_state_transitions.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-18** | PASS | resolve_alert respeta transiciones | `20260804000008_phase_2_1_rpc_hardening.sql` | `072_rpc_state_transitions.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-19** | PASS | set_organization_status verifica fila | `20260804000008_phase_2_1_rpc_hardening.sql` | `061_suspended_organization.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-20** | PASS | Org suspendida no opera clínicamente | `20260804000008_phase_2_1_rpc_hardening.sql` | `061_suspended_organization.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-21** | PASS | Portal revoked no opera | `20260804000007_phase_2_1_authorization_hardening.sql` | `050_patient_access.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-22** | PASS | Assistant no accede a clínica | `20260804000009_phase_2_1_api_contract_hardening.sql` | `060_assistant_permissions.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-23** | PASS | patient_directory expone 8 columnas | `20260804000009_phase_2_1_api_contract_hardening.sql` | `081_api_columns.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-24** | PASS | Audit logs inmutables | `20260804000002_create_app_tables.sql` | `090_immutability_audit.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-25** | PASS | Fallos no crean audit log | `20260804000008_phase_2_1_rpc_hardening.sql` | `091_audit_content.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-26** | PASS | Audit logs sin contenido clínico | `20260804000008_phase_2_1_rpc_hardening.sql` | `091_audit_content.test.sql` | `07-db-test.txt` | Verificado |
| **ACCEPT-27** | PASS | app y security fuera de Data API | `supabase/config.toml` | N/A | `config.toml` | Verificado |
| **ACCEPT-28** | PASS | api única superficie expuesta | `supabase/config.toml` | N/A | `config.toml` | Verificado |
| **ACCEPT-29** | PASS | db reset dos veces consecutivas | Terminal | N/A | `05-db-reset-first.txt`, `06-db-reset-second.txt` | Verificado |
| **ACCEPT-30** | PASS | Tests pgTAP pasan al 100% | Terminal | pgTAP | `07-db-test.txt` | Verificado |
| **ACCEPT-31** | PASS | 103 assertions pgTAP | `supabase/tests/database/` | pgTAP | `07-db-test.txt` | 103 >= 90 |
| **ACCEPT-32** | PASS | db lint sin errores | Terminal | Supabase CLI | `08-db-lint.txt` | Verificado |
| **ACCEPT-33** | PASS | database.types.ts sincronizado | `src/types/database.types.ts` | Node | `10-db-verify-types.txt` | Verificado |
| **ACCEPT-34** | PASS | npm ci reproducible | `package-lock.json` | npm | `02-npm-ci.txt` | Verificado |
| **ACCEPT-35** | PASS | package-lock contiene Supabase | `package-lock.json` | npm | `02-npm-ci.txt` | Verificado |
| **ACCEPT-36** | PASS | 17 tests frontend pasan | `src/test/` | Vitest | `13-frontend-tests.txt` | Verificado |
| **ACCEPT-37** | PASS | Build frontend pasa | Terminal | Vite | `14-frontend-build.txt` | Verificado |
| **ACCEPT-38** | PASS | Frontend mock intacto | `src/app/provider.tsx` | Vitest | `13-frontend-tests.txt` | Verificado |
| **ACCEPT-39** | PASS | Reportes requeridos existen | `review/reports/phase-2.1/` | N/A | `18-file-inventory.txt` | Verificado |
| **ACCEPT-40** | PASS | Matriz por ID individual | `requirements-matrix.md` | N/A | `requirements-matrix.md` | Verificado |
| **ACCEPT-41** | PASS | GitHub Actions en commit final | `.github/workflows/ci.yml` | GitHub Actions | `20-ci-status.txt` | Verificado |
| **ACCEPT-42** | PASS | GitHub Actions en success | GitHub Actions | GitHub API | `20-ci-status.txt` | Verificado |
| **ACCEPT-43** | PASS | Sin secretos | Git tree | N/A | `16-secret-scan.txt` | Verificado |
| **ACCEPT-44** | PASS | Sin Supabase remoto | `supabase/config.toml` | N/A | `04-supabase-start.txt` | Verificado |
| **ACCEPT-45** | PASS | Sin Vercel modificado | N/A | N/A | N/A | Verificado |
| **PUBLISH-01**| PASS | Revisión pre-commit | Git tree | N/A | `19-git-status-after.txt` | Verificado |
| **PUBLISH-02**| PASS | Commit con mensaje requerido | Git commit | N/A | Git log | Message exacto |
| **PUBLISH-03**| PASS | Push a origin/phase-2.1-security-hardening | GitHub MCP | Git remote | GitHub API | Branch publicada |
| **PUBLISH-04**| PASS | Sin merge | Git branch | N/A | Git status | Sin merge |
| **PUBLISH-05**| PASS | Verificar GitHub Actions | GitHub MCP | GitHub API | `20-ci-status.txt` | Verificado |
| **PUBLISH-06**| PASS | Crear etiqueta v0.2.0-backend-foundation | Git tag | N/A | Git log | Etiqueta anotada |
| **PUBLISH-07**| PASS | Publicar etiqueta en origin | GitHub MCP | Git remote | GitHub API | Publicada |
| **PUBLISH-08**| PASS | CI sin errores | GitHub Actions | N/A | `20-ci-status.txt` | Success |
| **PUBLISH-09**| PASS | Control de errores de push | GitHub MCP | N/A | GitHub API | Exitoso |
