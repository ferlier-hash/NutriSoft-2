# Nutrify — staging interno en VPS

## Alcance y estado

El contenedor publica únicamente el frontend REAL y escucha en `127.0.0.1:8080` del VPS. Supabase sigue siendo el proyecto administrado exclusivo de staging. Este despliegue no habilita acceso público, dominio, HTTPS ni producción. La autenticación y las funciones dependientes de Supabase se consideran validadas sólo después de aplicar las migraciones en staging y realizar las pruebas con identidades sintéticas.

## Antes de construir

1. Identificar y registrar un commit Git inmutable que haya pasado `verify:frontend` y `verify:database` en CI.
2. Confirmar que `STAGING_SUPABASE_PROJECT_REF` corresponde al proyecto staging. Su URL debe ser `https://<ref>.supabase.co`.
3. Crear fuera del repositorio un archivo de configuración legible sólo por el operador, por ejemplo `/opt/nutrify/staging/staging.env`, con `NUTRIFY_REVISION`, `STAGING_SUPABASE_PROJECT_REF`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y, opcionalmente, `VITE_SENTRY_DSN`. Son valores públicos incorporados al bundle; nunca incluir `service_role`, contraseñas ni tokens técnicos.
4. Verificar que el checkout del VPS esté exactamente en `NUTRIFY_REVISION` y limpio antes de construir.

## Construcción y arranque

Desde el checkout del repositorio en el VPS:

```sh
docker compose --env-file /opt/nutrify/staging/staging.env -f deploy/staging/compose.yml config --quiet
docker compose --env-file /opt/nutrify/staging/staging.env -f deploy/staging/compose.yml up -d --build
docker compose --env-file /opt/nutrify/staging/staging.env -f deploy/staging/compose.yml ps
curl --fail --silent --show-error http://127.0.0.1:8080/healthz
```

La imagen sólo se construye si la URL y la clave pública de Supabase staging están presentes y la URL coincide con el proyecto declarado. El modo DEMO queda deshabilitado en la imagen. El contenedor no recibe secretos de backend en tiempo de ejecución. Nginx omite el log de accesos para no conservar códigos de Auth presentes en URLs.

## Acceso interno

Una conexión SSH con clave puede crear el túnel `ssh -N -L 8080:127.0.0.1:8080 <usuario>@<VPS>`. La app queda disponible en `http://127.0.0.1:8080` del equipo local mientras el túnel esté activo. Antes de probar login y enlaces de Auth, agregar esa URL a las redirecciones permitidas del proyecto Supabase staging. No usar un acceso HTTP público por IP para sesiones autenticadas.

## Reversión

Conservar el commit y la imagen anteriores. Para volver atrás, hacer checkout del commit anterior, fijar `NUTRIFY_REVISION` a ese commit y ejecutar el mismo comando de `up -d --build` con su configuración compatible. Las migraciones de base no se revierten automáticamente; seguir la política de recuperación del proyecto.
