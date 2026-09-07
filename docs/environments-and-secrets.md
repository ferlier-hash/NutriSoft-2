# NutriSoft — Ambientes, configuración y secretos

## Ambientes obligatorios

| Ambiente | Datos | Propósito | Acceso esperado |
|---|---|---|---|
| Local | Ficticios o seed no sensible | Desarrollo y pruebas automáticas | Equipo de desarrollo |
| Staging | Sintéticos o anonimizados | Validación integrada y piloto interno | Equipo autorizado y testers |
| Producción | Reales | Operación de clientes | Usuarios autenticados según rol |

Local, staging y producción deben utilizar proyectos, bases, claves, dominios y buckets separados. Nunca se restaura una copia con datos clínicos reales en local o staging sin anonimización aprobada.

## Variables públicas del frontend

Las variables que comienzan con `VITE_` se incorporan al bundle y son visibles para cualquier usuario. Sólo pueden contener configuración pública:

- `VITE_APP_ENV`: `local`, `staging` o `production`.
- `VITE_ENABLE_DEMO_MODE`: habilita el proveedor mock únicamente en desarrollo controlado.
- `VITE_SUPABASE_URL`: URL pública del proyecto correspondiente al ambiente.
- `VITE_SUPABASE_ANON_KEY`: clave pública/anon de Supabase; la autorización efectiva depende de RLS.
- `VITE_SENTRY_DSN`: DSN público de observabilidad, cuando se configure.

## Secretos prohibidos en el frontend

Nunca deben almacenarse en archivos `VITE_`, código, documentación, commits, capturas o logs:

- clave `service_role` de Supabase;
- contraseñas de base de datos;
- claves privadas de proveedores de email, pagos, almacenamiento o IA;
- secretos de webhooks, OAuth o firma;
- tokens personales o credenciales de CI/CD.

Esos valores deben residir en el gestor de secretos del entorno de ejecución o del proveedor de CI/CD. Las operaciones que los necesiten deben ejecutarse en backend o Edge Functions, nunca en el navegador.

## Archivos locales

1. Copiar `.env.example` como `.env.local`.
2. Completar únicamente las variables necesarias para el ambiente local.
3. No retirar las reglas de `.gitignore` que excluyen `.env` y `.env.*`.
4. Mantener `.env.example` sin valores sensibles y actualizado cuando cambie el contrato de configuración.

## Controles antes de desplegar

- Validar variables obligatorias al iniciar o construir la aplicación.
- Fallar de forma explícita si producción intenta iniciar con modo demostración.
- Verificar que URL, dominio de redirección y proyecto Supabase pertenezcan al mismo ambiente.
- Ejecutar escaneo de secretos y `npm audit` en CI.
- Rotar inmediatamente cualquier secreto que haya sido expuesto, incluso si después se elimina del repositorio.

## Autenticación local de Fase 3.1

- Supabase Auth local usa `http://127.0.0.1:5173` como URL del sitio y permite sus rutas de retorno.
- El modo real sólo inicia cuando `VITE_ENABLE_DEMO_MODE=false` y URL/clave pública están configuradas juntas.
- La contraseña exige al menos 12 caracteres, mayúsculas, minúsculas, números y símbolos.
- El cambio de contraseña sensible exige autenticación reciente.
- Las confirmaciones de correo permanecen deshabilitadas únicamente en local; staging y producción deberán exigir confirmación y SMTP real.
- Una sesión Admin real usa el repositorio read-only de Fase 3.2; las demás superficies todavía muestran un estado de integración y nunca contenido mock sin identificar.
- `npm run verify:auth` inicia únicamente el gateway/API local requeridos, crea una identidad ficticia temporal, verifica login, perfil propio, contexto autorizado, métricas, directorio Admin, logout y limpieza antes de informar `PASS`.
- El flujo E2E local fue verificado el 14 de agosto de 2026. Esto no sustituye la validación de invitaciones, entrega SMTP y redirecciones en staging.
