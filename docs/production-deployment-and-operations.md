# Nutrify — Despliegue, recuperación y operación

## Estado y alcance

Este documento define el procedimiento obligatorio para llevar Nutrify desde el entorno local a staging y producción. Existe un proyecto Supabase exclusivo de staging, `nutrisoft-staging`, aprovisionado en São Paulo. El workflow de migraciones y el nuevo E2E remoto de Admin están preparados en GitHub Actions, pero el entorno no se considera validado hasta desplegar migraciones, configurar las cuentas de prueba y obtener una ejecución E2E satisfactoria. Producción, hosting, dominio, SMTP y observabilidad continúan pendientes.

La guía no contiene secretos ni valores productivos. Los comandos son referencias para la persona o automatización autorizada; nunca deben ejecutarse contra producción sin identificar previamente proyecto, ambiente, revisión y responsable.

## Ambientes

| Ambiente | Datos permitidos | Proyecto Supabase | Dominio | Modo demo |
|---|---|---|---|---|
| Local | Ficticios o seed | Local/Docker | `127.0.0.1` | Permitido y explícito |
| Staging | Sintéticos o anonimizados | Exclusivo de staging | Exclusivo de staging | Deshabilitado para pruebas REAL |
| Producción | Reales | Exclusivo de producción | HTTPS definitivo | Obligatoriamente deshabilitado |

Nunca copiar datos clínicos productivos a local o staging sin anonimización aprobada. Nunca compartir claves, buckets, URLs de retorno ni cuentas técnicas entre ambientes.

## Responsabilidades mínimas

- Responsable de release: autoriza versión, ventana y rollback.
- Responsable técnico: ejecuta o supervisa migraciones, frontend y Edge Functions.
- Responsable de seguridad: valida secretos, RLS, privacidad y accesos.
- Responsable funcional: realiza el smoke test con cuentas ficticias de cada rol.

Una misma persona puede cubrir varios roles durante el piloto, pero cada release debe registrar quién aprobó cada control.

## Requisitos previos

1. Elegir hosting del frontend, proyectos Supabase de staging/producción, dominio y proveedor SMTP.
2. Configurar un gestor de secretos; nunca usar archivos versionados para secretos.
3. Registrar URLs exactas de Auth y OAuth por ambiente.
4. Habilitar confirmación de correo, política de contraseñas y SMTP real fuera de local.
5. Configurar backups automáticos y confirmar su retención antes de admitir datos reales.
6. Configurar observabilidad sin capturar datos clínicos, tokens, cuerpos de formularios ni URLs firmadas.
7. Definir contacto de incidentes y ventana de mantenimiento.

Las variables públicas permitidas están definidas en [Ambientes, configuración y secretos](./environments-and-secrets.md). `service_role`, contraseña de base, secretos OAuth, SMTP y claves de cifrado pertenecen exclusivamente al backend o al gestor de secretos.

## Puerta de release

Antes de desplegar una revisión:

- El árbol de trabajo de release debe estar identificado y la revisión Git debe ser inmutable.
- `npm run verify:frontend` debe finalizar sin errores.
- `npm run verify:database` debe pasar sobre una base reconstruida y sin datos reales.
- `npm run verify:auth` debe pasar en el ambiente de validación correspondiente.
- El escaneo de secretos y dependencias no debe contener hallazgos críticos abiertos.
- Las migraciones deben revisarse por permisos, reversibilidad operativa, locks y duración estimada.
- Debe existir backup verificable previo si el ambiente ya contiene datos.
- El smoke test y el criterio de rollback deben estar escritos antes de empezar.

Si falla una puerta, el release se detiene. No se corrige manualmente producción para “hacerlo pasar”.

## Secuencia de despliegue

### 1. Staging

1. Crear o actualizar el proyecto remoto de staging.
2. Aplicar migraciones en orden y verificar que sólo `api` quede expuesto por Data API.
3. Desplegar Edge Functions con secretos de staging.
4. Construir el frontend con `VITE_APP_ENV=staging`, modo demo deshabilitado y claves públicas de staging.
5. Desplegar el artefacto inmutable.
6. Ejecutar smoke tests autenticados para Admin, Profesional y Paciente con datos sintéticos.
7. Verificar invitación, recuperación, buckets privados, URLs firmadas y OAuth cuando corresponda.

