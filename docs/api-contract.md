# Contrato de la API — NutriSoft (Fase 2)

## 📡 Superficie Expuesta en el Esquema `api`

### Vistas Exclusivas (`security_invoker = true`):
- `api.current_profile`
- `api.current_organizations`
- `api.patient_directory`
- `api.patient_portal_home`
- `api.check_in_assignments`
- `api.attention_inbox`
- `api.patient_recommendations`
- `api.admin_organizations`

### Funciones RPC Transaccionales:
- `api.get_admin_metrics()`
- `api.create_organization(p_name, p_slug)`
- `api.set_organization_status(p_org_id, p_status)`
- `api.create_patient(p_org_id, p_first_name, p_last_name, ...)`
- `api.assign_check_in(p_org_id, p_patient_id, p_due_date)`
- `api.submit_check_in(p_assignment_id, p_energy, p_adherence, ...)`
- `api.acknowledge_alert(p_alert_id)`
- `api.resolve_alert(p_alert_id, p_notes)`
- `api.create_recommendation(p_org_id, p_patient_id, p_text, ...)`
