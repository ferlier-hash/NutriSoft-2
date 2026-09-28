# Nutrify — Observabilidad, trazabilidad y alertas técnicas

## Estado

Contrato e instrumentación frontend implementados el 18 de septiembre de 2026. Existe el proyecto Sentry `nutrisoft-staging`, con recepción sintética verificada y alerta por email para incidentes de prioridad alta. El SDK permanece inactivo en local y cuando no existe `VITE_SENTRY_DSN`; el DSN todavía no está instalado en un despliegue de staging porque ese frontend y su dominio aún no existen.

## Alcance

La observabilidad técnica debe permitir detectar, agrupar y diagnosticar fallos sin convertirse en una nueva fuente de información clínica. Cubre:

- excepciones no controladas del frontend;
- errores de render de React con una recuperación visible;
- versión, ambiente y área técnica;
- rendimiento agregado con muestreo reducido;
- salud y logs técnicos de Supabase Database, Auth, Storage y Edge Functions;
- fallos de jobs programados, backups, scanner de archivos e integraciones externas.

No sustituye la auditoría funcional de Nutrify ni debe registrar decisiones, notas o contenidos clínicos.

## Datos prohibidos

Nunca enviar al proveedor de observabilidad:

- nombre, correo, teléfono, dirección o identificador de una persona;
- IDs de pacientes, organizaciones, citas, planes, check-ins o recursos;
- notas, respuestas, mediciones, diagnósticos, formularios o cuerpos de requests;
- tokens, cookies, cabeceras de autorización, claves o URLs firmadas;
- capturas, Session Replay, archivos adjuntos ni estado global de la aplicación;
- parámetros de consulta o fragmentos de URL.

La instrumentación elimina `user`, `request`, `extra` y breadcrumbs; limita contextos a navegador, dispositivo, sistema, runtime y React; redacta correos, UUID y tokens. `sendDefaultPii` permanece deshabilitado y no se propagan cabeceras de trazas a Supabase ni a terceros.

## Proveedor y separación

- **Frontend:** Sentry, con un proyecto separado para Nutrify y ambientes `staging`/`production` diferenciados.
- **Backend administrado:** Logs, métricas y advisors nativos de Supabase.
- **Código y releases:** revisión Git y artefacto inmutable como fuente de versión.

Staging recibe primero toda regla nueva. Producción no comparte DSN con otros productos. El token privado para source maps pertenece al CI y nunca usa una variable `VITE_`.

La organización Sentry vigente almacena telemetría en Estados Unidos. Como control compensatorio, no se envía información clínica ni identidad, se impide almacenar IP, se exige scrubbing en servidor y se restringen los orígenes aceptados. La adecuación contractual y jurisdiccional deberá revisarse antes de producción aunque los eventos sean exclusivamente técnicos.

## Trazabilidad permitida

Cada evento puede contener únicamente:

- ambiente;
- revisión/release;
- tipo y stack técnico del error;
- nombre de ruta redactado;
- área técnica allowlisted;
- versión de navegador, sistema y runtime;
- identificador aleatorio propio del evento generado por el proveedor.

No se asocia el evento a una identidad real. Para soporte, el usuario puede comunicar el identificador técnico mostrado por el proveedor sólo cuando la UI lo incorpore expresamente; nunca se pide una historia clínica o captura para localizar el error.

## Muestreo inicial

- Errores no controlados: 100 % mientras no excedan las cuotas contratadas.
- Trazas de rendimiento: 5 % en staging y 2 % en producción.
- Session Replay y profiling: deshabilitados.
- Errores controlados y validaciones de usuario: no se reportan como excepciones.

Los porcentajes se revisan tras el piloto según volumen, utilidad y costo, sin elevar la recolección de datos.

## Alertas mínimas

| Severidad | Condición inicial | Respuesta objetivo |
|---|---|---|
| Crítica | indisponibilidad, cruce de tenant, exposición de credencial, corrupción o fallos repetidos de Auth | inmediata; contener la superficie afectada |
| Alta | nueva excepción no controlada en producción o job/backups/scanner fallando dos ejecuciones consecutivas | revisar dentro de 1 hora |
| Media | tasa de errores superior al 2 % durante 15 minutos o degradación p95 superior a 2,5 s durante 30 minutos | revisar el mismo día |
| Baja | error aislado en staging, cuota o advertencia de capacidad | revisión semanal |

Las alertas se agrupan para evitar fatiga. Staging no despierta guardia salvo que revele un riesgo de privacidad o integridad. Los destinatarios concretos y el canal privado se asignarán antes del piloto.

## Source maps

Los builds de staging y producción deberán generar source maps sólo para cargarlos de forma privada al proveedor. El token de carga vive en el gestor de secretos del CI; los `.map` se eliminan del artefacto público después de cargarse. Esta parte queda pendiente hasta seleccionar hosting y CI/CD.

## Criterio de aceptación operativo

1. Proyecto separado `nutrisoft-staging`: **completado**.
2. Privacidad mejorada, scrubbing obligatorio y predeterminado, bloqueo de IP, incidentes compartidos deshabilitados, scraping de JavaScript deshabilitado y TLS verificado: **completado**.
3. Evento sintético recibido, agrupado y etiquetado como staging: **completado**.
4. Alerta por email para incidentes de prioridad alta: **configurada; falta confirmar recepción efectiva con el despliegue de staging**.
5. DSN en hosting y dominio real agregado a orígenes permitidos: **pendiente del hosting de staging**.
6. 2FA obligatoria: **activa para el propietario mediante TOTP y exigida a todos los miembros de la organización**. Los códigos de recuperación quedan bajo custodia exclusiva del propietario y no deben almacenarse en el repositorio.
7. Logs de Supabase revisados sin cuerpos ni secretos: **pendiente de desplegar el backend de staging**.
8. Retención, responsables y canal documentados: **pendiente antes del piloto**.
9. Source maps privados verificados: **pendiente del CI/CD**.

Hasta completar los pendientes, Nutrify tiene observabilidad central preparada y verificada de forma sintética, pero todavía no conectada a un despliegue real de staging.
