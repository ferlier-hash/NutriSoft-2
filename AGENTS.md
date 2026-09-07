# NutriSoft — Contexto obligatorio

Antes de modificar producto, interfaz, datos, permisos o arquitectura, leer completamente:

1. `docs/NUTRISOFT_MASTER_STYLE_AND_REQUIREMENTS.md` — fuente maestra de continuidad, estilo y requisitos.
2. `docs/security-model.md` — matriz de permisos y privacidad.
3. `docs/backend-architecture.md` y `docs/api-contract.md` — límites de acceso a datos.

Reglas permanentes:

- Preservar el aislamiento multi-tenant y la privacidad clínica del Platform Admin.
- No reemplazar comportamiento estable sin verificar los flujos existentes.
- Diferenciar en toda documentación y UI: implementado, simulado, planificado y futuro.
- Antes de ampliar una función, definir usuario, permisos, estados límite y criterio de aceptación.
- Mantener actualizado el documento maestro cuando una decisión de producto o diseño cambie.