### 2. Producción

1. Registrar revisión, aprobadores, hora de inicio y backup previo.
2. Aplicar primero cambios de base compatibles con la versión frontend todavía publicada.
3. Desplegar Edge Functions compatibles.
4. Desplegar el frontend construido para producción y con demo deshabilitado.
5. Ejecutar el smoke test mínimo sin crear ni modificar información clínica real.
6. Observar errores, autenticación, latencia y salud de funciones durante la ventana definida.
7. Cerrar el release con resultado, incidencias y revisión efectivamente desplegada.

## Smoke test mínimo

- General: login, recuperación neutral, logout y bloqueo correcto de rutas por rol.
- Admin: sólo métricas agregadas y directorio permitido; ausencia de datos clínicos.
- Profesional: Inicio, Pacientes, ficha asignada, Bandeja, Agenda, Ingresos, Planes, Recetario, Recursos, Seguimiento, Perfil y Configuración.
- Paciente: Inicio, citas propias, seguimiento, peso, plan publicado, receta y recurso autorizados.
- Seguridad: paciente ajeno, profesional no asignado, owner no clínico y Platform Admin reciben denegación en superficies clínicas.
- Archivos: objetos privados sin URL pública; acceso sólo mediante autorización vigente.
- Integraciones: una falla de Google no bloquea ni revierte la cita guardada en Nutrify.

Las verificaciones destructivas o que creen comunicaciones reales deben realizarse con cuentas de prueba aprobadas y nunca con pacientes reales.

## Rollback

### Frontend

Republicar el artefacto inmutable anterior. No reconstruir una versión antigua con variables actuales sin verificar compatibilidad.

### Edge Functions

Restaurar la revisión anterior compatible y conservar logs técnicos sin secretos ni datos clínicos.

### Base de datos

Las migraciones aplicadas no se revierten automáticamente. Preferir una migración correctiva compatible. Restaurar un backup completo sólo ante pérdida o corrupción y mediante el procedimiento de recuperación, porque descarta escrituras posteriores al punto restaurado.

Ante una migración parcialmente aplicada, detener nuevas escrituras afectadas, conservar evidencia y evaluar desde el historial de migraciones. No editar tablas clínicas manualmente ni desactivar RLS como atajo.

## Backups y recuperación

- Mantener backups administrados y recuperación a un punto en el tiempo cuando el plan lo permita.
- Separar backups por ambiente y restringir su acceso.
- Cifrar en tránsito y reposo.
- Documentar retención, región, propietario y fecha de última restauración probada.
- Probar restauración periódicamente en un proyecto aislado, nunca sobre producción activa.
- Después de restaurar: rotar secretos si hubo exposición, validar migraciones, RLS, conteos agregados, Auth, Storage y Edge Functions antes de reabrir el servicio.

La [política de backups y recuperación ante incidentes](./backup-and-incident-recovery-policy.md) aprueba para el piloto un RPO de 1 hora, RTO de 4 horas, backups diarios por 30 días, copia mensual por 12 meses y restauración de prueba mensual. Estos objetivos todavía no están operativos: deben validarse contra el proveedor y plan elegidos mediante una restauración aislada antes de admitir datos reales.

## Gestión de incidentes

1. Clasificar alcance: disponibilidad, autenticación, privacidad, integridad o integración externa.
2. Contener el problema con el menor impacto posible; mantener RLS y privacidad activas.
3. Preservar logs y auditoría sin copiar contenido clínico a canales no autorizados.
4. Revocar o rotar credenciales comprometidas desde el proveedor correspondiente.
5. Recuperar desde una revisión conocida o backup verificado.
6. Validar con smoke tests y registrar causa, impacto, acciones y prevención.

Una sospecha de acceso clínico indebido tiene prioridad crítica y requiere suspender la superficie afectada hasta confirmar aislamiento.

