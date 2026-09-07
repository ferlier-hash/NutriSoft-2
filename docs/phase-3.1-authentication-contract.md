# NutriSoft — Contrato funcional y de seguridad de autenticación (Fase 3.1)

**Estado:** aprobado para implementación local el 14 de agosto de 2026.

## Flujo aprobado

1. Un usuario autorizado recibe una invitación por correo.
2. El enlace permite configurar una contraseña dentro de su vigencia.
3. El acceso habitual utiliza correo electrónico y contraseña.
4. La recuperación de contraseña se inicia por correo con respuesta neutral.
5. El rol y el alcance se calculan en backend a partir de `auth.uid()`; nunca se aceptan desde parámetros elegidos por el cliente.

## Usuarios y destino autorizado

| Contexto efectivo | Destino | Regla |
|---|---|---|
| `platform_admin` | `/admin` | Sólo operación comercial y métricas agregadas; sin datos clínicos. |
| `organization_owner` | Portal operativo del consultorio/profesional | Sólo organizaciones de las que es miembro activo. |
| `nutritionist` | `/professional` | Sólo pacientes asignados y contenido propio. |
| `assistant` | Portal administrativo reducido | Sin información clínica; pantalla específica pendiente. |
| Paciente con acceso activo | `/patient` | Sólo su propio perfil y contenido autorizado. |

Un usuario sin rol o acceso vigente no recibe acceso implícito a ningún portal.

## Contexto de acceso

La RPC `api.get_current_access_context()` devuelve exclusivamente:

- identificador del usuario autenticado;
- rol de plataforma propio, si existe;
- membresías propias con rol, estado de membresía y estado del consultorio;
- accesos de paciente propios con identificadores y estados mínimos.

No devuelve pacientes de terceros, datos clínicos, notas, check-ins, alertas ni recomendaciones.

## Estados límite obligatorios

- Sesión inicial cargando: conservar estructura y no mostrar contenido privado.
- Sin sesión: redirigir a acceso sin filtrar la existencia de cuentas.
- Credenciales inválidas: mensaje neutral y recuperable.
- Cuenta sin perfil: bloquear portales y mostrar contacto con soporte.
- Sin rol/asignación: estado “Acceso pendiente”.
- Organización suspendida: estado “Cuenta suspendida”; no cargar datos operativos.
- Invitación vencida, revocada o ya utilizada: mensaje neutral con opción de solicitar una nueva.
- Recuperación solicitada para un correo inexistente: misma confirmación que para uno existente.
- Varias membresías activas: requerir selección explícita del consultorio; no elegir silenciosamente cuando cambie el alcance clínico.
- Ruta de otro rol: redirigir al destino autorizado sin revelar datos.
- Error de red: permitir reintentar; nunca degradar a permisos más amplios.
- Cierre de sesión: limpiar caché y estado sensible antes de volver a acceso.

## Criterios de aceptación

1. El modo demostración continúa funcionando sin Supabase y mantiene su banner visible.
2. El modo real exige URL y clave pública de Supabase configuradas juntas.
3. Ninguna ruta protegida renderiza contenido mientras la sesión o el contexto estén cargando.
4. La autorización visual coincide con RLS, pero RLS sigue siendo la barrera efectiva.
5. Platform Admin no puede obtener contexto clínico ni usar rutas de pacientes.
6. Un miembro o paciente de una organización suspendida queda bloqueado.
7. Un usuario sólo recibe sus propias membresías y accesos.
8. El login normaliza email y evita doble envío.
9. Recuperación e invitaciones no permiten enumerar cuentas.
10. Las pruebas incluyen usuario sin sesión, cada rol, suspensión, ausencia de rol y rutas incorrectas.

## Fuera de este primer corte

- MFA/passkeys.
- Inicio de sesión social.
- Selección visual para múltiples consultorios.
- Envío real de invitaciones y recuperación mediante proveedor SMTP de producción.
- Políticas finales de duración de sesión y reautenticación sensible.
