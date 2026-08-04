# Principios de Interfaz de Usuario (UI/UX): NutriSoft

Este documento define la dirección de UX/UI basada en la maqueta de referencia **Concepto A Minimalista Premium**.

---

## 1. Experiencia por Rol

### A. Platform Admin (`/admin`)
- **Enfoque:** Analítico, limpio, operativo.
- **Visualización:** Tablas con alto contraste, tarjetas de métricas agregadas desidentificadas y botones explícitos de acción (Habilitar / Suspender organización).
- **Aislamiento:** Cero exposición de datos de salud de los pacientes.

### B. Profesional / Nutricionista (`/professional`)
- **Enfoque:** Alta productividad, clínica sin frialdad, ordenada por prioridad de atención.
- **Bandeja de Atención (Diferencial):** Responde a 4 preguntas clave:
  1. ¿Qué paciente necesita atención?
  2. ¿Qué ocurrió?
  3. ¿Por qué importa?
  4. ¿Qué acción debería realizar el nutricionista?
- **Jerarquía:** 🚨 Alertas altas destacadas en rojo suave (`#FCEBEA`), ⚠️ Alertas medias en amarillo suave (`#FDF6E2`), 🟢 Normales en azul/verde suave.

### C. Paciente (`/patient`)
- **Enfoque:** Mobile-First, humano, comprensible, sin jerga médica técnica.
- **Acciones Clave:** Check-in pendiente y consulta de recomendaciones emitidas por su profesional.
- **Confirmación Neutral:** Cero diagnósticos ni recomendaciones automáticas generadas por el sistema al responder un check-in.
