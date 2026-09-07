# NutriSoft — Plataforma Clínica para Nutricionistas

## 📌 Estado del Proyecto

- **Fase 1 (Cierre del Prototipo Visual):** CERRADA y estabilizada (Etiqueta `v0.1.0-prototype`).
- **Backend seguro y multi-tenant:** verificado en local con Supabase (Esquemas `app`, `security`, `api`, 12 tablas, RLS estricto y 23 suites pgTAP con 139 assertions en verde). El cierre remoto requiere publicar los cambios pendientes y obtener CI verde.
- **Fase 2.2 (Cierre Funcional Mock):** completada y verificada con alertas, recomendaciones trazables y publicación controlada de recursos/recetas.
- **Frontend App:** Mantiene el modo mock funcional intacto con `MockProvider` (51 tests Vitest pasando). React Router 7.18 y auditoría npm sin vulnerabilidades conocidas al 14 de agosto de 2026.
- **Fase 3.1 (Autenticación):** corte local implementado y verificado end-to-end: cliente Supabase bajo demanda, login, cierre de sesión, recuperación, nueva contraseña, guards y contexto de acceso calculado en backend. Invitaciones/SMTP y staging siguen pendientes.
- **Fase 3.2 (Datos reales):** resumen y directorio de consultorios implementados para Platform Admin en modo sólo lectura, con búsqueda y filtro sobre datos autorizados. Profesional, Paciente y escrituras reales continúan bloqueados hasta conectar sus contratos.

---

## 🛠️ Ejecución Local

```bash
# Servidor de desarrollo frontend (Vite)
npm run dev

# Verificación completa (Frontend + Database pgTAP + TypeScript + Auth E2E local)
npm run verify:all
```