## Operación periódica

- Diario durante piloto: errores de autenticación, Edge Functions, disponibilidad y cuota de Storage.
- Semanal: invitaciones fallidas, trabajos pendientes, archivos huérfanos y fallos de sincronización externa.
- Mensual: dependencias, accesos administrativos, rotación programada, restauración de prueba y revisión de costos/cuotas.
- Por release: pruebas, migraciones, smoke test, resultado y rollback disponible.

No habilitar cargas productivas hasta desplegar y verificar el procesador privado y la limpieza descritos a continuación.

## Pipeline seguro de archivos

Desplegar `file-security-worker` y `file-security-cleanup`. Configurar `FILE_SECURITY_SCANNER_URL` hacia un servicio privado en la misma región y `FILE_SECURITY_SCANNER_TOKEN` con un secreto dedicado y rotativo. El contrato del scanner es un `POST` con los bytes, `Content-Type`, `X-File-Kind` y `X-Upload-Id`; una respuesta limpia `200` contiene los bytes seguros y las cabeceras `X-Scanner-Name` y `X-Scanner-Version`. Para imágenes debe decodificar y recodificar. Para PDFs debe ejecutar ClamAV con firmas actualizadas y validación estructural. Un `422` rechaza el contenido; `X-Rejection-Code: malware` se reserva para un positivo real.

Configurar `FILE_CLEANUP_SECRET` por separado y programar con Supabase Cron un `POST` diario autenticado a `file-security-cleanup`. Monitorear respuestas no exitosas, disponibilidad y latencia del scanner, crecimiento de cuarentena y errores de cuota. Storage no forma parte del backup de base: los buckets privados finales necesitan su propio procedimiento de respaldo y restauración.

Antes de habilitar cargas, comprobar: escritura directa a buckets finales denegada; archivo limpio promovido; archivo EICAR rechazado y eliminado; imágenes/PDFs malformados rechazados; reservas cruzadas entre tenants denegadas; cuarentena vencida eliminada a las 24 horas; reemplazos sin referencias eliminados sólo después de 7 días; archivos referenciados conservados; Platform Admin sin capacidad de reservar, leer ni publicar.

## Automatización de check-ins

Desplegar `checkin-scheduler`, configurar `CHECKIN_SCHEDULER_SECRET` como secreto independiente y programar un `POST` autenticado una vez por día mediante Supabase Cron. No hace falta fijar una hora funcional para pacientes: el horario de Cron es sólo operativo. Mantener una única ejecución diaria estable y monitorear su respuesta agregada (`assigned`, `skipped_pending`, `skipped_configuration`) sin registrar preguntas ni respuestas clínicas.

Antes de activarlo en producción, comprobar diaria y semanal, pausa individual y global, reintento del mismo día, paciente con pendiente, biblioteca vacía, membresía suspendida y aislamiento de tenant. La automatización no debe habilitarse para ningún profesional por migración: cada uno la activa y configura explícitamente.

## Registro de release

Cada despliegue debe conservar, fuera del código y sin secretos:

- ambiente y revisión Git;
- fecha, responsable y aprobadores;
- migraciones y funciones desplegadas;
- resultado de verificaciones y smoke test;
- backup previo y criterio de recuperación;
- incidencias, rollback aplicado y estado final.

## Pendientes para activar esta guía

- Selección de proveedores y dominios.
- Completar configuración y validación del proyecto Supabase de staging; crear producción sólo después de aprobar staging.
- SMTP y remitente verificado.
- Implementación y prueba verificable de la política aprobada de backups, RPO y RTO.
- Activar y probar la instrumentación de observabilidad preparada; configurar canal privado y destinatarios de alertas.
- CI/CD con aprobaciones y artefactos inmutables.
- Completar la validación REAL de Admin en Supabase staging con el workflow manual de sólo lectura y registrar el SHA/resultados del run.
- Despliegue y validación del scanner privado, sus secretos y el Cron de limpieza.

Hasta completar esos puntos, Nutrify debe describirse como REAL local verificado, no como plataforma publicada en producción.
