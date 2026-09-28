# Pruebas E2E clínicas

## Alcance implementado

La suite `e2e/clinical-actions.spec.ts` usa Playwright, Chrome instalado y Supabase local con datos sintéticos. Verifica acciones reales de navegador, API pública, RLS/RPC y persistencia para:

- crear un plan alimentario en borrador;
- responder un check-in del paciente autenticado;
- registrar Antropometría de una paciente asignada;
- crear una cita confirmada;
- registrar un cobro manual sin procesar dinero;
- denegar clínica a assistant, owner no clínico y Platform Admin;
- denegar Antropometría a otra nutricionista no asignada.

## Ejecución

```bash
npm run test:e2e:clinical
```

El comando reinicia la base local, por lo que debe usarse sólo contra el proyecto Supabase local de desarrollo. Para depurar visualmente sin reinicio automático:

```bash
npm run test:e2e:clinical:ui
```

La ejecución requiere Supabase local saludable y Google Chrome instalado. No usa datos clínicos reales, contraseñas persistidas ni `service_role` en el navegador. El helper Node usa la clave local sólo para emitir sesiones efímeras de identidades sintéticas.

## Evidencia y fallas

En una falla se guardan captura, video y trace en `test-results/`; el informe HTML queda en `playwright-report/`. Ambos directorios están excluidos de Git y pueden contener valores sintéticos visibles, por lo que tampoco deben publicarse como artefactos abiertos.

## Extensiones pendientes

- completar edición, asignación, publicación y retiro de planes;
- reprogramación/cancelación de citas y resolución de cobro;
- corrección y reembolso de pagos;
- edición y eliminación de Antropometría;
- alertas derivadas del check-in y revisión profesional;
- variantes móvil/tablet y ejecución en staging con secretos administrados por CI.

## Admin REAL remoto en staging

`e2e/admin-staging.spec.ts` cubre resumen, directorio, reporte y auditoría con una identidad `platform_admin` sintética; verifica también que una identidad sintética sin ese rol no ingrese al portal. Inspecciona los RPC para permitir únicamente campos agregados/de auditoría definidos y rechazar claves de identidad o contenido clínico. Las pruebas son de sólo lectura; no cambian planes, consultorios ni datos.

Se dispara manualmente mediante `.github/workflows/e2e-admin-staging.yml` después de desplegar las migraciones al proyecto Supabase `nutrisoft-staging`. El workflow compila el frontend REAL dentro del runner, servido sólo para Playwright, y conecta sus llamadas a la URL del proyecto validada. Requiere las variables y las dos cuentas sintéticas enumeradas en `environments-and-secrets.md`; no equivale a publicar la aplicación en hosting. Las capturas, trazas y videos están deshabilitados para no persistir sesiones de staging.
