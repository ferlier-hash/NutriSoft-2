# NutriSoft — Plataforma Clínica para Nutricionistas

## 📌 Estado del Proyecto

- **Fase 1 (Cierre del Prototipo Visual):** CERRADA y estabilizada (Etiqueta `v0.1.0-prototype`).
- **Fase 2.1 (Backend Foundation Seguro y Multi-Tenant):** COMPLETA y verificada en local con Supabase (Esquemas `app`, `security`, `api`, 12 tablas, RLS estricto, 20 suites pgTAP con 103 assertions en verde, pipeline CI).
- **Frontend App:** Mantiene el modo mock funcional intacto con `MockProvider` (17 tests Vitest pasando). Sin formularios de auth visual ni conexión directa a Supabase en esta fase.
- **Próxima Fase:** Autenticación e integración segura.

---

## 🛠️ Ejecución Local

```bash
# Servidor de desarrollo frontend (Vite)
npm run dev

# Verificación completa (Frontend + Database pgTAP + TypeScript)
npm run verify:all
```
