# Design System: NutriSoft

Este documento establece la especificación completa del Sistema de Diseño para **NutriSoft**, una plataforma SaaS de nutrición en Latinoamérica orientada a la simplicidad, sofisticación y alta productividad.

---

## 1. Principios Visuales

- **Estética:** SaaS profesional, tecnológico, humano y minimalista.
- **Inspiración:** Linear, Notion, Stripe y Apple Health.
- **Identidad de Marca:** Basada en tonos aqua suaves, cianes brumosos y acentos amarillo manteca. Se prohíbe explícitamente el verde oscuro médico anticuado, frutas, balanzas y recursos clisé de dietética.
- **Uso del Color:** Comunicar estado, nivel de atención y jerarquía de acciones.
- **Desktop vs Mobile:**
  - **Desktop-First:** Paneles de Administrador (`/admin`) y Nutricionista (`/professional`).
  - **Mobile-First:** Portal del Paciente (`/patient`).

---

## 2. Paleta de Colores y Tokens CSS (`globals.css`)

```css
:root {
  /* Fondos y Superficies */
  --bg-app: #F7F9FA;
  --surface: #FFFFFF;
  --surface-subtle: #F2F7F8;
  --surface-tinted: #EDF8F7;

  /* Textos y Jerarquía */
  --text-primary: #151B22;
  --text-secondary: #66727D;
  --text-tertiary: #8A959D;

  /* Bordes */
  --border-subtle: #E2E9EC;
  --border-hover: #CCD9DE;

  /* Marca Principal */
  --brand-primary: #55AEB8;
  --brand-strong: #357984;
  --brand-soft: #DDF3F2;

  /* Acentos y Paleta Secundaria */
  --aqua-soft: #BDE9EA;
  --aqua-light: #DDF6F5;
  --sky-soft: #CFE8F5;
  --sky-light: #EAF5FA;
  --mint-soft: #D8F0E8;
  --butter-soft: #F5E8A9;
  --butter-light: #FBF6DC;

  /* Estados Semánticos (Icono + Texto Obligatorio) */
  --semantic-info: #5267C7;
  --semantic-info-bg: #EAEFFC;
  --semantic-warning: #C98A27;
  --semantic-warning-bg: #FDF6E2;
  --semantic-critical: #C95F59;
  --semantic-critical-bg: #FCEBEA;
  --semantic-success: #39835A;
  --semantic-success-bg: #E8F5EE;

  /* Gradientes Sofisticados (Texto Oscuro #151B22) */
  --grad-primary-button: linear-gradient(90deg, #AEE5E8 0%, #CDEAF5 52%, #F5E6A4 100%);
  --grad-card-highlight: linear-gradient(135deg, #E9F8F7 0%, #EEF7FB 58%, #FCF9E8 100%);
  --grad-patient-cta: linear-gradient(90deg, #B9EAEC 0%, #D5EDF6 50%, #F4E5A1 100%);
  --grad-nav-active: linear-gradient(90deg, #D9F3F2 0%, #E3F1F8 100%);
  --grad-icon: linear-gradient(135deg, #8EDADD 0%, #A9DFF3 55%, #EDE196 100%);
}
```

---

## 3. Tipografía y Accesibilidad (WCAG 2.1 AA)

- **Fuente:** `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Escala Tipográfica:**
  - `H1`: 28px / 34px - font-bold
  - `H2`: 22px / 28px - font-semibold
  - `H3`: 18px / 24px - font-semibold
  - `Body`: 14px / 20px - font-normal
  - `Small`: 12px / 16px - font-medium
- **Reglas de Accesibilidad:**
  - **Inputs Radio Reales:** Escalas de 1 a 5 implementadas con `<fieldset>`, `<legend>` e `<input type="radio">`.
  - **Foco Visible:** `ring-[var(--brand-strong)] ring-2 ring-offset-2`.
  - **Tamaño Táctil Mínimo:** Todos los botones y selectores móviles miden al menos `44px x 44px`.
  - **No solo color:** Las alertas combinan siempre badge de color, icono descriptivo y texto explícito ("🚨 Alta", "⚠️ Media", "🟢 Normal").
