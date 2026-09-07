# Google Calendar — puesta en marcha local

## Estado

OAuth local y selección de calendario implementados y validados. La Agenda real crea, actualiza y elimina la proyección externa de citas confirmadas sin copiar datos clínicos a Google.

## Credenciales

1. En Google Cloud, el cliente OAuth debe ser de tipo **Aplicación web**.
2. Registrar como redirect URI local exacto: `http://localhost:54321/functions/v1/google-calendar-oauth`.
3. Mantener el Client Secret sólo en `supabase/functions/.env.local`, que está ignorado por Git. Nunca usar nombres `VITE_*`.
4. Crear también una clave aleatoria de 32 bytes codificada en Base64 para `GOOGLE_TOKEN_ENCRYPTION_KEY_BASE64`. No reutilizar contraseñas ni claves de Supabase.

## Alcance solicitado

- `calendar.calendarlist.readonly`: presentar al profesional sus calendarios para que elija uno.
- `calendar.events`: crear/actualizar eventos de NutriSoft y leer ocupación del calendario elegido.

NutriSoft no importará título, asistentes ni descripción de eventos externos; sólo su intervalo ocupado. Cada conexión pertenece a una combinación profesional–consultorio.

## Flujo seguro previsto

1. La profesional inicia OAuth desde Configuración con una sesión autenticada.
2. Una RPC crea un estado de un solo uso, asociado a su organización y con vencimiento máximo de 15 minutos.
3. La Edge Function valida y consume ese estado, intercambia el código OAuth y cifra el refresh token antes de persistirlo.
4. La profesional elige un único calendario. Al confirmar una cita, NutriSoft proyecta un evento genérico llamado “Consulta NutriSoft”; no incluye nombre del paciente, notas ni detalles clínicos.
5. Al editar, cancelar o reprogramar, primero se conserva el cambio en NutriSoft y luego se actualiza o quita el evento externo. Una falla de Google nunca revierte ni bloquea la cita local; se puede reintentar desde Agenda.
6. Al desconectar se revoca el token, se elimina el material cifrado y se conserva sólo la auditoría técnica sin datos clínicos.

## No listo para producción

Antes de producción hacen falta dominio HTTPS, redirect URI de producción, política de privacidad, términos, proyecto Supabase remoto separado, secretos gestionados por el proveedor y verificación OAuth de Google si aplica.
