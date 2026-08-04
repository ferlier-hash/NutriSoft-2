# Modelo de Datos — NutriSoft (Fase 2)

## 📊 Tablas y Relaciones Multi-Tenant

```mermaid
erDiagram
    organizations ||--o{ organization_members : tiene
    organizations ||--o{ patients : posee
    patients ||--o{ patient_assignments : asignado
    patients ||--o{ check_in_assignments : recibe
    check_in_assignments ||--o| check_in_responses : genera
    check_in_responses ||--o{ alerts : dispara
    patients ||--o{ patient_recommendations : recibe
```

### Invariantes Principales:
- `organization_id` está presente en todas las tablas clínicas para reforzar el aislamiento a nivel de base de datos con claves foráneas compuestas.
- Las respuestas `check_in_responses` y los registros `audit_logs` son **inmutables** (no permiten UPDATE ni DELETE).
