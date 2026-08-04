# NutriSoft — Plataforma SaaS para Nutricionistas en Latinoamérica

NutriSoft es una plataforma web SaaS multi-tenant diseñada para gestionar la operativa diaria del consultorio nutricional y optimizar la atención con una **Bandeja de Atención Prioritaria**.

---

## 🚀 Requisitos del Sistema
- **Node.js:** `>=24 <25` (fijado en `.nvmrc`)
- **npm:** `>=11.0.0`

---

## 🛠️ Instalación y Ejecución

```bash
# Instalación limpia reproducible
npm ci

# Servidor de desarrollo
npm run dev

# Suite de pruebas con Vitest jsdom
npm run test

# Verificación de tipos TypeScript estricto
npm run typecheck

# Linter de código (ESLint)
npm run lint

# Construcción de producción
npm run build
```

---

## 🗺️ Estructura de Rutas y Layouts

La aplicación utiliza `React Router` (`createHashRouter`) con layouts diferenciados por experiencia:

- **Portal Platform Admin (`/admin` - AdminLayout):**
  - `/admin`: Dashboard ejecutivo de métricas agregadas desidentificadas.
  - `/admin/organizations`: Gestión de organizaciones de la plataforma con flujo de altas y suspensiones.
  - `/admin/organizations/:organizationId`: Detalle operativo de la organización.
  - `/admin/nutritionists`: Directorio de nutricionistas registrados.
  - `/admin/nutritionists/:nutritionistId`: Perfil operativo del nutricionista con pacientes asignados.
  - `/admin/nutritionists/:nutritionistId/patients/:patientId`: Vista operativa del paciente **con barreras de privacidad clínica**.
- **Portal Nutricionista (`/professional` - ProfessionalLayout):**
  - `/professional`: Dashboard con bandeja de atención del profesional actual y acciones rápidas.
  - `/professional/inbox`: Bandeja de atención prioritaria del profesional actual.
  - `/professional/patients`: Lista de pacientes asignados al profesional actual.
  - `/professional/patients/:patientId`: Ficha clínica completa del paciente.
- **Portal Paciente (`/patient` - PatientLayout):**
  - `/patient`: Dashboard móvil del paciente aislado por `currentDemoPatientId`.
  - `/patient/check-in/:assignmentId`: Formulario interactivo de check-in.
- **Catálogo del Sistema de Diseño (`/design-system`):**
  - Disponible exclusivamente en entorno de desarrollo (`import.meta.env.DEV === true`).

---

## 🛡️ Aislamiento y Límites de Privacidad (Fase 1.1.2)

1. **Aislamiento del Profesional:** El selector de desarrollo `DevRoleSwitcher` permite alternar el nutricionista simulado (`currentDemoNutritionistId`). El portal del profesional filtra aisladamente las alertas, asignaciones, recomendaciones y lista de pacientes permitiendo operar únicamente sobre los asignados al profesional actual.
2. **Aislamiento del Paciente:** El selector de desarrollo permite alternar el paciente simulado (`currentDemoPatientId`). El portal del paciente filtra aisladamente las asignaciones, respuestas, recomendaciones y saludos.
3. **Privacidad del Administrador:** El panel de administración prohíbe el acceso directo a una lista global de pacientes. La vista administrativa del paciente no renderiza información clínica ni respuestas de check-ins.

> ⚠️ **AVISO IMPORTANTE DE PRIVACIDAD EN EL PROTOTIPO:**  
> Las restricciones actuales de privacidad, aislamiento de portales y filtros de datos son **restricciones de la capa de presentación e interfaz del prototipo** para validar la experiencia de usuario y las reglas de negocio en la UI. No constituyen un sistema de seguridad de producción ni un control de acceso de backend (RBAC/RLS), los cuales serán implementados a nivel de base de datos en la Fase 2 con Supabase RLS.
