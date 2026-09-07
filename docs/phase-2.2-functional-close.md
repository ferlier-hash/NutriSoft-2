# NutriSoft — Acta de cierre funcional Fase 2.2

**Fecha:** 14 de agosto de 2026  
**Estado:** cierre local verificado  
**Entorno:** frontend en modo demostración con `MockProvider`; sin autenticación, persistencia, correo, storage ni IA reales.

## 1. Objetivo del cierre

Estabilizar los flujos centrales del portal Nutricionista y su efecto visible en el portal Paciente antes de conectar identidades y datos reales. Este corte convierte decisiones visuales anteriores en contratos funcionales comprobables, sin ampliar el alcance clínico ni debilitar el aislamiento multi-tenant.

## 2. Alcance completado

### 2.1 Bandeja de atención

- Ciclo explícito `sin resolver → reconocida → resuelta`.
- Reconocer conserva profesional y fecha, y mantiene la alerta dentro de los pendientes.
- Resolver conserva profesional y fecha y retira la alerta de los contadores activos.
- Se rechazan reconocimientos o resoluciones duplicadas.
- El profesional sólo puede actuar sobre alertas de pacientes propios y de su organización.

### 2.2 Recomendaciones trazables

- Una recomendación nueva se vincula automáticamente con la respuesta de check-in más reciente del paciente cuando existe.
- El perfil profesional muestra el check-in de origen.
- Si no existe una respuesta previa, la recomendación se identifica como general.
- Se preserva el alcance por organización, profesional y paciente.

### 2.3 Recursos profesionales

- Estados editoriales: borrador, publicado y retirado.
- Alta como borrador o publicación inmediata.
- Filtro por estado y señalización clara de visibilidad.
- Sólo el autor puede cambiar el estado.
- El paciente ve únicamente recursos publicados por su nutricionista asignado y dentro de la misma organización.
- Retirar o devolver a borrador elimina su visibilidad del portal Paciente dentro de la sesión.

### 2.4 Recetario profesional

- Estados editoriales: borrador, publicado y retirado.
- Alta como borrador o publicación inmediata.
- Duplicación segura como borrador propio.
- La copia conserva referencia de procedencia y nunca modifica el original.
- El paciente ve únicamente recetas publicadas por su nutricionista asignado y de la misma organización.

### 2.5 Portal Paciente

- Inicio mobile-first con recursos y recetas publicados.
- Estados vacíos explícitos cuando no existe contenido visible.
- Borradores, contenido retirado y contenido de otros profesionales u organizaciones permanecen ocultos.

## 3. Permisos e invariantes verificados

| Acción | Actor autorizado | Regla de alcance |
|---|---|---|
| Reconocer/resolver alerta | Nutricionista | Paciente asignado, misma organización y transición válida. |
| Emitir recomendación | Nutricionista | Paciente asignado; vínculo sólo con respuesta del mismo paciente y tenant. |
| Crear/publicar/retirar recurso | Nutricionista autor | Propiedad del profesional y misma organización. |
| Crear/publicar/retirar/duplicar receta | Nutricionista autor | La copia es borrador propio; el original permanece inmutable. |
| Leer contenido publicado | Paciente | Sólo contenido del nutricionista asignado, misma organización y estado publicado. |
| Acceder a contenido clínico | Platform Admin | Prohibido; se mantiene privacidad clínica por diseño. |

## 4. Evidencia de aceptación

- Suite de frontend: 8 archivos y 30 pruebas automatizadas en verde.
- TypeScript: sin errores.
- Alertas de transición de React Router: resueltas mediante flags compatibles con la versión vigente.
- Pruebas de aislamiento: pacientes de distintos profesionales y organizaciones no reciben contenido cruzado.
- Verificación visual: Recursos, Recetas y Bandeja en desktop; Inicio del Paciente en viewport móvil.
- Build de producción: exitoso; se conserva como P3 el aviso no bloqueante por bundle inicial mayor a 500 kB.
- Base local: reconstrucción completa exitosa, 20 archivos pgTAP y 119 pruebas en verde.
- Esquemas `api`, `app` y `security`: lint sin errores.
- Tipos TypeScript generados desde Supabase: sincronizados.

## 5. Fuera de alcance y diferido

- Autenticación real, sesiones y recuperación de acceso.
- Persistencia de estos flujos en Supabase mediante vistas/RPC autorizadas.
- Emails de invitación y notificaciones.
- Storage privado, antivirus, URLs firmadas y versiones de archivos.
- Agenda, reportes clínicos y sincronización con calendarios.
- IA para formatear recetas, resumir información o sugerir acciones.
- Analítica de lectura/uso del contenido.
- Política histórica ante reasignación de nutricionista.
- Reducción del bundle inicial; clasificada P3 y no bloqueante para Fase 3.

## 6. Criterio para comenzar Fase 3

La Fase 3 puede iniciar cuando este cierre permanezca en verde y se confirme el entorno objetivo de autenticación/integración. El orden seguro recomendado es:

1. Autenticación y resolución de rol/organización desde servidor.
2. Lecturas reales a través del esquema `api`, sin acceso directo a `app`.
3. Mutaciones por RPC transaccionales, auditables e idempotentes.
4. Migración vertical de un flujo por vez, comenzando por identidad y pacientes asignados.
5. Email y storage después de estabilizar permisos y datos.

## 7. Acción requerida del responsable de producto

No se requiere ninguna configuración externa para aprobar el cierre local 2.2. Antes de iniciar Fase 3 será necesario confirmar:

- cuál será el proyecto Supabase de desarrollo compartido;
- qué cuentas reales se usarán como usuarios piloto para cada rol;
- si las invitaciones iniciales se probarán con un proveedor de correo real o con una bandeja de pruebas;
- la política de contenido histórico cuando un paciente cambia de nutricionista.

Estas decisiones no deben bloquear el cierre 2.2; se toman al preparar el primer incremento de Fase 3.
