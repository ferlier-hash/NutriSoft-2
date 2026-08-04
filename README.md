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
  - `/admin`: Dashboard de métricas agregadas desidentificadas.
  - `/admin/organizations`: Gestión de organizaciones de la plataforma.
  - `/admin/nutritionists`: Directorio de nutricionistas registrados.
  - `/admin/nutritionists/:nutritionistId`: Perfil operativo del nutricionista con pacientes asignados.
  - `/admin/nutritionists/:nutritionistId/patients/:patientId`: Vista operativa del paciente **con barreras de privacidad clínica estrictas**.
- **Portal Nutricionista (`/professional` - ProfessionalLayout):**
  - `/professional`: Dashboard con bandeja reducida y acciones rápidas.
  - `/professional/inbox`: Bandeja de atención prioritaria (diferencial del producto).
  - `/professional/patients`: Lista de pacientes del consultorio.
  - `/professional/patients/:patientId`: Ficha clínica completa del paciente.
- **Portal Paciente (`/patient` - PatientLayout):**
  - `/patient`: Dashboard móvil del paciente aislado por `currentDemoPatientId`.
  - `/patient/check-in/:assignmentId`: Formulario interactivo de check-in.
- **Catálogo del Sistema de Diseño (`/design-system`):**
  - Disponible exclusivamente en entorno de desarrollo (`import.meta.env.DEV === true`).

---

## 🛡️ Aislamiento y Límites de Privacidad en la Fase 1.1

1. **Privacidad del Administrador:** El panel de administración prohíbe el acceso directo a una lista global de pacientes. El acceso administrativo a un paciente solo es posible desde la jerarquía `Admin -> Nutricionistas -> [Nutricionista] -> Pacientes asignados -> [Paciente Operativo]`. La vista no renderiza respuestas de check-ins, energía, adherencia, solicitudes de ayuda, contenido de recomendaciones o historial clínico.
2. **Aislamiento por Paciente Simulada:** El selector de desarrollo `DevRoleSwitcher` permite alternar el paciente simulado (`currentDemoPatientId`). El portal del paciente filtra aisladamente las asignaciones, respuestas, recomendaciones y saludos.
