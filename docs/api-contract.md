# Contrato de la API — NutriSoft (Fase 2.1)

## 📡 Superficie Expuesta en el Esquema `api`

### Vistas Exclusivas (`security_invoker = true`):
- `api.current_profile`: Perfil del usuario autenticado.
- `api.current_organizations`: Organizaciones activas a las que pertenece el usuario.
- `api.patient_directory`: Directorio administrativo reducido (`id`, `organization_id`, `first_name`, `last_name`, `email`, `phone`, `status`, `created_at`). Excluye `birth_date`, `city` y datos clínicos.
- `api.patient_portal_home`: Ficha del portal del paciente autenticado.
- `api.check_in_assignments`: Asignaciones de check-in visibles según RLS.
- `api.attention_inbox`: Bandeja de alertas de atención para nutricionistas y owners.
- `api.patient_recommendations`: Recomendaciones emitidas.
- `api.admin_organizations`: Organizaciones visibles para platform_admin.

### Funciones RPC Transaccionales:
- `api.get_admin_metrics()`: Devuelve JSON desidentificado con conteos agregados.
- `api.create_organization(p_name, p_slug)`: Crea organización (solo platform_admin).
- `api.set_organization_status(p_org_id, p_status)`: Activa/suspende organización (solo platform_admin).
- `api.create_patient(p_org_id, p_first_name, p_last_name, ...)`: Crea paciente y asignación en transacción.
- `api.assign_check_in(p_org_id, p_patient_id, p_due_date)`: Asigna check-in a paciente.
- `api.submit_check_in(p_assignment_id, p_energy, p_adherence, ...)`: Envía respuesta de check-in y genera alertas con bloqueo `FOR UPDATE`.
- `api.acknowledge_alert(p_alert_id)`: Reconoce alerta (unresolved -> acknowledged) verificando conteo de filas.
- `api.resolve_alert(p_alert_id, p_notes)`: Resuelve alerta (unresolved/acknowledged -> resolved) verificando conteo de filas.
- `api.create_recommendation(p_org_id, p_patient_id, p_text, p_response_id)`: Emite recomendación validando pertenencia y respuesta vinculada.
