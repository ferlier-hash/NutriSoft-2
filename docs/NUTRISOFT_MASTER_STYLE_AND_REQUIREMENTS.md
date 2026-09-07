# NutriSoft — Documento Maestro de Estilo, Producto y Continuidad

**Versión:** 1.20  
**Fecha de corte:** 21 de agosto de 2026  
**Estado del producto:** Fase 3.1 local verificada end-to-end y Fase 3.2 en progreso. Admin conserva su superficie real read-only. Planes alimentarios ya dispone de primer recorrido real local para Profesional y Paciente; Agenda ya cuenta con una primera pantalla real local y sincronización degradable hacia Google Calendar. Citas e Ingresos reales todavía están pendientes. Las demás rutas clínicas continúan bloqueadas en sesiones reales hasta contar con su propia integración; el modo demostración permanece completo y separado.  
**Propósito:** ser la fuente de verdad para continuar, migrar, rediseñar o auditar NutriSoft sin perder decisiones importantes.

> Este documento debe leerse antes de realizar cambios de producto, UI, datos, permisos o arquitectura. No sustituye los contratos técnicos específicos; los referencia y explica en contexto.

## 1. Cómo usar y mantener este documento

### 1.1 Jerarquía de autoridad

Si dos fuentes parecen contradecirse, resolver en este orden:

1. Seguridad, privacidad, RLS e invariantes de base de datos.
2. Contrato de API y modelo de datos vigente.
3. Código implementado y pruebas automatizadas.
4. Este documento maestro y decisiones funcionales aprobadas.
5. Backlog, prototipos, mocks y referencias competitivas.

### 1.2 Estados de una función

| Estado | Significado | Regla de comunicación |
|---|---|---|
| Implementado | Existe y funciona en el frontend o backend actual. | Puede describirse como disponible en el entorno correspondiente. |
| Simulado | Funciona con `MockProvider` y datos ficticios, sin persistencia o integración real. | Mostrar “Modo demostración — datos ficticios”. |
| Planificado | Alcance definido, todavía no implementado. | Mostrar “Próximamente” sólo cuando sea útil para anticipar navegación. |
| Futuro | Idea aprobada conceptualmente pero requiere discovery, arquitectura o validación. | No prometer fecha ni disponibilidad. |

### 1.3 Protocolo de actualización

- Toda decisión que cambie navegación, permisos, tokens, estados, datos o un flujo central debe actualizar este archivo.
- Registrar la decisión en la sección “Historial de decisiones”.
- No documentar como definitivo un precio, límite comercial o integración todavía ficticia.
- Conservar el motivo de las decisiones sensibles; no limitarse a describir la pantalla.
- Al migrar, comparar la implementación nueva contra los criterios de aceptación de este documento.

## 2. Visión del producto

NutriSoft es una plataforma SaaS clínica y operativa para nutricionistas, consultorios y pacientes en Latinoamérica. Debe reducir carga administrativa, ordenar el seguimiento y elevar la calidad percibida sin deshumanizar la atención ni automatizar decisiones clínicas de forma opaca.

### 2.1 Promesa central

- Para el consultorio: administración clara de profesionales, pacientes, planes, pagos, vencimientos y permisos.
- Para el nutricionista: una práctica ordenada por prioridad, con menos trabajo repetitivo y contexto clínico accesible.
- Para el paciente: una experiencia móvil simple, cercana y comprensible para responder, consultar y sentirse acompañado.
- Para NutriSoft: una operación comercial agregada que nunca expone información clínica identificable al Platform Admin.

### 2.2 Principios no negociables

1. Privacidad por diseño.
2. Aislamiento multi-tenant estricto.
3. El criterio profesional prevalece sobre cualquier automatización.
4. La interfaz explica estados y próximos pasos; no obliga a adivinar.
5. Los cambios importantes deben ser auditables y, cuando sea posible, reversibles.
6. Se prioriza claridad y estabilidad sobre acumulación de funciones.
7. El sistema nunca presenta una inferencia como diagnóstico.

### 2.3 Fuera de alcance del Platform Admin

El Platform Admin administra cuentas, consultorios, planes, pagos, vencimientos, estados y métricas agregadas. No accede a historia clínica, check-ins, alertas clínicas, recomendaciones, notas, fotos, mediciones ni contenido identificable del paciente.

## 3. Roles y permisos

### 3.1 Roles de negocio

| Rol | Responsabilidad | Acceso esperado |
|---|---|---|
| Platform Admin | Opera la plataforma y relación comercial B2B. | Consultorios, planes, pagos, estados, uso y métricas agregadas. Cero datos clínicos. |
| Responsable/Owner | Administra su consultorio. Puede haber más de uno. | Equipo, directorio, agenda y facturación propia. El rol no concede acceso clínico. |
| Nutricionista | Atiende pacientes asignados. | Clínica de pacientes asignados; directorio básico de no asignados dentro del tenant; recursos, recetas y plantillas propias. |
| Assistant | Apoya la operación administrativa. | Directorio básico reducido; sin contenido clínico. |
| Paciente | Usa su portal personal. | Su ficha, asignaciones, respuestas y recomendaciones propias. |

### 3.2 Reglas de aislamiento

- Todo dato clínico debe estar vinculado a `organization_id` y, cuando corresponda, a `patient_id` y profesional asignado.
- Un nutricionista no ve pacientes, recursos ni recetas de otro profesional, aunque pertenezcan al mismo consultorio, salvo que exista una función explícita de biblioteca compartida y permiso aprobado.
- Un responsable que también sea nutricionista obtiene acceso clínico sólo por su rol profesional y sus asignaciones; nunca por ser owner.
- Un paciente no ve información de otro paciente ni puede usar un identificador ajeno para abrir un check-in.
- El Assistant recibe un directorio reducido sin fecha de nacimiento, ciudad, objetivo nutricional ni información clínica.
- Una organización suspendida pierde acceso operacional clínico hasta su reactivación conforme a política.
- Las acciones administrativas y clínicas sensibles deben dejar auditoría sin contenido clínico innecesario.

## 4. Estado técnico y arquitectura

### 4.1 Fases

- Fase 1 — Prototipo visual: cerrada y estabilizada como `v0.1.0-prototype`.
- Fase 2.1 — Backend foundation seguro y multi-tenant: verificado localmente con Supabase.
- Fase 2.2 — Cierre funcional del prototipo: alertas con ciclo completo, recomendaciones trazables y publicación controlada de recursos/recetas, verificados en modo mock.
- Frontend actual: modo mock funcional mediante `MockProvider` y primera superficie Admin real de sólo lectura, claramente separada.
- Fase 3.0 — Hardening previo: iniciada el 14 de agosto de 2026; dependencias auditadas sin vulnerabilidades conocidas y contrato de ambientes/secretos configurado.
- Fase 3.1 — Autenticación: corte local implementado y verificado end-to-end con cliente Supabase bajo demanda, pantallas de acceso/recuperación, route guards y contexto seguro calculado desde `auth.uid()`.
- Fase 3.2 — Datos reales: resumen y directorio Admin de sólo lectura implementados y verificados; perfil propio, métricas agregadas, búsqueda y filtro por estado.
- Siguiente bloque recomendado: diseñar la persistencia comercial con las decisiones confirmadas y resolver moneda, impuestos, días 29–31, gracia y efecto de cambios de precio antes de habilitar cobros reales.

### 4.2 Stack vigente

- React 19, React DOM 19 y TypeScript 5.7.
- Vite 6 y Tailwind CSS 4.
- React Router DOM 7.18 con `createHashRouter`.
- Radix UI para Dialog, Switch y Toast; Lucide React para iconografía.
- React Hook Form + Zod para formularios.
- Vitest + Testing Library + jest-dom para frontend.
- Supabase/PostgreSQL con pgTAP para backend.
- Supabase JS 2.112 con PKCE para la integración de autenticación, cargado sólo cuando el modo real está activo.
- Node requerido: `>=24 <25`.

### 4.3 Esquemas de backend

- `app`: persistencia interna. Fuera del Data API; sin DML directo para `authenticated`.
- `security`: funciones auxiliares basadas en `auth.uid()`, con `SECURITY DEFINER` y `search_path` cerrado.
- `api`: única superficie pública, mediante vistas `security_invoker` y RPC transaccionales.

### 4.4 Invariantes críticas

- `check_in_responses` y `audit_logs` son inmutables: no se actualizan ni eliminan.
- Los identificadores históricos de actor y organización en `audit_logs` se conservan sin claves foráneas; esto mantiene la evidencia inmutable y permite la baja de la entidad original.
- Las recomendaciones deben referenciar una respuesta del mismo tenant y paciente.
- Las asignaciones sólo pueden apuntar a miembros activos con rol `nutritionist` u `owner`.
- No se puede degradar o desactivar un miembro con asignaciones clínicas activas.
- Toda escritura real debe pasar por RPC autorizada; el frontend no escribe directamente en tablas internas.
- Las transiciones de alertas y cobros deben ser idempotentes y verificables.

### 4.5 Comandos de verificación

```bash
npm run dev
npm run verify:frontend
npm run verify:database
npm run verify:auth
npm run verify:all
```

## 5. Arquitectura de navegación

### 5.1 Rutas actuales

| Portal | Ruta | Estado | Función |
|---|---|---|---|
| General | `/` | Implementado | En demo redirige a `/professional`; en modo real deriva el portal desde el contexto autorizado. |
| Acceso | `/login` | Implementado detrás de modo real | Login por correo y contraseña. |
| Acceso | `/forgot-password` | Implementado detrás de modo real | Solicitud neutral de recuperación. |
| Acceso | `/reset-password` | Implementado detrás de modo real | Configuración o cambio de contraseña mediante sesión válida. |
| Acceso | `/access-pending` | Implementado detrás de modo real | Cuenta sin rol o acceso vigente. |
| Acceso | `/account-suspended` | Implementado detrás de modo real | Bloqueo por organización suspendida. |
| Admin | `/admin` | Simulado en demo / real read-only | Demo comercial completo; en sesión real muestra perfil, métricas agregadas y directorio mínimo desde Supabase. |
| Admin | `/admin/organizations` | Simulado en demo / real read-only | Demo con gestión completa; sesión real con directorio, búsqueda y filtro por estado. |
| Admin | `/admin/organizations/:organizationId` | Simulado | Perfil del consultorio. |
| Admin | `/admin/nutritionists` | Simulado | Lista de nutricionistas. |
| Admin | `/admin/nutritionists/:nutritionistId` | Simulado | Perfil del nutricionista en tarjetas. |
| Admin | `/admin/nutritionists/:nutritionistId/patients/:patientId` | Simulado | Acceso contextual y limitado desde el profesional. |
| Profesional | `/professional` | Simulado en demo / real limitado | En sesión real abre la biblioteca de planes propia; las demás áreas continúan en preparación. |
| Profesional | `/professional/agenda` | Simulado en demo / primera integración real local | Alta, corrección, cancelación y reprogramación trazable de citas; Google Calendar refleja sólo eventos genéricos de las citas confirmadas. |
| Profesional | `/professional/appointments` | Simulado en demo / planificado en real | Historial de citas, filtros, estados y notas privadas del profesional. |
| Profesional | `/professional/income` | Demo y REAL local implementados | Cobros, reembolsos, correcciones trazables, filtros y métricas por moneda. |
| Profesional | `/professional/inbox` | Simulado | Bandeja de atención. |
| Profesional | `/professional/checkins` | Simulado | Último check-in por paciente, filtros, prioridad orientativa y acceso al historial. |
| Profesional | `/professional/settings` | Simulado en demo / OAuth Google local conectado | Configuración operativa de moneda, duración/precios sugeridos y estado seguro de conexión con Google Calendar. |
| Profesional | `/professional/patients` | Simulado en demo / primera invitación real local | La profesional invita un paciente por nombre, apellido y correo; el vínculo queda preparado de forma segura. |
| Profesional | `/professional/patients/:patientId` | Simulado | Perfil operativo del paciente. |
| Profesional | `/professional/profile` | Simulado | Perfil contextual del profesional. |
| Profesional | `/professional/meal-plans` | Simulado en demo / real local | Biblioteca, creación y duplicación de planes propios. |
| Profesional | `/professional/meal-plans/:planId` | Simulado en demo / real local | Editor multidía, asignación, publicación, retiro y revisión de comentarios. |
| Profesional | `/professional/recommendations` | Simulado | Biblioteca privada y asignación de frases motivacionales. |
| Profesional | `/professional/next-steps` | Simulado | Listas individuales de próximos pasos y seguimiento de checks/comentarios. |
| Profesional | `/professional/resources` | Simulado | Recursos propios. |
| Profesional | `/professional/recipes` | Simulado | Recetario propio. |
| Profesional | `/professional/recipes/:recipeId` | Simulado | Detalle autorizado de una receta propia publicada o en edición. |
| Paciente | `/patient` | Simulado en demo / real local | En sesión real muestra sólo los planes vigentes, su cumplimiento y comentarios. |
| Paciente | `/patient/request-appointment` | Simulado en demo / planificado en real | Solicitud autenticada de cita contra disponibilidad del profesional asignado; requiere confirmación profesional. |
| Paciente | `/patient/check-in/:assignmentId` | Simulado | Formulario de check-in aislado. |
| Paciente | `/patient/recipes/:recipeId` | Simulado | Detalle de una receta publicada y disponible para el paciente. |
| Paciente | `/patient/recipes` | Simulado | Recetario completo de recetas publicadas y autorizadas para el paciente. |
| Paciente | `/patient/resources` | Simulado | Biblioteca completa de recursos publicados disponibles para el paciente. |
| Desarrollo | `/design-system` | Implementado sólo DEV | Catálogo visual. Debe devolver 404 en producción. |

### 5.2 Navegación planificada

- Profesional desktop: Inicio, Mi perfil, Pacientes, Bandeja de atención, Agenda, Citas, Ingresos, Planes alimentarios, Recetario, Próximos pasos, Recursos, Check-ins, Recomendaciones, Reportes y Configuración.
- Reportes permanece planificado como módulo de informes por paciente/período, con secciones seleccionables, vista previa y exportación PDF.
- La personalización de marca está implementada en demo exclusivamente para Custom: nombre visible, logo opcional, diez presets de color, datos de contacto y cabecera opcional del portal Paciente. La marca pertenece al consultorio y se hereda de forma consistente en los portales Profesional y Paciente. La página pública por profesional–consultorio sigue futura.
- La selección de color ofrece una vista previa ilustrativa con diseño de plataforma, logo y cabeceras independientes, alternable entre Profesional y Paciente. Sólo «Guardar marca» aplica el borrador a los portales del consultorio; probar una paleta no modifica la identidad guardada. Los estados semánticos conservan sus colores. Disponible en demo Custom, no constituye una migración de marca a real. Criterios: diez opciones accesibles por teclado, vista adaptable a ancho móvil y cabeceras sin intercambio entre roles.
- Las cabeceras de Profesional y Paciente se configuran de forma independiente en demo para Custom, y pueden usar imágenes diferentes. La profesional se muestra en Inicio, con vista previa y opción de quitarla desde Configuración. Ambas aceptan sólo JPG, PNG o WebP de hasta 2 MB por archivo; se recomienda 1600 × 600 px (proporción 8:3) y recorte centrado responsivo. Una cabecera vacía no reutiliza la del otro portal. No se permiten CSS, fuentes ni layouts arbitrarios. Si el consultorio baja de Custom, la configuración se conserva pero deja de aplicarse.
- Admin: Facturación y Configuración.
- Paciente: Recomendaciones continúa planificada; Recursos ya está disponible como destino de navegación inferior.
- Las opciones futuras se muestran deshabilitadas con badge “Próximamente”; no deben parecer clicables.

### 5.3 Regla de acceso contextual del Admin

No existe una ruta general de pacientes para el Platform Admin. El acceso administrativo a una ficha reducida se realiza exclusivamente desde el perfil del nutricionista responsable. La ruta `/admin/patients` debe responder con una explicación de acceso no permitido.

## 6. Dirección visual

### 6.1 Personalidad

- SaaS profesional, tecnológico, humano, minimalista y refinado.
- Referencias de calidad: Linear, Notion, Stripe y Apple Health.
- El producto debe sentirse sereno y preciso, no infantil ni hospitalario.
- Evitar verde médico oscuro, frutas, balanzas, cintas métricas y clichés de dietética.
- Evitar colores saturados, sombras fuertes, bordes gruesos y decoraciones sin función.

### 6.2 Paleta oficial

| Token | Valor | Uso |
|---|---|---|
| `--bg-app` | `#F7F9FA` | Fondo general. |
| `--surface` | `#FFFFFF` | Tarjetas, modales y paneles. |
| `--surface-subtle` | `#F2F7F8` | Inputs, filtros y fondos secundarios. |
| `--surface-tinted` | `#EDF8F7` | Contenedores suaves de marca. |
| `--text-primary` | `#151B22` | Títulos, datos y texto principal. |
| `--text-secondary` | `#66727D` | Explicaciones y etiquetas. |
| `--text-tertiary` | `#8A959D` | Metadatos y estados pasivos. |
| `--border-subtle` | `#E2E9EC` | Bordes estándar. |
| `--border-hover` | `#CCD9DE` | Hover y separación reforzada. |
| `--brand-primary` | `#55AEB8` | Marca e interacción positiva. |
| `--brand-strong` | `#357984` | Texto/ícono de marca y foco. |
| `--brand-soft` | `#DDF3F2` | Fondos suaves de marca. |
| `--aqua-soft` | `#BDE9EA` | Acento suave. |
| `--sky-soft` | `#CFE8F5` | Acento informativo visual. |
| `--mint-soft` | `#D8F0E8` | Apoyo positivo. |
| `--butter-soft` | `#F5E8A9` | Acento cálido y graduaciones. |

### 6.3 Colores semánticos

| Estado | Texto | Fondo | Regla |
|---|---|---|---|
| Información | `#5267C7` | `#EAEFFC` | Explicar, no alarmar. |
| Advertencia | `#C98A27` | `#FDF6E2` | Requiere atención, no peligro inmediato. |
| Crítico | `#C95F59` | `#FCEBEA` | Acción prioritaria o destructiva. |
| Éxito | `#39835A` | `#E8F5EE` | Confirmación o estado estable. |

Nunca comunicar un estado sólo mediante color. Combinar color con etiqueta, ícono o descripción.

### 6.4 Gradientes permitidos

- Acción principal: `linear-gradient(90deg, #AEE5E8 0%, #CDEAF5 52%, #F5E6A4 100%)`.
- Tarjeta destacada: `linear-gradient(135deg, #E9F8F7 0%, #EEF7FB 58%, #FCF9E8 100%)`.
- CTA paciente: `linear-gradient(90deg, #B9EAEC 0%, #D5EDF6 50%, #F4E5A1 100%)`.
- Navegación activa: `linear-gradient(90deg, #D9F3F2 0%, #E3F1F8 100%)`.
- Ícono de marca: `linear-gradient(135deg, #8EDADD 0%, #A9DFF3 55%, #EDE196 100%)`.

Los gradientes usan texto oscuro `#151B22`; no deben convertirse en fondos decorativos dominantes.

## 7. Tipografía, espacio y forma

### 7.1 Tipografía

Familia: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.

| Rol | Tamaño / línea | Peso recomendado |
|---|---|---|
| H1 de página | 28/34 px | 700 |
| H2 de sección | 22/28 px | 600–700 |
| H3/tarjeta | 18/24 px | 600–700 |
| Cuerpo | 14/20 px | 400–500 |
| Texto pequeño | 12/16 px | 500–600 |
| Microtexto | 10–11 px | 500–700; sólo metadatos o badges. |

No reducir texto funcional para “hacerlo entrar”. Priorizar ancho, wrapping, scroll horizontal controlado o simplificación.

### 7.2 Espaciado

- Unidad base: 4 px.
- Separaciones frecuentes: 8, 12, 16, 20, 24, 32 px.
- Padding de página: 16 px móvil, 24 px tablet y 32 px desktop.
- Máximos de contenido actuales: 1180–1440 px en Admin; `max-w-md` en Paciente.
- Formularios: separación vertical mínima de 12–16 px; acciones separadas por borde o espacio claro.

### 7.3 Radios y elevación

- Controles compactos: 8–12 px.
- Botones e inputs estándar: 12 px (`rounded-xl`).
- Tarjetas: 16 px (`rounded-2xl`).
- Hero o contenedor principal: 24 px (`rounded-3xl`).
- Pill/badge: radio completo.
- Sombras: muy suaves; preferir borde antes que elevación. Modal y menú flotante pueden usar sombra media.

### 7.4 Movimiento

- Duración estándar: 150–200 ms.
- Animar color, opacidad, sombra o transformación pequeña.
- No usar animaciones que demoren acciones clínicas ni movimiento ornamental continuo.
- Respetar `prefers-reduced-motion` cuando se incorporen animaciones complejas.

## 8. Diseño responsive por rol

### 8.1 Admin

- Desktop-first.
- Sidebar fija de 256 px desde `md`; ocultarla en móvil hasta definir navegación alternativa.
- Tablas pueden usar `overflow-x-auto` y ancho mínimo explícito.
- Priorizar datos agregados, filtros, estados y acciones de gestión.

### 8.2 Profesional

- Desktop-first con adaptación tablet.
- Sidebar textual; contador de alertas sin resolver.
- En móvil, navegación inferior fija para Inicio, Perfil, Pacientes, Planes, Tareas y Frases, con objetivos táctiles de al menos 44 × 44 px.
- El recorrido Perfil → Pacientes → Planes → Recomendaciones no debe producir desborde horizontal del documento; las tablas extensas usan desplazamiento interno controlado.
- Dashboard y bandeja orientados a acción, no a decoración.
- Fichas de detalle en tarjetas y secciones; evitar navegación por pestañas excesivamente fragmentada.

### 8.3 Paciente

- Mobile-first, ancho de lectura limitado.
- Navegación inferior fija con objetivos principales.
- Targets táctiles mínimos de 44 × 44 px.
- Lenguaje cotidiano, frases cortas y una acción principal por pantalla.

## 9. Componentes y patrones

### 9.1 Botones

Variantes vigentes:

- `primary`: gradiente de marca; acción principal de la pantalla o modal.
- `brand`: aqua sólido; acción de marca secundaria.
- `secondary`: superficie suave con borde.
- `outline`: acción secundaria transparente.
- `ghost`: navegación o acción de baja jerarquía.
- `destructive`: fondo crítico suave; cerrar, suspender o acción irreversible.

Reglas:

- Máximo una acción visualmente primaria por bloque.
- Tamaños: sm 36 px, md 44 px, lg 48 px de altura mínima.
- Toda acción sólo con ícono necesita `aria-label` y tooltip cuando su significado no sea universal.
- Deshabilitado debe comunicar también la razón mediante texto cercano cuando la acción sea importante.

### 9.2 Tarjetas

- Superficie blanca, borde sutil, radio 16 px, sombra mínima.
- `highlighted` usa gradiente suave aprobado.
- Una tarjeta debe agrupar una unidad coherente: métrica, estado, persona, recurso o acción.
- No usar tarjetas como contenedor de cada línea; evitar fragmentación visual.

### 9.3 Badges y estados

- Badges generales: `high`, `medium`, `normal`, `active`, `suspended`, `pending`, `info`, `neutral`.
- Estados de consultorio mediante badge-trigger interactivo:
  - Activo: verde.
  - Pago pendiente: amarillo.
  - Suspendido: naranja.
  - Cerrado: rojo.
- El badge actual actúa como disparador de menú compacto en español.
- Mostrar opción actual y actualizar etiqueta/color inmediatamente después de confirmar.

### 9.4 Inputs

- Label visible sobre el control.
- Fondo `surface-subtle`, borde `border-subtle`, radio 12 px.
- Focus con `brand-strong` y superficie blanca.
- Error mediante texto específico y asociación `aria-describedby`; nunca sólo borde rojo.
- Campos obligatorios identificados de forma consistente.

### 9.5 Dialog/Modal

- Radix Dialog con overlay oscuro suave, backdrop blur, trampa y restauración de foco, cierre con Escape.
- Ancho máximo estándar `max-w-lg`; alto máximo 85 vh con scroll interno.
- Encabezado con título, descripción y cerrar accesible.
- Acciones: cancelar a la izquierda de confirmar; acción destructiva claramente diferenciada.
- Al cerrar exitosamente, limpiar formulario y devolver foco al disparador.

### 9.6 Toast

- Tipos: éxito, error e información.
- Ícono, título y descripción opcional.
- Se muestra abajo a la derecha en desktop; debe adaptarse sin salirse del viewport móvil.
- No usar toast como único lugar para información necesaria para corregir un formulario.

### 9.7 Tablas

- Encabezados legibles y `scope="col"`.
- Datos alineados por tipo; números y acciones mantienen consistencia.
- Filas con separación sutil; no cuadrícula pesada.
- Mobile/tablet: contenedor con scroll horizontal y ancho mínimo explícito.
- Acciones principales deben seguir disponibles por teclado.
- Estado vacío visible debajo del encabezado o como bloque reemplazo.

### 9.8 Menús flotantes de badge

- Trigger con `aria-haspopup="menu"`, `aria-expanded` y label contextual.
- Menú absoluto con ancho cercano a 12 rem, superficie blanca, borde y sombra.
- Elementos con rol `menuitem`; indicar opción actual con texto, no sólo color.
- Cerrar al seleccionar, Escape o click exterior cuando se incorpore implementación completa.

### 9.9 Escalas 1–5

- Usar `fieldset`, `legend` e inputs radio reales.
- Cada opción tiene 44 × 44 px como mínimo.
- Selección visible mediante fondo, contraste y cambio de forma/elevación.
- El error se asocia al grupo completo.

### 9.10 Estado vacío, carga y error

Cada módulo debe definir:

- Cargando: skeleton o texto que conserve jerarquía.
- Vacío inicial: qué es el módulo y acción para crear el primer elemento.
- Vacío por filtro: “No encontramos…” y opción de limpiar filtros.
- Error recuperable: causa comprensible y reintentar.
- Sin permiso: explicar límite sin revelar existencia de datos.
- Requiere plan/verificación: condición, beneficio y próximo paso.
- Próximamente: deshabilitado, no fingir una función disponible.

## 10. Lenguaje y contenido

### 10.1 Voz

- Profesional, clara, cálida y directa.
- Español rioplatense coherente en portales internos: “Gestioná”, “Confirmá”, “Ingresá”.
- En Paciente puede usarse español neutral o cercano, pero no mezclar tratamientos dentro de una misma experiencia.
- Evitar jerga técnica, culpabilización, diagnósticos automáticos y promesas clínicas.

### 10.2 Convenciones

- “Consultorio” en UI; “organization” sólo en código/arquitectura.
- “Nutricionista” o “profesional” según contexto; no usar términos ingleses visibles.
- Estados: Activo, Pago pendiente, Suspendido, Cerrado.
- Fechas visibles en formato local `es-AR`; fechas de sistema en ISO.
- Importes en ARS con `Intl.NumberFormat`, sin centavos salvo necesidad real.
- “Última actividad” incluye fecha, hora y valor relativo.

### 10.3 Microcopy clínica

- El check-in confirma recepción de datos, no interpreta ni diagnostica.
- Una alerta explica hecho, importancia y acción sugerida.
- Una recomendación pertenece a un profesional identificable.
- La IA debe declararse como asistencia y nunca hablar con autoridad clínica autónoma.

## 11. Accesibilidad

- Objetivo mínimo: WCAG 2.1 AA.
- Foco global visible: anillo de 2 px sobre superficie + 2 px `brand-strong`.
- Targets táctiles de 44 px en móvil y controles importantes.
- HTML semántico: landmarks, títulos jerárquicos, listas, tablas, labels y botones reales.
- No usar `div` clicable sin rol/teclado.
- Contraste suficiente en texto, badges y botones.
- Iconos decorativos no duplican texto para lectores de pantalla.
- Modales gestionan foco y Escape.
- Errores se anuncian y enlazan al campo.
- Estados no dependen sólo del color.
- Controles y navegación deben funcionar con teclado.

## 12. Requisitos del portal Admin

### 12.1 Resumen general

Estado actual: simulado completo en demo; primer resumen real de sólo lectura implementado para una sesión autenticada.

- Encabezado “Super Admin · Vista comercial”.
- Métricas: consultorios activos, nutricionistas y pacientes activos agregados.
- Botón `+ Nuevo consultorio` visible.
- Mensaje permanente de privacidad por diseño.
- Las métricas jamás deben contener información clínica identificable.

### 12.2 Atención comercial

Tarjetas:

1. Vencen en 3 días.
2. Pendiente de pago.
3. Próximo a suspensión.
4. Suspendidos.

Reglas:

- Listar nombres de consultorios cuando el conteo es mayor que cero.
- Cuando el conteo es cero, no mostrar separador, etiquetas ni nombres vacíos.
- Permitir “Registrar pago” directamente donde corresponda.
- No incluir botón redundante “Ver consultorios”; la navegación principal ya resuelve ese acceso.

### 12.3 Gráfico de evolución de plataforma

Estado actual: simulado y estilizado.

- Estética limpia, sobria y minimalista.
- Sin ejes Y ni unidades visibles en laterales.
- Conservar sólo meses en eje X.
- Series: Consultorios activos, Pacientes activos y Cobros reales.
- Filtros de tiempo obligatorios: Mes actual, 3 meses, 6 meses, Todo y Personalizado.
- Los filtros de serie actúan como toggles accesibles y deben mostrar una diferencia inequívoca entre activo/inactivo.
- Tooltip por mes con valores exactos.
- Si hay varias series activas, tooltip con desglose; si hay una, mostrar sólo esa serie.
- El filtro personalizado define inicio y fin válidos y comunica el rango aplicado.

### 12.4 Lista de consultorios

Estado actual: simulado con acciones en demo; directorio real de sólo lectura implementado con búsqueda y filtro por estado.

- Búsqueda y filtros de estado/plan.
- Tabla con consultorio, estado, plan/tarifa, nutricionistas, pacientes, vencimiento, facturación, almacenamiento y detalle.
- `+ Nuevo consultorio` también en la cabecera de esta sección.
- Estado mediante badge-dropdown en español, no select tradicional.
- Plan/tarifa mediante badge-dropdown editable on-the-fly.
- Al cambiar plan, actualizar precio y almacenamiento asociados sin recarga.
- Registrar pago disponible por fila.
- Mantener scroll horizontal controlado en viewports estrechos.
- La ubicación real se estructura en ciudad, provincia/estado y país; no se persiste como una única cadena ambigua.

### 12.5 Alta de consultorio

Estado actual: simulado; envío real de email pendiente de backend.

Campos obligatorios:

- Nombre del consultorio.
- Ubicación.
- Plan inicial.
- Nombre completo del responsable.
- Email del responsable.

Resultado esperado:

- Crear consultorio con plan y ubicación.
- Crear responsable principal vinculado.
- Dejar invitación en estado pendiente.
- En backend real, enviar email transaccional para configurar acceso.
- Redirigir al perfil del consultorio y mostrar confirmación.

### 12.6 Perfil del consultorio

Estado actual: simulado en formato de tarjetas.

- Hero con nombre, ubicación, plan, estado e invitación pendiente.
- Tarjetas resumen: tarifa, vencimiento, profesionales y pacientes.
- Responsables: principal y adicionales, con estado de invitación.
- Acción `+ Agregar responsable adicional` disponible para Platform Admin y responsable principal/actual.
- Profesionales: listado e invitaciones pendientes.
- Acción `+ Agregar profesionales al consultorio`.
- Facturación/pagos: registrar pago e historial.
- Almacenamiento: usado, límite y porcentaje; Custom puede ser flexible.

### 12.7 Invitaciones

Responsable adicional:

- Campos: Nombre y apellido, correo electrónico.
- Al confirmar: crear invitación pendiente; backend real envía email.
- Al aceptar: mismo rol de Responsable del Consultorio, sujeto a matriz de permisos.
- Evitar email duplicado dentro del consultorio.

Profesional:

- Campos: Nombre completo, correo electrónico.
- Al confirmar: invitación pendiente y email real en backend.
- Al aceptar: completa datos básicos y queda vinculado al consultorio.
- No asignar pacientes automáticamente sin una acción explícita.

### 12.8 Pagos y vencimientos

Estado actual: registro manual simulado.

Modal `Registrar pago`:

- Consultorio y plan precargados.
- Monto del plan precargado, editable sólo si la política lo permite.
- Fecha de pago por defecto hoy, editable.
- Próximo vencimiento calculado desde el vencimiento actual sumando un mes y preservando el día cuando exista.
- La fecha de vencimiento puede modificarse manualmente por Platform Admin y la modificación debe quedar auditada.
- El estado comercial (`al día`, `pendiente`, `vencido`) es independiente del estado operativo (`activo`, `suspendido`, `cerrado`).
- Método y nota/comprobante opcional.
- Al confirmar: estado Activo, limpiar suspensión, avanzar vencimiento, crear historial y retirar alertas comerciales derivadas.
- Reactivar desde Suspendido o Cerrado requiere pago confirmado.
- En backend real, operación transaccional e idempotente.

### 12.9 Lista y perfil de nutricionistas

Estado actual: simulado.

- Lista con nutricionista, organización, pacientes asignados, fecha de alta, última actividad, estado y acción.
- Última actividad muestra día, horario y valor relativo.
- Perfil individual en tarjetas, no en una navegación de “fichas” incómoda.
- Aplicar el formato a todos los nutricionistas, no sólo al ejemplo.
- Mostrar resumen, organizaciones, pacientes asignados, actividad operativa y estado de cuenta mediante bloques claros.

## 13. Requisitos del portal Nutricionista

### 13.1 Inicio

Estado actual: simulado.

- Saludo y contexto del profesional/consultorio seleccionado.
- Resumen de pacientes y alertas relevantes.
- Acceso directo a Bandeja de atención y pacientes.
- La guía de puesta en marcha debe enlazar a Configuración para horarios y modalidad; sólo las reservas públicas no disponibles permanecen como “Próximamente”. El selector de paciente del resumen expresa su resultado como `Ver resumen`, no como una acción ambigua.
- Evitar métricas sin acción asociada.
- Incorporar onboarding orientativo, nunca bloqueante: completar perfil, configurar horarios/modalidad, invitar primer paciente, crear primer plan y compartir enlace de reservas.

### 13.1.1 Perfil profesional

Estado: primera entrega simulada implementada; persistencia real pendiente.

- Perfil por vinculación profesional-consultorio; una misma identidad puede tener datos diferentes en organizaciones distintas.
- Obligatorios para operar: nombre, apellido y email.
- Teléfono visible para administración y pacientes propios.
- Matrícula opcional, única y no verificada por NutriSoft. Si se informa: número, provincia y país; no se registra entidad emisora.
- Una especialidad seleccionable por vinculación. La lista es una taxonomía de producto y no acredita certificación.
- Zona horaria configurable por profesional.

### 13.2 Agenda / Citas

Estado: núcleo de datos local y recorridos simulados implementados; OAuth local, elección de calendario y primera Agenda real local disponibles. Citas/Ingresos reales, disponibilidad bidireccional y reserva pública siguen planificadas.

- Agenda simulada con vistas de Día, Semana y Mes, selector de vista, navegación temporal y retorno a Hoy. Día prioriza los turnos en orden cronológico; Semana usa columnas compactas y legibles sin scroll horizontal en desktop, con desplazamiento interno controlado sólo en móvil; Mes resume carga y abre el día seleccionado.
- En demo, el paciente autenticado puede solicitar un turno desde su portal. La disponibilidad se calcula para los próximos 21 días a partir de horarios, pausa, bloqueos/vacaciones y citas solicitadas o confirmadas de su profesional asignado. La solicitud queda en estado `Solicitada`; no expone el importe ni se confirma automáticamente.
- El enlace público personal por profesional sigue planificado: no se simula como ruta abierta hasta definir identidad, invitación, antiabuso y autorización real del paciente.
- Próximas citas, disponibilidad y estados.
- En fases posteriores: tipos de consulta, sedes, profesionales, reservas públicas, recordatorios y sincronización externa.
- La agenda debe seguir funcionando si falla una integración de calendario externa.
- Google Calendar es la primera integración externa de Agenda: cada profesional conecta un único calendario elegido mediante OAuth de alcance mínimo. Toda cita confirmada en NutriSoft se refleja allí como `Consulta NutriSoft`, sin nombre del paciente, notas ni detalles clínicos; los eventos externos ocupados —incluidos los de día completo— bloquean disponibilidad y no se importan como citas. NutriSoft consulta sólo el intervalo, identificador técnico, estado y transparencia necesarios para detectar ocupación; nunca persiste ni muestra el título, descripción o asistentes de un evento externo. Si la detección coincide con una cita NutriSoft ya existente, conserva la cita sin modificarla y muestra una advertencia operativa a la profesional.
- Una cita virtual confirmada muestra al paciente el enlace de Google Meet sólo si fue creado y devuelto por la integración autorizada. Las citas presenciales no muestran enlace alguno; el frontend nunca fabrica una URL de Meet.
- Citas concentra el historial, filtros por paciente y período, y una nota profesional privada de texto libre por consulta. No duplica Próximos pasos y sólo es visible para el profesional clínicamente asignado; cualquier resumen para paciente se persiste por separado.
- Citas ofrece filtros combinables de paciente, período (Hoy, 7 días, Mes, Personalizado y Todo), estado de cita, estado de pago y modalidad. El período personalizado define fechas Desde/Hasta inclusivas. La alta y la reprogramación ocurren sólo desde Agenda para evitar flujos duplicados.
- Las transiciones son unidireccionales: solicitada a confirmada o cancelada; confirmada a completada, cancelada o ausente. Una cita completada conserva notas editables y permite corregir exclusivamente su importe. Una cancelación o ausencia exige resolver antes de cerrar si queda sin cargo, pendiente o con importe parcial/extra.
- La ficha profesional del paciente presenta una vista no editable de los últimos cinco turnos derivados de Citas, con fecha/hora, modalidad, estado y pago, sin importes. No duplica ni permite alterar la cita desde allí.
- Cancelaciones y ausencias generan una alerta operativa, no un cobro automático. El profesional decide por cada caso si queda sin cargo, pendiente o parcial/extra; la decisión y sus movimientos son auditables.
- Desde Agenda, una cita se abre al seleccionarla: permite corregir fecha/hora, duración, modalidad e importe mientras siga solicitada o confirmada. La cancelación nunca elimina el registro; conserva la trazabilidad y deriva la resolución de cobro correspondiente.
- Las citas creadas manualmente por el profesional nacen confirmadas; las solicitadas por el paciente quedan pendientes hasta la acción explícita `Confirmar cita` desde Agenda. Al reprogramar, la cita original queda marcada como `Reprogramada` fuera de la Agenda operativa y se crea una nueva cita confirmada vinculada a ella. Las canceladas y reprogramadas se ocultan de Agenda, pero permanecen en Citas para historial y cobros.
- Agenda permite crear bloqueos puntuales o vacaciones sin paciente. Se aplican a la disponibilidad futura y no alteran citas existentes.
- Configuración profesional conserva moneda predeterminada por vinculación con el consultorio. Catálogo inicial: ARS, CLP, BRL, USD, MXN, COP, PEN, EUR y UYU; cada cita y movimiento conserva su propio código para proteger el historial. Las duraciones iniciales son 15, 30, 45, 60, 75 y 90 minutos.
- Ingresos debe mostrar métricas separadas por moneda cuando existan cobros o citas en monedas distintas. Nunca suma ARS, USD u otra moneda en un único total visual.
- Ingresos incorpora un gráfico financiero consolidado, sin desglose por paciente: muestra cobrado por fecha de movimiento y pendiente según fecha de cita. Usa la moneda predeterminada configurada por el profesional, se filtra por Mes actual, 3 meses, 6 meses, 12 meses, Todo y Personalizado, y permite activar o desactivar las series Cobrado y Pendiente sin que ambas queden ocultas. La visual debe ser compacta y minimalista.
- Los reembolsos manuales pueden ser totales o parciales y se vinculan al cobro original. No procesan dinero: registran la devolución y los indicadores usan el ingreso neto, sin sumar lo devuelto como Cobrado. La corrección no exige motivo en UI, pero conserva el movimiento original y su ajuste para trazabilidad.
- El listado de Ingresos usa filas completas seleccionables: abre un resumen contextual con los trámites financieros disponibles, evitando botones desalineados y manteniendo el estado operativo de la cita fuera de esta sección.
- El aviso de cancelación/ausencia es sólo in-app en esta etapa y ofrece una resolución inmediata en pop-up: sin cargo, pendiente o parcial/extra con monto cuando aplique.
- Cada cita admite un precio propio por paciente, duración o criterio profesional. Configuración ofrece precios sugeridos, pero el profesional puede ajustarlo antes de confirmar la cita.
- Una cita virtual genera automáticamente un enlace Google Meet cuando el profesional tiene conectado su calendario elegido. Sin esa conexión, la interfaz solicita completar Configuración antes de confirmar el enlace automático.
- Paciente recibe una notificación interna ante cita nueva, cancelación o reprogramación; email queda para una integración posterior. En el modo simulado actual, estas novedades aparecen en el inicio del paciente como un bloque compacto, pueden marcarse como vistas y no exponen notas privadas ni importes. En el recorrido real local, el paciente ya puede consultar sus citas, ingresar al Meet únicamente cuando fue creado para una cita virtual confirmada y enviar una solicitud de cancelación o reprogramación que no altera la cita original.
- Pendiente de validación manual local: completar el recorrido Paciente → solicitud de cambio → Agenda profesional → aprobación/rechazo y resolución de cobro antes de declararlo cerrado para producción.

### 13.2.1 Configuración profesional

Estado: configuración operativa simulada implementada; persistencia real, OAuth Google y Meet real pendientes.

- Configuración pertenece a la vinculación profesional-consultorio, no a la identidad global del profesional.
- Permite definir moneda predeterminada, duración sugerida y precios sugeridos para cita virtual y presencial.
- Las monedas iniciales son ARS, CLP, BRL, USD, MXN, COP, PEN, EUR y UYU.
- Las duraciones disponibles son 15, 30, 45, 60, 75 y 90 minutos.
- Agenda usa estos valores para precargar una nueva cita, pero cada cita conserva moneda e importe propios y editables.
- El profesional configura sus días y franjas de atención, la pausa entre citas y bloqueos puntuales o períodos de vacaciones. Los valores demo iniciales son lunes a viernes de 09:00 a 18:00, con 10 minutos entre turnos; no implican disponibilidad pública hasta que se habilite el enlace de reserva.
- Cada día debe admitir múltiples franjas de atención independientes, para contemplar pausas largas sin recurrir a bloqueos manuales.
- Cada bloqueo conserva tipo, inicio, fin y nota opcional. La UI valida que el intervalo sea coherente; en la futura disponibilidad pública estos períodos no se ofrecerán.
- Un bloqueo no puede guardarse si se superpone con una cita solicitada o confirmada: primero debe resolverse esa cita. Los bloqueos se administran tanto desde Configuración como desde Agenda.
- El profesional define con cuánta anticipación admite cancelaciones y reprogramaciones. Estas reglas quedan preparadas para el enlace público: no cambian retrospectivamente citas manuales ni disparan cobros automáticos.
- Fuera del plazo configurado, el paciente puede enviar una solicitud tardía de cancelación o reprogramación; queda pendiente de decisión profesional, no modifica la cita automáticamente ni genera cobro.
- El paciente puede retirar una cita aún solicitada. Para una cita confirmada futura, solicita cancelación o indica un nuevo horario; la cita original permanece vigente hasta que el profesional apruebe o rechace la solicitud. Al aprobar una cancelación, el profesional decide si queda sin cargo o pendiente; el paciente nunca ve importes en este flujo.
- El profesional elige los avisos internos que desea recibir: solicitudes, cancelaciones, ausencias y comentarios en planes o próximos pasos. Email y WhatsApp siguen siendo futuros.
- Un cambio de moneda sólo afecta citas y cobros nuevos. Los registros históricos conservan su moneda; si existen varias, Ingresos las separa y ofrece selección de moneda sólo en ese caso.
- Google Calendar aparece como bloque preparado: NutriSoft a Google, bloqueo de eventos externos y Meet automático. La conexión real OAuth se mantiene planificada y no debe simular credenciales ni tokens.
- Configuración debe mostrar el calendario actualmente elegido. Cambiar calendario reutiliza la conexión de Google; cambiar cuenta vuelve a OAuth, borra la selección previa y exige elegir un calendario de la nueva cuenta. Ninguna cita existente se mueve entre calendarios automáticamente.

### 13.3 Bandeja de atención

Estado actual: simulada con reglas determinísticas y ciclo funcional cerrado en Fase 2.2.

Debe responder:

1. ¿Qué paciente necesita atención?
2. ¿Qué ocurrió?
3. ¿Por qué importa?
4. ¿Qué acción debería realizar el nutricionista?

Reglas actuales:

- Pedido explícito de ayuda: prioridad alta.
- Energía ≤ 2/5: prioridad alta.
- Adherencia ≤ 2/5: prioridad alta.
- Código `DELAYED_CHECKIN` reservado para desarrollo posterior.

Estados: sin resolver, reconocida y resuelta. Reconocer conserva autor y fecha sin retirar la alerta de los pendientes; resolver conserva autor y fecha y finaliza el caso. No se permiten transiciones duplicadas ni descartes silenciosos.

### 13.4 Pacientes

Estado actual: simulado.

- Mostrar clínica únicamente de pacientes asignados al nutricionista activo y del mismo consultorio. Los no asignados pueden aparecer sólo en directorio básico.
- El alta se inicia por invitación por email, no creando acceso activo automáticamente.
- La invitación permanece pendiente hasta aceptación; vence a los 7 días, puede revocarse y el reenvío invalida el enlace anterior.
- Una identidad de paciente puede vincularse a más de un profesional u organización sin duplicar la cuenta global.
- Al aceptar: configura contraseña, acepta términos/privacidad y completa datos personales y antropometría inicial opcional.
- Columnas/información relevante: contacto, objetivo, plan actual, última actividad y acceso al portal.
- El directorio profesional prioriza un único bloque `Paciente y contacto` (nombre, correo y teléfono), objetivo multilínea, plan, acceso y una acción compacta `Ficha`. En escritorio debe evitar scroll horizontal con un ancho mínimo contenido; en viewports estrechos conserva scroll interno controlado.
- Perfil con resumen, check-ins y recomendaciones.
- Acciones: asignar check-in, emitir recomendación y consultar historial.

### 13.5 Check-ins

Estado actual: flujo, configuración general y módulo de seguimiento implementados en modo simulado; persistencia real pendiente.

- El profesional asigna un check-in a un paciente propio.
- El paciente responde energía 1–5, adherencia 1–5, pedido de ayuda y notas opcionales de hasta 500 caracteres.
- La configuración del formulario pertenece a la vinculación profesional-consultorio y se aplica de forma general a sus pacientes. Energía y adherencia permanecen como núcleo comparable; el profesional puede activar o desactivar sueño, digestión/hinchazón, hambre/saciedad, pedido de ayuda y comentario opcional.
- Las respuestas adicionales se conservan junto al check-in y se ven exclusivamente en el historial del paciente por su nutricionista autorizado. No generan alertas automáticas en esta etapa.
- La respuesta se registra una sola vez.
- Las reglas generan alertas sin producir diagnóstico.
- Respuestas reales serán inmutables en base de datos.
- La vista general muestra una fila por paciente clínicamente autorizado y su última respuesta; nunca expone pacientes de otro profesional o consultorio.
- El período predeterminado es `Todos`. También permite Hoy, últimos 7 días, últimos 15 días, mes calendario y rango personalizado inclusivo.
- Los filtros por período excluyen pacientes sin respuesta; éstos permanecen visibles en `Todos` y mediante la prioridad `Sin respuesta`.
- Se puede buscar o elegir paciente, filtrar por prioridad y ordenar por fecha reciente, fecha antigua o nombre.
- La prioridad es determinística y orientativa: alta si solicita ayuda o energía/adherencia es 1–2; media si alguna es 3; normal en los demás casos; nunca se presenta como diagnóstico.
- Cada fila enlaza directamente con la pestaña de historial completo de check-ins del paciente autorizado.
- El módulo incorpora un resumen semanal de seguimiento: agrupa inactividad sin duplicar pacientes en 3–4, 5–9 y 10+ días desde la última actividad registrada, y ofrece acceso directo a la ficha autorizada. Es una señal operativa; no constituye alerta clínica ni diagnóstico.

### 13.6 Recomendaciones

Estado actual: biblioteca motivacional y asignación simuladas; emisión clínica desde perfil conservada.

- Texto obligatorio, creado por profesional autorizado.
- En el flujo 2.2 se vincula automáticamente con la respuesta de check-in más reciente del paciente cuando existe; si no existe, queda identificada como recomendación general.
- Visible sólo para paciente y equipo clínico autorizado.
- Conservar fecha, autor y vínculo de origen.
- El profesional dispone de una biblioteca privada de frases motivacionales propias, con alta, edición, duplicación y eliminación.
- La biblioteca usa fichas horizontales: frase, pacientes asociados y acciones quedan visibles en una única fila amplia; no usa indicadores redundantes de cantidad por ficha.
- Cada frase indica los pacientes que la tienen aplicada y puede asignarse a varios pacientes en una sola acción.
- Cada paciente admite una sola frase motivacional activa: una nueva asignación reemplaza la anterior.
- El paciente ve la frase activa en su muro principal; eliminarla de la biblioteca también la retira de los muros asociados.
- La implementación actual opera con datos simulados. Persistencia, historial de cambios y auditoría real continúan pendientes de backend.

### 13.7 Recursos / Biblioteca

Estado actual: demo conservada y biblioteca real local conectada: alta, edición, publicación/retiro, filtros, acceso paciente y PDF privado hasta 10 MB. Escaneo antimalware y limpieza de cargas abandonadas pendientes antes de producción.

- Botón principal para agregar recurso.
- Biblioteca preparada para decenas de contenidos: fichas compactas, legibles y organizadas en tres columnas en desktop habitual y cuatro en pantallas amplias.
- Cada recurso propio puede editar título, categoría, tipo y archivo/enlace sin recrearlo; conserva estado editorial y actualiza `updatedAt`.
- Tipos iniciales: documento y enlace/video.
- Campos: título, categoría y archivo o URL.
- Todo recurso pertenece a `organization_id` y `ownerNutritionistId`.
- Estados editoriales: borrador, publicado y retirado.
- Sólo el autor puede cambiar el estado de publicación en el prototipo actual.
- Se comparte automáticamente y exclusivamente con pacientes propios/asignados cuando está publicado.
- Retirar un recurso elimina inmediatamente su visibilidad del portal Paciente; devolverlo a borrador lo mantiene privado.
- No visible para pacientes de otro profesional, incluso en el mismo consultorio.
- Aislamiento total entre consultorios.
- Fases posteriores: archivos en storage privado, versiones, miniaturas, analítica y biblioteca compartida del consultorio con aprobación explícita.

### 13.8 Recetario

Estado actual: demo conservada y recetario real local conectado: creación, edición, duplicación en borrador, publicación/retiro, búsqueda y filtros, detalle autorizado y enlaces desde planes. Fotografía por URL HTTPS opcional; valores nutricionales opcionales, sin inventar valores iniciales. Formateo IA futuro.

- Vista en grilla de tarjetas.
- La biblioteca del profesional usa tres columnas desde desktop habitual; conserva dos en tablet y una en móvil para sostener legibilidad. Recursos puede ampliar a cuatro columnas sólo en pantallas amplias.
- Foto principal, categoría, tags de dieta, tiempo, porciones, calorías y macros.
- Buscador con limpieza rápida y filtros por nombre, categoría, etiquetas y estado editorial.
- Categorías iniciales: Desayunos, Almuerzos, Cenas y Snacks.
- Alta con título, ingredientes, preparación, porciones y datos nutricionales.
- Estados editoriales: borrador, publicado y retirado; sólo las publicadas están disponibles para pacientes propios.
- El inicio del paciente muestra una selección breve y enlaza al recetario completo cuando existen más de tres recetas. La biblioteca permite buscar y abrir sólo recetas publicadas por su nutricionista asignado en el mismo consultorio.
- Duplicar siempre crea un borrador propio, conserva la procedencia y no modifica el original.
- Nunca modificar una receta ajena al copiar; una biblioteca compartida requerirá permisos y contratos adicionales.
- Ejemplos demostrativos: 4–5 recetas variadas para que la vista sea útil desde el inicio.

IA futura para recetas:

- Recibe borrador del profesional.
- Propone título, ingredientes estructurados, pasos, porciones, etiquetas y formato visual.
- No inventa cantidades ni macros sin marcar incertidumbre.
- Entrega borrador editable; publicación exige aprobación humana.

### 13.9 Antropometría y evolución

Estado: primera entrega simulada implementada; persistencia real y exportación clínica pendientes.

- El registro cotidiano de evolución es exclusivamente de peso, realizado de forma opcional por paciente o nutricionista asignado, con fecha editable hacia atrás y origen (`paciente` o `profesional`). Altura, cintura y cadera pertenecen a los datos antropométricos iniciales del perfil y no se solicitan en cada carga.
- La ficha profesional incorporará una pestaña independiente llamada `Antropometría`. No reemplaza `Seguimiento`: Seguimiento conserva el peso cotidiano que carga el paciente; Antropometría reúne revisiones realizadas por la profesional.
- Cada revisión antropométrica es una fila fechada de una tabla. Sus columnas son métricas y cada celda es opcional: el profesional puede guardar sólo las mediciones disponibles en esa consulta, corregir una revisión o eliminar una carga errónea.
- Las métricas iniciales aprobadas son: altura, peso, talla, circunferencia de cintura, porcentaje de grasa, porcentaje de masa muscular, hidratación, pliegues y porcentaje de grasa visceral. El profesional puede añadir campos antropométricos personalizados desde Configuración; cada campo declara al menos nombre, unidad y tipo de valor para sostener tablas legibles.
- La pestaña ofrece un gráfico de una métrica seleccionable a la vez. El profesional elige métrica y período: 7 días, 15 días, 30 días, mes pasado o rango personalizado. El gráfico es descriptivo, no emite juicios ni proyecciones.
- Las revisiones profesionales admiten una nota opcional de contexto. Se pueden editar o eliminar para corregir errores de carga; eliminar requiere confirmación explícita y sólo opera sobre una revisión de un paciente asignado.
- En demo y real, una revisión con nota muestra un indicador discreto `NOTA` en el historial. Al tocarlo o activarlo con teclado se abre el texto completo en un diálogo; sin nota no aparece indicador. El texto no ensancha la tabla ni recarga las tarjetas móviles.
- Los campos personalizados se pueden ordenar y archivar. Archivar deja de solicitarlos en nuevas revisiones, pero preserva sus valores y los mantiene visibles en el historial existente.
- La profesional puede comparar dos revisiones elegidas y ver valores inicial/final y diferencia por métrica. Es una lectura numérica neutral, sin etiquetas de mejora o deterioro.
- En móvil, el historial se presenta como tarjetas por revisión; la tabla de columnas se conserva para escritorio.
- La ficha profesional del paciente reúne el historial y una tendencia descriptiva de peso sólo a partir de tres mediciones. Muestra el cambio absoluto del período y los valores registrados, sin etiquetas de valor clínico, diagnósticos ni proyecciones futuras.
- Paciente y profesional disponen de los mismos períodos de lectura: 7 días, 30 días, 3 meses y todo el historial. La fecha nunca puede ser futura: la interfaz la restringe y la validación de datos debe reforzarlo del lado servidor al pasar a producción.
- El resumen profesional conserva siempre el último peso registrado con su fecha, el cambio del período seleccionado y el cambio frente al peso inicial declarado durante la apertura de perfil. La línea suavizada del gráfico es una ayuda visual opcional, nunca una proyección ni una valoración clínica.
- Una variación de peso igual o superior al 10% respecto del último registro solicita confirmación explícita para reducir errores de carga; no bloquea una medición correcta.
- Platform Admin, owner no clínico, assistant, profesionales no asignados y otros pacientes no reciben estas mediciones.

### 13.10 Reportes

Estado: futuro diferido por decisión de producto; no forma parte del cierre funcional actual.

- Seleccionar paciente, período y plantilla.
- Activar, desactivar, editar y ordenar secciones.
- Preview y PDF coherentes.
- Secciones posibles: identidad, resumen, peso, medidas, antropometría, macros, adherencia, bienestar, plan, consultas, notas, recomendaciones y firma.
- Guardar snapshot de datos, versión, autor y registro de entrega.

### 13.11 Planes alimentarios y adherencia

Estado: biblioteca y editor multidía implementados tanto en modo simulado como en el recorrido real local. El recorrido real persiste borradores/versiones y muestra cumplimiento y comentarios por comida; los enlaces interactivos a recetas siguen implementados sólo en la demo hasta conectar la biblioteca real. Importación pendiente.

- La pantalla principal reúne todos los planes individuales del profesional; cada tarjeta resume duración, cantidad de comidas/elementos, su único paciente vinculado y comentarios pendientes de revisión.
- La biblioteca incluye buscador con limpieza rápida. Debe encontrar planes por título, paciente vinculado, estado y texto administrativo relevante, con estado vacío por filtro sin ocultar la acción de limpiar.
- Cada plan abarca entre 7 y 30 días. Un borrador puede quedar incompleto mientras se edita, pero no se publica sin contenido.
- Cada día admite hasta cuatro comidas opcionales. Cada comida contiene uno o varios elementos con descripción y cantidad opcional, además de alternativas.
- El profesional edita cada plan desde una ruta de detalle sin convertir cada día en un plan independiente. En el recorrido real los días se apilan y cada uno puede plegarse o desplegarse de forma independiente; pueden coexistir varios abiertos y existen acciones globales para plegar o desplegar todos.
- El editor presenta una sección vertical `Organización del plan`: los días se apilan en filas compactas y pueden agregarse, duplicarse, quitarse y reordenarse por arrastre o mediante controles accesibles. Subir, bajar, copiar y eliminar se mantienen en el mismo renglón del número y título, con controles compactos de 28 px en desktop, tooltip y nombre accesible. La columna desktop de 430 px reserva espacio suficiente para leer aproximadamente 4–6 palabras cortas; títulos mayores se truncan visualmente pero conservan su texto completo como ayuda contextual.
- La numeración `Día 1`, `Día 2`, etc. deriva siempre de la posición actual. Cada día admite además un título opcional independiente, por ejemplo `Todo moderado` o `Día de permitido`.
- Agregar y duplicar respetan el máximo de 30 días; quitar respeta el mínimo de 7. Duplicar genera identificadores nuevos para el día, sus comidas y sus elementos.
- El título general del plan permanece editable de forma explícita desde la cabecera.
- El profesional puede agregar indicaciones generales, lista de compras y objetivos opcionales.
- Estados editoriales: borrador, publicado y archivado.
- Un plan puede quedar ligado a un solo paciente durante toda su vida útil. No puede asignarse a una segunda persona aunque la asignación anterior haya terminado, para impedir cruces de historial, cumplimiento o comentarios.
- Para reutilizar una estructura con otro paciente, el profesional duplica el plan. La copia es una entidad nueva en borrador, con identificadores nuevos y sin paciente, asignaciones, cumplimiento ni comentarios heredados.
- Al asignar, se crea una copia/versionado para el paciente; modificar la estructura base no altera silenciosamente asignaciones existentes.
- Un plan asignado se modifica mediante una nueva versión. El paciente sólo recibe los cambios cuando el profesional ejecuta explícitamente `Publicar cambios`; hasta entonces conserva la versión activa anterior. Este flujo está aprobado pero todavía no implementado en la demo.
- Cada paciente admite un plan principal activo y un complemento opcional. El sistema conserva historial interno para seguridad y continuidad profesional, pero el paciente no ve planes retirados ni versiones anteriores.
- Reemplazar o retirar el principal cierra la asignación anterior, la oculta inmediatamente en el portal Paciente y conserva el registro interno sin eliminar el plan.
- Una comida puede enlazar únicamente una receta publicada del profesional actual. El editor ofrece selección opcional y acceso directo a su ficha.
- El paciente puede abrir esa receta desde su plan mediante una ruta autorizada. Una receta inexistente, retirada o ajena se resuelve como no disponible, sin filtrar contenido.
- Importación inicial: sólo documentos genéricos. La IA entrega un borrador que exige revisión humana; nunca publica automáticamente.
- Calorías y macronutrientes permanecen ocultos hasta contar con datos confiables.
- Adherencia por comida: cumplido, parcialmente, no cumplido o sin respuesta. `Sin respuesta` es derivado, no una elección del paciente.
- En el corte simulado actual, el paciente dispone primero de un check rápido por comida: marcado equivale a cumplido y no marcado permanece como `sin respuesta`; parcial y no cumplido se incorporarán cuando se diseñe su interacción explícita.
- Cada comida admite un comentario opcional del paciente de hasta 500 caracteres. Pertenece al plan, asignación, día, comida y paciente correspondientes y conserva sólo su valor y fecha más recientes.
- Todo comentario nuevo genera un indicador operativo no diagnóstico en `Planes alimentarios`, visible en navegación, resumen y tarjeta del plan. No ingresa en la Bandeja de atención clínica salvo que una regla futura explícita lo justifique.
- Dentro del plan, el profesional ve comentario, paciente, día, comida y fecha, y puede marcarlo como revisado. El paciente puede editarlo o vaciarlo en cualquier momento mientras la comida o tarea continúe vigente; la edición no conserva versiones ni auditoría de contenido y vuelve el comentario a estado nuevo.
- Los comentarios notifican únicamente dentro de NutriSoft en esta etapa. Email y WhatsApp permanecen futuros.
- El paciente consulta los 7–30 días mediante secciones desplegables, con todas las comidas, elementos y enlaces autorizados a recetas. El primer día se abre por defecto.
- La ficha profesional del paciente muestra porcentaje general y desglose por día. El seguimiento vive en esa ficha para mantener contexto y aislamiento; no se agrega a métricas globales ni al Platform Admin.
- El paciente puede completar o corregir días anteriores; se conserva auditoría de carga y edición.
- Alertas de inactividad escalonadas a los 3, 5 y 10 días.

## 14. Requisitos del portal Paciente

### 14.1 Inicio

Estado actual: simulado y mobile-first.

- Saludo con primer nombre.
- Estado del check-in: pendiente, vencido o al día.
- Una acción principal para responder cuando esté pendiente.
- Recomendaciones del profesional.
- Recursos y recetas publicados por el nutricionista asignado, con estados vacíos comprensibles.
- Consultorio, nutricionista asignado y estado de acceso al portal.
- Orden aprobado: próxima cita/acción, mensaje profesional, plan del día, check-in/adherencia, evolución/mediciones, recursos y recetas.
- Novedades de citas: mostrar avisos internos de cita creada, cancelada o reprogramada, con fecha visible y acción para marcar como visto. No reemplaza la agenda completa ni muestra importes.
- Próximos pasos: uno o varios, con estado pendiente/completado, sin vencimiento ni orden manual.
- Los próximos pasos se agrupan en una lista individual de 7–15 días. Sólo puede existir una lista activa por paciente y una misma lista nunca se comparte entre pacientes.
- El profesional puede crear, editar, aplicar, desaplicar, duplicar y eliminar listas. Duplicar genera una copia sin asignar y sin checks/comentarios heredados.
- Cada tarea acepta un check y un comentario opcional del paciente; ambos son visibles para el paciente y el profesional asignado. Aplicar una lista nueva desaplica la anterior sin eliminarla.
- Cada comida del plan también permite un comentario opcional para el nutricionista. El formulario permanece plegado cuando está vacío para que planes de 7–30 días sigan siendo fáciles de recorrer.
- Mensaje motivacional manual desde biblioteca profesional o texto personalizado; uno activo por paciente y no generado por IA.

### 14.4 Antropometría y progreso

Estado: alcance ampliado implementado en demo y pantalla profesional de Antropometría conectada a Supabase local. Acceso desde Pacientes → Abrir antropometría; Configuración administra campos adicionales reales. Permite crear, corregir y eliminar revisiones propias, conservar fecha civil, seleccionar columnas, comparar dos revisiones y graficar una métrica por período. Persistencia real local verificada con pruebas transaccionales, sin resetear datos de prueba existentes.

- Paciente y profesional pueden registrar; toda medición conserva autor, fecha, hora y origen.
- El peso cotidiano pertenece a Seguimiento; las revisiones antropométricas son una tabla profesional independiente, con una fila por fecha y métricas opcionales por columna.
- Métricas base: altura, peso, talla, circunferencia de cintura, porcentaje de grasa, porcentaje de masa muscular, hidratación, pliegues y porcentaje de grasa visceral. El profesional puede añadir campos personalizados desde Configuración sin afectar los registros previos.
- `Peso objetivo` es autodeclarado por el paciente.
- El profesional configura qué solicita cada check-in; los campos antropométricos personalizados se configuran por separado.
- Tendencia visible desde tres mediciones: cambio absoluto y curva suavizada, lenguaje neutral y sin proyección futura.
- El gráfico antropométrico permite seleccionar una única métrica y los períodos 7 días, 15 días, 30 días, mes pasado o personalizado.
- Valores atípicos requieren confirmación antes de guardar.

### 14.2 Check-in

- Validar que la asignación exista y pertenezca al paciente autenticado.
- Si es ajena o inválida, responder sin revelar datos.
- Si está vencida, explicar y volver al portal.
- Si ya fue completada, impedir segunda respuesta.
- Confirmación neutral: “recibido/registrado”; no sugerir diagnóstico ni interpretación.
- Accesibilidad completa de escalas, switch, errores y submit.

### 14.3 Contenido sincronizado

- Estado actual: simulado y validado en Fase 2.2.
- Recursos y recetas publicados por su nutricionista asignado y pertenecientes al mismo consultorio.
- El inicio muestra una vista previa acotada de recursos y ofrece acceso a una biblioteca completa con búsqueda; no oculta contenidos publicados por límites artificiales.
- Borradores y contenido retirado nunca se muestran al paciente.
- El cambio de estado se refleja sin recargar la página dentro de la sesión mock.
- Plan y recomendaciones vigentes.
- La reasignación de profesional revoca inmediatamente el acceso clínico del profesional anterior. El nuevo profesional recibe únicamente el contenido transferido mediante una acción explícita y autorizada; no hereda automáticamente datos anteriores.

## 15. IA embebida: política y requisitos

### 15.1 Principio

La IA se inserta dentro de una tarea concreta; no se usa un chat genérico como arquitectura principal.

### 15.2 Niveles de autonomía

| Nivel | Comportamiento | Uso aceptable |
|---|---|---|
| 0 | Consulta y explicación. | Ayuda contextual, sin cambios. |
| 1 | Genera borrador. | Recetas, resúmenes, reportes y mensajes. |
| 2 | Propone una acción. | Sugiere plan, etiqueta o seguimiento. |
| 3 | Ejecuta sólo con confirmación. | Crear entidad o enviar contenido revisado. |
| 4 | Automatización reversible preautorizada. | Recordatorios de bajo riesgo con reglas claras. |

### 15.3 Prohibiciones

- No diagnosticar ni prescribir autónomamente.
- No publicar o enviar contenido clínico sin aprobación profesional.
- No mezclar datos entre tenants.
- No entrenar modelos con datos clínicos por defecto.
- No ocultar fuentes, incertidumbre o autoría asistida.
- No ejecutar acciones irreversibles en modo autónomo.

### 15.4 Auditoría de IA

Conservar propósito, modelo/versión, fuentes utilizadas, salida, campos inciertos, costo, aprobador y versión final. Toda salida debe poder descartarse y existir una alternativa manual.

## 16. Reglas comerciales y datos mock actuales

Los nombres definitivos de los planes son Basic, Pro, Ultra y Custom. Sus precios deben poder administrarse y versionarse sin reescribir el historial de suscripciones.

Los siguientes valores sirven para la demostración y no constituyen una política comercial definitiva:

| Plan | Precio mock mensual | Almacenamiento mock |
|---|---:|---:|
| Basic | ARS 30.000 | 1 GB |
| Pro | ARS 60.000 | 5 GB |
| Ultra | ARS 100.000 | 15 GB |
| Custom | ARS 200.000 | Flexible |

Los importes de la tabla son sólo ejemplos. Antes de producción, definir moneda, impuestos, actualización, límites, prorrateo, período, reembolsos y tratamiento de cambios de plan.

## 17. Formularios y validación

- Preferir React Hook Form + Zod.
- Normalizar email a minúsculas y trim.
- Validar campos obligatorios antes de mutar estado.
- Mostrar mensajes específicos y recuperables.
- No cerrar un modal ante error.
- Deshabilitar doble submit y diseñar idempotencia para backend real.
- Fechas de entrada locales; persistencia en ISO con zona horaria definida.
- Archivos: tipo, tamaño, antivirus, URL firmada y política de retención.

## 18. Testing y definición de terminado

### 18.1 Frontend

- Lint sin errores.
- Typecheck sin errores.
- Tests Vitest/Testing Library en verde.
- Build de producción exitoso.
- Flujos por rol y aislamiento cubiertos.
- Estados vacío, error, sin permiso y éxito verificados.
- Prueba por teclado de formularios y modales.

### 18.2 Backend

- Reset de base reproducible.
- pgTAP en verde.
- Lint de esquemas `api`, `app`, `security` sin errores.
- Tipos generados alineados con migraciones.
- Pruebas negativas cross-tenant y de privilegio mínimo.
- RPC transaccional, idempotente cuando corresponda y con auditoría.

### 18.3 UI

- Comparar contra `/design-system` en desarrollo.
- No introducir hex aislados si existe token adecuado.
- Validar desktop y mobile según rol.
- Verificar contraste, foco, targets, labels, overflow y textos largos.
- No romper flujos existentes al realizar ajustes estéticos.

## 19. Convenciones de implementación

- Componentes UI reutilizables en `src/components/ui`.
- Componentes de dominio en `src/components/domain`.
- Layouts y rutas agrupados por rol en `src/app`.
- Tipos compartidos en `src/types`.
- Funciones puras de negocio en `src/lib`.
- Mocks y motor de reglas en `src/mocks`.
- El contrato del proveedor mock reside en `src/app/mock-context.types.ts` y sus selectores de aislamiento son funciones puras en `src/mocks/selectors.ts`; la siguiente integración debe mantener esta separación al incorporar repositorios reales.
- Tokens globales en `src/styles/globals.css`.
- Evitar lógica clínica/comercial duplicada dentro de páginas.
- Contadores derivados no deben guardarse como fuente paralela de verdad.
- Usar IDs y firmas públicas que no permitan al cliente elegir arbitrariamente otro usuario o tenant.
- El contexto de acceso real se obtiene mediante `api.get_current_access_context()` y jamás acepta un `user_id`, rol u organización enviados por el cliente.

## 20. Checklist de migración

### 20.1 Código y entorno

- Copiar repositorio completo, historial Git y tags.
- Usar Node 24 y lockfile vigente.
- Verificar variables de entorno sin copiarlas a documentación o repositorio.
- Ejecutar `npm run verify:frontend` antes y después.
- Levantar Supabase local, aplicar migraciones y ejecutar `npm run verify:database`.

### 20.2 Datos y seguridad

- Migrar esquemas `app`, `security` y `api` sin exponer `app` en Data API.
- Confirmar RLS activo en todas las tablas.
- Confirmar revocación de DML directo para `authenticated`.
- Revisar funciones `SECURITY DEFINER`, `search_path` y grants.
- Ejecutar suites negativas cross-tenant y Platform Admin privacy.
- No migrar datos reales a un entorno de prueba sin anonimización.

### 20.3 Producto y diseño

- Comparar rutas y menús contra este documento.
- Copiar `globals.css` y catálogo `/design-system`.
- Verificar fuentes, tokens, iconos y Radix UI.
- Revisar tablas, modales, badges interactivos y responsive por rol.
- Mantener banner de modo demostración mientras se usen datos ficticios.

### 20.4 Integraciones futuras

- Email transaccional: invitaciones y recuperación, con expiración y revocación.
- Storage: archivos privados y URLs firmadas.
- Calendario: OAuth de mínimo alcance y operación degradada.
- Pagos: webhooks firmados, idempotencia y conciliación.
- IA: proveedor, región, retención, evaluación, costos y auditoría.

## 21. Preguntas obligatorias antes de una nueva función

1. ¿Qué rol la usa y qué problema concreto resuelve?
2. ¿Es clínica, administrativa, comercial o de plataforma?
3. ¿Qué datos necesita y cuál es la fuente de verdad?
4. ¿Quién puede crear, leer, editar, compartir, aprobar y eliminar?
5. ¿Cómo se impide el cruce entre consultorios, profesionales y pacientes?
6. ¿Qué ocurre vacío, cargando, con error, sin permiso, sin plan y sin conexión?
7. ¿Qué cambio requiere auditoría, confirmación o posibilidad de deshacer?
8. ¿Puede resolverse con reglas antes de usar IA?
9. ¿Cuál es el MVP y qué se deja explícitamente para después?
10. ¿Qué criterios de aceptación y pruebas demuestran que funciona sin romper lo anterior?

## 22. Referencias internas

- `docs/design-system.md`: tokens visuales resumidos.
- `docs/ui-principles.md`: principios por rol.
- `docs/security-model.md`: matriz RLS y privacidad.
- `docs/backend-architecture.md`: esquemas y límites.
- `docs/data-model.md`: relaciones e invariantes.
- `docs/api-contract.md`: vistas y RPC públicas.
- `docs/product-backlog.md`: priorización.
- `docs/feature-ideas-inbox.md`: recepción y clasificación de funciones futuras.
- `docs/environments-and-secrets.md`: contrato de ambientes, variables públicas y secretos.
- `docs/phase-3.2.2-commercial-data-decisions.md`: checkpoint obligatorio antes de persistir planes, precios, vencimientos, pagos e invitaciones.
- `docs/professional-patient-functional-spec.md`: decisiones aprobadas de perfil, invitaciones, planes, agenda, cobros, adherencia, marca y privacidad.
- `docs/Informe_competitivo_NutriSoft_2026-08-12.docx`: investigación competitiva.
- `/design-system`: catálogo interactivo disponible sólo en desarrollo.

## 23. Historial de decisiones

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-08-04 | Separar persistencia, seguridad y API en tres esquemas. | Privilegio mínimo y contrato controlado. |
| 2026-08-04/05 | Endurecer integridad, RLS, RPC, auditoría y pruebas negativas. | Evitar acceso transversal y mutaciones inseguras. |
| 2026-08 | Mantener frontend mock hasta cerrar foundation backend. | Preservar estabilidad visual y no integrar auth prematuramente. |
| 2026-08 | El Platform Admin sólo ve métricas agregadas y operación comercial. | Privacidad clínica por diseño. |
| 2026-08 | Reemplazar selects de estado por badges interactivos en español. | Mejor jerarquía, comprensión y actualización inmediata. |
| 2026-08 | Rediseñar el gráfico sin ejes Y y con filtros/tooltip dinámicos. | Claridad visual y lectura exacta por mes. |
| 2026-08 | Perfiles de nutricionistas en tarjetas, no fichas horizontales. | Mejor exploración y consistencia con el resto del producto. |
| 2026-08 | Empezar HITO Nutricionista antes de ampliar Paciente. | Validar primero el flujo profesional que genera contenido y acciones. |
| 2026-08 | Recursos y recetas son propiedad del profesional y se aíslan por asignación. | Privacidad multi-tenant y control de autoría. |
| 2026-08 | IA contextual, auditable y con aprobación humana. | Ahorrar tiempo sin delegar criterio clínico. |
| 2026-08-13 | Crear este documento maestro y `AGENTS.md`. | Conservar contexto entre sesiones, migraciones y colaboradores. |
| 2026-08-14 | Cerrar la Fase 2.2 con ciclo de alertas, trazabilidad de recomendaciones y publicación controlada de recursos/recetas. | Llegar a autenticación e integración real con contratos funcionales estables y verificables. |
| 2026-08-14 | Iniciar Fase 3.0, migrar a React Router 7.18.2, corregir Nano ID y formalizar ambientes/secretos. | Eliminar vulnerabilidades conocidas y evitar configuración insegura antes de conectar autenticación y datos reales. |
| 2026-08-14 | Crear una bandeja independiente para ideas futuras. | Conservar todas las propuestas sin interrumpir los bloques de arquitectura y seguridad activos. |
| 2026-08-14 | Extraer contratos y selectores puros del proveedor mock. | Reducir acoplamiento y preparar el reemplazo progresivo por repositorios Supabase sin reescribir las pantallas. |
| 2026-08-14 | Aprobar invitación + contraseña, recuperación por correo y PKCE como flujo inicial de autenticación. | Equilibrar claridad para usuarios, seguridad y compatibilidad con las invitaciones del producto. |
| 2026-08-14 | Implementar el primer corte local de Fase 3.1 y bloquear mocks dentro de sesiones reales. | Validar identidad y permisos sin confundir datos ficticios con información persistida. |
| 2026-08-14 | Conservar UUID históricos de auditoría sin claves foráneas mutables. | Permitir bajas de cuentas y organizaciones sin alterar ni borrar evidencia append-only. |
| 2026-08-14 | Incorporar autenticación E2E local reproducible al control integral. | Verificar login, permisos derivados de `auth.uid()`, logout y limpieza antes de declarar el corte local estable. |
| 2026-08-14 | Iniciar Fase 3.2 con una superficie Admin real y de sólo lectura. | Integrar persistencia gradualmente, validar contratos y preservar el prototipo estable sin habilitar escrituras prematuras. |
| 2026-08-14 | Autorizar `api.admin_organizations` únicamente con la identidad actual. | Evitar parámetros de usuario controlables y alinear la vista con el hardening de seguridad vigente. |
| 2026-08-14 | Habilitar `/admin/organizations` como directorio real de sólo lectura. | Completar una ruta útil con carga, error, vacío y filtros antes de incorporar datos comerciales o escrituras. |
| 2026-08-14 | Abrir un checkpoint de decisiones comerciales antes de persistir más campos. | Evitar convertir precios, planes, estados y ubicaciones ficticias en reglas reales por accidente. |
| 2026-08-14 | Confirmar Basic, Pro, Ultra y Custom como planes definitivos, con precios editables y versionados. | Permitir evolución comercial sin reescribir el historial ni fijar importes demostrativos. |
| 2026-08-14 | Estructurar ubicación y separar estado comercial de estado operativo. | Evitar datos ambiguos y desacoplar deuda/vencimiento del acceso técnico a la cuenta. |
| 2026-08-14 | Adoptar ciclo mensual con vencimiento manualmente editable y auditable. | Mantener flexibilidad operativa sin perder trazabilidad de cambios. |
| 2026-08-17 | Aprobar el recorrido perfil → invitación → primer plan como siguiente cierre funcional. | Construir primero la capacidad profesional que genera valor y contenido para el paciente. |
| 2026-08-24 | Unificar el seguimiento de peso de paciente y profesional, con períodos de 7 días, 30 días, 3 meses y todo. | Mantener una lectura coherente, neutral y verificable del mismo dato clínico autorizado. |
| 2026-08-24 | Separar el cambio del período del cambio frente al peso inicial declarado; permitir una línea suavizada opcional. | Evitar que el filtro o una ayuda visual alteren la referencia clínica inicial o se interpreten como pronóstico. |
| 2026-08-17 | Separar permisos owner de permisos clínicos y limitar no asignados a directorio básico. | Evitar que un cargo administrativo o la mera pertenencia al tenant expongan información clínica. |
| 2026-08-17 | Definir Agenda, Citas e Ingresos sobre una única cita y cobros manuales separados. | Evitar fuentes paralelas y permitir registrar múltiples medios sin procesar dinero. |
| 2026-08-17 | Aprobar plantillas genéricas versionadas, un plan principal, un complemento e historial. | Permitir cambios seguros sin reescribir planes ya entregados. |
| 2026-08-17 | Implementar en demo perfil contextual, invitaciones seguras y primer flujo de planes con snapshot, reemplazo e historial. | Validar el recorrido prioritario antes de diseñar RPC, email y persistencia real. |
| 2026-08-18 | Redefinir el plan alimentario como plantilla de 7–30 días, con hasta cuatro comidas opcionales por día y varios elementos por comida. | Reflejar la práctica profesional real y convertir la vista principal en una biblioteca editable, mostrando explícitamente qué pacientes acceden a cada plan. |
| 2026-08-18 | Convertir los días del plan en una organización vertical reordenable, duplicable y titulable. | Facilitar la construcción de planes extensos reutilizando jornadas completas sin perder numeración, claridad ni accesibilidad. |
| 2026-08-20 | Enlazar comidas con recetas publicadas mediante detalles separados para profesional y paciente. | Reutilizar el recetario sin exponer borradores, recetas retiradas ni contenido fuera del alcance autorizado. |
| 2026-08-20 | Cerrar el recorrido móvil Perfil → Pacientes → Planes → Recomendaciones con navegación inferior. | Mantener accesibles las funciones centrales y objetivos táctiles adecuados sin depender del sidebar de escritorio. |
| 2026-08-20 | Implementar Próximos pasos como listas individuales de 7–15 días con checks y comentarios. | Preservar el seguimiento personal y evitar mezclar respuestas al reutilizar una lista entre pacientes. |
| 2026-08-20 | Mostrar el plan completo al paciente y registrar cumplimiento por comida en su ficha profesional. | Convertir el plan en una herramienta cotidiana y dar al profesional una lectura accionable sin interpretar ausencia de respuesta como incumplimiento. |
| 2026-08-20 | Compactar la biblioteca de Recursos, permitir edición y exponer todos los publicados al paciente. | Escalar a decenas de contenidos sin perder legibilidad ni obligar a recrear recursos por errores menores. |
| 2026-08-20 | Implementar una supervisión general de check-ins con última respuesta, filtros, prioridad derivada y acceso al historial por paciente. | Permitir que el profesional detecte rápidamente respuestas que requieren atención sin convertir reglas orientativas en diagnóstico ni ampliar su alcance clínico. |
| 2026-08-20 | Convertir cada plan alimentario en una entidad exclusiva de un paciente y agregar comentarios revisables por comida. | Evitar cruces de progreso clínico al reutilizar estructuras y ofrecer una señal visible, contextual y no diagnóstica para las observaciones del paciente. |
| 2026-08-21 | Aprobar publicación explícita de nuevas versiones, ocultar planes retirados al paciente y mantener comentarios editables sin historial de contenido. | Evitar cambios silenciosos y confusión en planes dinámicos, preservando una interacción cotidiana simple. |
| 2026-08-21 | Revocar acceso al profesional anterior y transferir contenido sólo de forma explícita ante una reasignación. | Impedir herencia clínica automática y sostener el principio de mínimo acceso. |
| 2026-08-21 | Implementar el núcleo real versionado de planes individuales con publicación explícita y seguimiento por comida. | Llevar el flujo clínico prioritario a una base transaccional y aislada antes de habilitar pantallas reales. |
| 2026-08-21 | Habilitar la primera superficie clínica real limitada a planes alimentarios. | Validar el ciclo profesional–paciente con datos persistentes sin exponer rutas mock en sesiones reales. |
| 2026-08-21 | Integrar Agenda, Citas e Ingresos sobre una única cita y sincronización degradable con Google Calendar. | Evitar fuentes paralelas, conservar continuidad operativa y dar contexto económico y de seguimiento en la ficha profesional del paciente. |
| 2026-08-21 | Usar un único calendario Google por profesional como bloqueador de disponibilidad y reflejo de citas NutriSoft. | Evitar conflictos sin importar ni exponer eventos externos como datos clínicos. |
| 2026-08-21 | Configurar moneda por vínculo profesional-consultorio y resolver cancelaciones/ausencias dentro de un aviso in-app. | Mantener historial monetario consistente y reducir pasos administrativos en una situación sensible. |
| 2026-08-21 | Permitir precios puntuales por cita, generar Meet con Google conectado y notificar cambios de cita dentro del portal Paciente. | Adaptarse a la práctica profesional sin procesar pagos ni depender de email para informar cambios básicos. |
| 2026-08-21 | Implementar el núcleo local de Citas e Ingresos con agenda no solapable, movimientos manuales inmutables y notas clínicas separadas. | Tener una única fuente de verdad para las futuras pantallas sin exponer notas al owner, assistant ni Platform Admin. |
| 2026-08-21 | Habilitar la primera Agenda simulada del profesional con vista semanal y creación de citas. | Validar el recorrido de turnos y su control de solapamiento antes de ampliar a historial, notas e ingresos. |
| 2026-08-21 | Incorporar el historial simulado de Citas con filtros, estados y notas privadas. | Separar claramente la gestión clínica del turno de la Agenda y preservar que las observaciones sólo sean visibles para la profesional asignada. |
| 2026-08-21 | Incorporar Ingresos simulados con cobros manuales parciales por cita y métricas derivadas. | Reflejar lo efectivamente registrado sin procesar dinero ni duplicar datos entre turnos y facturación profesional. |
| 2026-08-21 | Mostrar en la ficha profesional del paciente sus últimos cinco turnos simulados, en modo sólo lectura y sin importes. | Dar contexto de atención y cobro sin crear una segunda vía de edición ni exponer información económica innecesaria. |
| 2026-08-21 | Homologar el espacio interior de controles con ícono a 44 px desde el borde izquierdo. | Evitar superposición visual y sostener legibilidad consistente en búsquedas, enlaces y filtros. |
| 2026-08-21 | Incorporar la resolución explícita de cobro al cancelar una cita o marcar una ausencia. | Evitar cobros automáticos y permitir decidir en contexto entre sin cargo, pendiente o importe parcial/extra. |
| 2026-08-21 | Mostrar novedades internas de citas en el portal Paciente y permitir marcarlas como vistas. | Informar cambios básicos sin depender de email ni exponer notas privadas o montos en el muro del paciente. |
| 2026-08-21 | Incorporar búsqueda en Planes alimentarios y limpieza rápida en Planes/Recetario. | Preparar bibliotecas profesionales para decenas de contenidos sin perder velocidad de operación ni legibilidad. |
| 2026-08-21 | Habilitar Configuración profesional simulada para moneda, precios sugeridos y base Google Calendar. | Preparar Agenda/Citas/Ingresos para operar con valores configurables sin fingir OAuth ni persistencia real. |
| 2026-08-21 | Incorporar gráfico de ingresos cobrados por paciente y separar métricas por moneda. | Dar lectura comercial útil al profesional sin mezclar monedas ni convertir importes históricos al cambiar configuración. |
| 2026-08-24 | Reordenar la navegación desktop del profesional alrededor del flujo Inicio → Pacientes → operación → contenidos → seguimiento. | Mejorar orientación cotidiana y agrupar las funciones según el modo real de trabajo del nutricionista. |
| 2026-08-24 | Reemplazar el desglose del gráfico de ingresos por paciente por una lectura consolidada de Cobrado y Pendiente. | Reducir ruido visual, mostrar el dinero efectivamente recibido junto al saldo por cobrar y conservar la separación obligatoria por moneda. |
| 2026-08-24 | Tomar la moneda configurada y habilitar filtros de serie en el gráfico de Ingresos. | Evitar un selector redundante y permitir comparar o aislar cobros y pendientes con una lectura más ordenada. |
| 2026-08-24 | Rediseñar la Agenda simulada con vistas Día, Semana y Mes. | Hacer legibles los turnos y ofrecer una navegación de calendario reconocible sin crear una segunda fuente de datos. |
| 2026-08-24 | Permitir editar o cancelar una cita desde Agenda sin borrado físico. | Evitar que el profesional quede atado al alta inicial, preservar citas, cobros y notas para trazabilidad. |
| 2026-08-25 | Confirmar explícitamente solicitudes de pacientes, confirmar altas manuales y conservar reprogramaciones como dos citas vinculadas. | Separar la aceptación profesional del guardado, evitar pérdida de historial y mantener Citas/Ingresos como fuente trazable. |
| 2026-08-25 | Cerrar el flujo de control de Citas con transiciones explícitas, filtros combinables y resolución obligatoria de cobro tras cancelación o ausencia. | Evitar estados ambiguos, cobros sin decisión y búsquedas lentas en historiales crecientes. |
| 2026-08-24 | Consolidar Recursos y Recetario en tres columnas desde desktop habitual. | Escalar bibliotecas de decenas de contenidos sin desperdiciar espacio ni sacrificar búsqueda, filtros o legibilidad. |
| 2026-08-24 | Ampliar Configuración profesional con disponibilidad semanal, pausa entre citas, bloqueos/vacaciones y reglas de cancelación/reprogramación. | Preparar una disponibilidad explícita por profesional antes de habilitar reservas públicas, sin alterar citas existentes ni simular la conexión Google. |
| 2026-08-24 | Habilitar solicitud autenticada de cita desde el portal Paciente en modo demo. | Validar el recorrido de disponibilidad y confirmación profesional sin abrir una ruta pública insegura, exponer precios ni habilitar confirmación automática. |
| 2026-08-24 | Incorporar seguimiento semanal de inactividad en Check-ins. | Permitir priorizar acciones a los 3, 5 y 10 días sin actividad sin duplicar pacientes ni interpretar clínicamente la ausencia de respuesta. |
| 2026-08-24 | Configurar el formulario de check-in de forma general por profesional-consultorio. | Mantener una experiencia consistente para los pacientes, conservar energía/adherencia como base comparable y habilitar preguntas complementarias sin crear reglas clínicas automáticas. |
| 2026-08-24 | Incorporar antropometría opcional y evolución neutral por paciente. | Dar seguimiento útil a profesionales y pacientes preservando origen, privacidad y confirmación ante variaciones inusuales, sin juicios ni proyecciones automatizadas. |
| 2026-08-24 | Incorporar el acceso del Paciente al recetario completo desde su inicio. | El muro conserva una selección breve y el paciente puede consultar todas las recetas publicadas que su nutricionista asignado autorizó. |
| 2026-08-25 | Compactar el directorio profesional de pacientes en cinco columnas priorizadas. | Permitir leer contacto, objetivos completos y estado de acceso sin ocultar identidad ni exigir desplazamiento horizontal en desktop habitual. |
| 2026-08-25 | Diferir Reportes e implementación de IA para una fase posterior. | Concentrar el cierre actual en recorridos operativos claros y en la transición segura desde demo a datos persistentes. |
| 2026-08-25 | Iniciar pasada UX de cierre del portal Profesional, priorizando recorridos cotidianos y microcopy de acción. | Eliminar acciones ambiguas y destinos configurables marcados erróneamente como futuros antes de persistir más módulos. |
| 2026-08-25 | Completar en demo Configuración profesional con franjas múltiples, avisos internos y solicitudes tardías sujetas a aprobación. | Reflejar una práctica real de horarios partidos sin confirmar cambios de citas ni prometer integraciones externas todavía. |
| 2026-08-25 | Permitir editar y eliminar bloqueos/vacaciones desde Agenda además de Configuración. | Mantener la disponibilidad operable en el contexto del calendario sin eliminar citas ni duplicar reglas. |
| 2026-08-26 | Preparar OAuth de Google Calendar mediante Edge Function, estado de un solo uso y refresh tokens cifrados fuera del frontend. | Conectar un calendario por profesional sin exponer credenciales, tokens ni detalles de eventos externos. |
| 2026-08-26 | Excluir sólo el callback OAuth de la verificación JWT automática y exigir estado corto, único y validado por servidor. | Google no puede adjuntar la sesión de NutriSoft al retorno; el estado firmado/persistido limita el callback sin abrir una API anónima general. |
| 2026-08-26 | Diferenciar cambio de calendario de cambio de cuenta Google. | Evitar que una selección anterior apunte por error a otra cuenta y no mover eventos existentes sin una decisión explícita. |
| 2026-08-26 | Habilitar la primera Agenda real local y su proyección externa de citas confirmadas. | Permitir operar citas reales sin exponer información clínica en Google ni volver la disponibilidad dependiente de un servicio externo. |
| 2026-08-26 | Habilitar invitación local real de pacientes desde el portal Profesional. | Crear el vínculo paciente–consultorio–profesional por servidor y usar el correo de invitación de Supabase sin exponer credenciales al navegador. Las invitaciones pendientes son idempotentes: repetir el correo no duplica pacientes ni vínculos. |
| 2026-08-26 | Normalizar enlaces de invitación y recuperación fuera del hash de rutas, conservando compatibilidad con enlaces locales ya emitidos. | Evitar que el router intercepte tokens de sesión y garantizar que la creación de contraseña se complete de forma segura. Los campos de contraseña incluyen control explícito para mostrar u ocultar el texto. |
| 2026-08-26 | Regenerar enlaces de activación pendientes exclusivamente en el entorno local de desarrollo. | Permitir probar una invitación ya creada sin duplicar al paciente ni exponer enlaces de autenticación en producción. En producción el flujo seguirá exclusivamente por correo transaccional. |
| 2026-08-26 | Confirmar la sesión de invitación antes de limpiar parámetros de retorno y aceptar callback por token o por código PKCE. | Evitar enlaces vaciados prematuramente y compatibilizar ambos formatos de Supabase Auth, conservando el enlace si no pudo validarse. |
| 2026-08-26 | Completar automáticamente una invitación de paciente al primer inicio de sesión autenticado. | El vínculo clínico, el perfil de aplicación y el portal quedan activos en una operación autorizada por `auth.uid()`, sin que el cliente pueda indicar otro paciente o tenant. |
| 2026-08-26 | Mostrar el acceso al Buzón de pruebas sólo tras solicitar recuperación en desarrollo local. | Facilitar la verificación local sin incorporar el servicio de pruebas ni enlaces de autenticación dentro de producción. |
| 2026-08-26 | Alinear la validación visible de contraseña con la política de Auth local. | Evitar rechazos opacos al activar o recuperar una cuenta: se exige 12+ caracteres con mayúscula, minúscula, número y símbolo. |
| 2026-08-25 | Registrar la personalización de marca por consultorio como capacidad futura exclusiva de Custom. | Ofrecer diferenciación comercial sin duplicar temas, comprometer accesibilidad ni mezclar identidades entre consultorios. |
| 2026-08-26 | Incorporar solicitudes de cancelación y reprogramación del paciente en modo demo. | Mantener la cita original hasta aprobación profesional, preservar trazabilidad y no exponer decisiones de cobro al paciente. |
| 2026-08-26 | Llevar el editor real de planes a paridad operativa con la demo y permitir plegado independiente por día. | Hacer manejables planes de 7–30 días sin perder edición, duplicado, reordenamiento, alternativas, información general ni visibilidad del cumplimiento y comentarios reales del paciente. |
| 2026-08-31 | Bloquear disponibilidad con ocupación externa de Google y crear Meet sólo para citas virtuales confirmadas. | Evitar importar contenido externo o alterar citas por automatización; una coincidencia se señala a la profesional para su decisión, mientras NutriSoft conserva la fuente de verdad. |
| 2026-08-31 | Habilitar consulta y solicitud de cambio de citas en el portal Paciente real local. | El paciente accede únicamente a sus propios turnos y al Meet autorizado; cancelar o reprogramar crea una solicitud pendiente sin cambiar la cita original. |
| 2026-09-01 | Separar Antropometría de Seguimiento y modelarla como tabla de revisiones profesionales con campos configurables. | El peso cotidiano del paciente conserva un recorrido simple, mientras la profesional registra mediciones clínicas completas por fecha sin forzar datos inexistentes ni limitar su práctica. |
| 2026-09-01 | Implementar en demo la pestaña profesional de Antropometría y los campos personalizados configurables. | Validar primero la lectura de una tabla amplia y un gráfico por métrica/período antes de definir persistencia real, permisos y migración de datos clínicos. |
| 2026-09-01 | Completar en demo la edición/corrección, notas, comparación de revisiones, archivo y orden de campos, y lectura móvil de Antropometría. | Convertir la tabla en una herramienta cotidiana verificable sin interpretar métricas, perder historia al archivar un campo ni forzar una tabla horizontal en móvil. |
| 2026-09-01 | Crear el núcleo real local de revisiones antropométricas profesionales. | Persistir datos clínicos separados del peso cotidiano, con RLS y RPC que sólo autorizan al nutricionista asignado, validan fecha no futura y valores numéricos positivos, sin abrir datos al owner, assistant ni Platform Admin. |

---

Decisión 2026-09-02: incorporar una cabecera profesional independiente de la del paciente, exclusiva de Custom en demo. Criterio de aceptación: guardar o quitar la imagen profesional no modifica la imagen del paciente; sólo aparece dentro del consultorio correspondiente y respeta el límite de 2 MB.

Decisión 2026-09-03: habilitar Antropometría profesional real local con revisiones independientes del peso cotidiano, campos propios por consultorio/profesional (alta, orden, archivo/reactivación), comparación, filtros y lectura móvil. RLS valida asignación clínica activa y membresía; Platform Admin queda excluido. Sólo el autor actualmente asignado corrige/elimina su revisión. Las RPC rechazan fechas futuras, valores vacíos/no numéricos, porcentajes superiores a 100 y campos ajenos; archivar preserva valores existentes. Nombre y unidad del campo se conservan para no reinterpretar historia. Auditoría de revisión sin valores ni notas clínicas.

### Seguimiento cotidiano REAL local — 2026-09-02

Implementado: acceso Seguimiento en ambos portales, peso por fecha con rechazo de futuro y reintentos idempotentes, check-in general con preguntas opcionales configuradas por profesional/consultorio y conservadas al asignar, listas de próximos pasos con checks/comentarios, frases aplicables a pacientes y resumen de inactividad. Antropometría permanece separada. No se trasladan datos ficticios de DEMO al backend.

Criterio aprobado: sólo acciones del paciente reinician actividad (respuesta de check-in, carga de peso, marcado de comida/tarea y comentarios). No cuentan login, abrir pantallas ni ediciones profesionales. Una fecha de peso anterior usa el momento real de carga como actividad. Sin acciones se cuenta desde activación del portal; sin portal no se inventa inactividad. Tramos excluyentes: 3–4, 5–9 y 10+ días. Son señales operativas, no diagnóstico. El resumen es calculado al abrir/actualizar; no es un envío automático semanal ni notificaciones por email.

Permisos: nutricionista con membresía y asignación activas; paciente sólo ficha propia y publicaciones de su profesional vigente. Platform Admin, owner no clínico y assistant sin acceso. Las listas mantienen vínculo permanente con su paciente al retirarse; duplicar crea tareas nuevas, no copia respuestas. Ediciones concurrentes de listas/frases requieren versión actual. Cambiar texto de tarea crea identidad nueva. Check-ins respondidos no se sobrescriben. Auditoría de pesos sin valores clínicos.

Aceptación local: fecha elegida preservada; futuro rechazado; RPC duplicada no duplica peso; escritura profesional no cuenta como actividad; paciente ajeno no lee/escribe; retirar lista corta acceso; lista con respuestas no se transfiere a otro paciente. Pruebas nuevas de DB transaccionales (rollback). UI responsive revisada en 390 px. No implica paridad total con DEMO: perfil inicial/peso objetivo, automatización de avisos y refinamiento del resumen semanal quedan como próximos incrementos.

### Ficha unificada y referencia inicial REAL — 2026-09-02

La ruta profesional de paciente real reúne Información básica, Plan alimentario (acceso al editor y cumplimiento existente), Historial de check-ins, Seguimiento de peso, Antropometría, Recomendaciones y Próximos pasos. Reutiliza módulos reales; no importa mocks ni convierte revisiones en pesos cotidianos. El directorio recupera nombre/contacto, ciudad/estado y «Abrir ficha». La ficha DEMO conserva su ruta y sus funciones previas.

Datos iniciales opcionales persistidos aparte: fecha de referencia, altura, peso inicial, cintura, cadera y peso objetivo. Paciente titular y profesional asignado pueden corregir la referencia; sólo el paciente declara/cambia el objetivo. Guardar no crea una medición cotidiana ni modifica revisiones. El cambio desde inicio usa último peso cotidiano menos referencia inicial, independiente del filtro. Se rechazan futuro, valores no positivos/fuera de límites y versiones concurrentes obsoletas. Auditoría sin valores. No hay diagnóstico, proyección ni importación de datos supuestos. Datos de contacto se consultan; edición de identidad no forma parte de este incremento.

### Ajuste REAL: comparación y navegación profesional

Antropometría REAL permite seleccionar hasta tres revisiones fechadas distintas en un bloque independiente del historial y del filtro del gráfico. La primera selección define la referencia; cada columna adicional muestra valor y diferencia neutral respecto de ella. Sin valor inicial se informa falta de referencia. Las filas dejan de incluir el checkbox Comparar y reducen su espacio vertical, manteniendo NOTA y edición/eliminación autorizadas. No cambia datos, permisos ni la comparación DEMO.

El menú profesional REAL adopta la disposición lateral y los iconos de DEMO en escritorio (desde 1024 px). En móvil/tablet ofrece accesos inferiores y menú completo modal con foco controlado. Sólo activa rutas reales conectadas; perfil, bandeja, citas, ingresos y reportes permanecen señalados como pendientes. Seguimiento conserva su nombre y destino real; no simula el Inicio DEMO. La navegación del paciente no cambia en este incremento. Aceptación: hasta tres selecciones sin duplicados, referencia según orden elegido, ausencia de desborde del documento y rutas activas sin MockProvider.

### Marca CUSTOM — primer corte REAL local

Implementado: habilitación comercial separada por consultorio, sin suscripciones ni cobros; edición exclusivamente por responsable activo. Configuración ofrece nombre, texto, contactos, diez paletas con preview, logo y dos cabeceras independientes. Guarda rutas de Storage privado, nunca base64. JPG/PNG/WebP hasta 2 MB; UI valida decodificación y máximo 20 megapíxeles. URL firmada de cinco minutos, renovación periódica; no se permite sobrescribir objetos. Guardar usa versión previa para rechazar cambios concurrentes. Retirar habilitación conserva configuración pero no la aplica. La sesión profesional corriente de Andrea no es responsable y no recibe permisos nuevos.

La identidad y colores se aplican automáticamente cuando la sesión tiene un único consultorio autorizado. Con varios se conserva identidad neutral; la selección contextual de marca multi-consultorio queda pendiente, aunque cada responsable puede editar sus consultorios desde el selector de Configuración. La cabecera profesional aparece en Seguimiento/inicio y la del paciente en su inicio. Contactos y texto se conservan en configuración; su presentación completa en cabeceras queda pendiente. No hay página pública ni dominio personalizado. Activación local explícita sólo para Clínica Bienestar, fuera de las migraciones reutilizables. Pendientes de cierre: validación visual autenticada como responsable y de imágenes en ambos portales, limpieza segura de archivos no usados y endurecimiento de procesamiento de imágenes antes de producción.

### Ingresos REAL — primer recorrido conectado

Implementado en local: menú Ingresos, listado de citas autorizado, filtros paciente/pago/modalidad/moneda, neto y pendientes, gráfico por período y popup con historial de movimientos. Cobros parciales/completos y reembolsos parciales/completos vinculados al original, fecha civil no futura, tope de saldo y request UUID para reintentos. No se modifica el estado operativo ni se procesa dinero. Las monedas no se suman. El período del gráfico no filtra el resumen general ni las filas, indicado en pantalla. Los meses negativos por devoluciones conservan su valor firmado.

Completado el 2026-09-03: indicadores proyectado/no cobrado por cancelación, corrección explícita atómica de un cobro (diferente de reembolso real), y gráfico con meses vacíos y negativos bajo cero. No se registran cobros ficticios permanentes como parte de las pruebas automáticas; las pruebas de base se revierten. Citas continúa pendiente de pantalla real, aunque comparte la misma fuente de movimientos.

### Ingresos REAL — cierre del incremento 2026-09-03

Usuario y permisos: operación financiera de citas por profesional autorizado, responsable o asistente dentro del alcance vigente; nunca paciente ni Platform Admin. Sin cambios de estado operativo, moneda histórica ni procesamiento externo de dinero. Cada corrección permite importe positivo, fecha, medio y nota opcional, sin exigir motivo. Conserva el original y agrega un par compensatorio inmutable; UI muestra el cobro efectivo como Corregido, no una devolución ficticia. Requiere revisión vigente, bloquea doble envío, no cierra ante error y rechaza cambios concurrentes. Un cobro con reembolsos no puede corregirse por debajo de lo devuelto ni fecharse después de una devolución existente.

Métricas siguen el criterio DEMO: Proyectado suma el importe completo de próximas citas solicitadas/confirmadas (puede incluir anticipos); No cobrado por cancelación incluye cancelaciones/ausencias resueltas sin cargo. Parciales forma parte de Pendiente, no es un total adicional. Se explica que los indicadores no se suman. Los filtros superiores afectan resumen/listado/gráfico; el período mensual afecta sólo al gráfico. Rango continuo incluye meses sin datos; personalizado valida orden y hasta 240 meses por visualización, sin borrar ni ocultar historial del listado. Cobrado neto negativo se dibuja bajo la línea cero, conservando signo y valor exacto. En móvil el scroll horizontal queda dentro del gráfico, con foco para teclado; el documento no desborda.

Aceptación: corrección y reintento sin duplicados, original conservado, reembolso máximo recalculado, vistas compartidas consistentes, permisos negativos, cálculos por fecha civil y meses sin datos. Pruebas de base con rollback y UI con mocks exclusivamente de test; no se cambian cobros locales del usuario para validación. Revisión del usuario pendiente; no equivale a producción publicada.

**Regla final:** si un cambio se ve mejor pero debilita claridad, accesibilidad, privacidad, consistencia o estabilidad, no es una mejora para NutriSoft.

### Precio de cita desde Ingresos REAL — 2026-09-03

Decisión del usuario: permitir corregir libremente el precio acordado desde el popup de Ingresos, separado del importe del cobro. Implementado «Editar precio de la cita»: importe desde cero, hasta dos decimales y límite técnico numeric(12,2), sin límite basado en el precio previo. Misma autorización operativa de la cita; paciente y Platform Admin excluidos. RPC con bloqueo, control de versión y auditoría del precio anterior/nuevo. No cambia fecha, modalidad, estado, moneda ni decisión sin cargo; no modifica movimientos. Bajar el precio bajo el neto cobrado está permitido y muestra la diferencia, sin devolución automática. Cobrar por encima del nuevo saldo sigue bloqueado: primero se corrige el precio. Aceptación: 10.000 → 15.000 permite cobrar 15.000; reducción bajo cobrado conserva dinero/historial; importes negativos y versiones desactualizadas se rechazan. Pruebas de base transaccionales y formulario sin registrar cobros del usuario.

### CUSTOM REAL — presentación de contactos y recarga, 2026-09-03

Implementado para consultorio único autorizado con CUSTOM habilitado: texto breve, nombre y contactos en la cabecera de inicio de ambos portales, aunque no tenga imagen. Teléfono y email válidos usan esquemas tel/mailto; otros textos se muestran sin convertirlos en enlaces arbitrarios. Disposición apilada en móvil, ajustable en escritorio, sin modificar datos ni permisos. Cabeceras independientes conservadas. Identidad neutral del paciente dice Portal del paciente. Recargar marca guardada descarta borrador incluso con versión sin cambios; guardar confirma éxito tras RPC. Aceptación automatizada: contactos sin imagen, cabeceras independientes, marca deshabilitada, permisos de edición y sesión multi-consultorio neutral. Pendiente revisión visual autenticada del editor y decisión de contexto multi-consultorio; no se considera cierre total CUSTOM ni preparación de imágenes para producción.

### Check-in configurable REAL — 2026-09-03

Check-in libre REAL (2026-09-04, migración 48): reemplaza la propuesta de frecuencia y asignación manual en la UI. Paciente autorizado responde cuando necesita, sin cadencia ni límite diario funcional. Inicio enlaza a completar check-in; seguimiento abre el formulario general guardado por su profesional. Sin biblioteca/preguntas activas se explica la indisponibilidad, sin inventar preguntas. Cada envío crea snapshot fechado independiente y evalúa reglas existentes; UUID de petición impide duplicación por reintento. Cambio de versión entre apertura y envío solicita reabrir. Registros legacy no se borran y conservan sus estados anteriores; nuevos envíos no dejan pendientes persistentes. Asignación técnica libre y respuesta se crean en una transacción, sin alterar una asignación histórica pendiente. Pruebas locales de varios envíos, idempotencia, versión y aislamiento; recorrido manual completo paciente pendiente.

Lectura profesional del historial: cada check-in es una tarjeta plegable independiente con fecha de respuesta (creación si pendiente), estado y cantidad de respuestas señaladas por reglas originales. Primera entrada visible abierta inicialmente; pueden abrirse varias. Cabecera diferenciada, preguntas en texto secundario, respuestas destacadas y comentario separado. No se cambia el formulario del paciente, datos ni reglas. Las señales históricas no representan necesariamente avisos pendientes: la resolución se gestiona en Bandeja.

Historial individual: filtros Todos/Hoy/7 días/15 días/Mes/Personalizado inclusivo, prioridad y orden por fecha aplicados a cada check-in del paciente seleccionado; sin resultados muestra estado vacío. La fecha de filtro es respuesta o creación si no fue respondido. Muestras locales explícitamente solicitadas para Laura: seis respuestas ficticias separadas del historial previo, etiquetadas en notas, con dos avisos de ejemplo; no se incorporan a migraciones de producción.

Claridad de historial (2026-09-04): el editor general sólo aparece en Configuración. La ficha del paciente muestra historial de respuestas, estados y enlace a configuración general; no muestra editor ni asignación. El módulo general de Check-ins conserva asignación manual por compatibilidad. Decisión aprobada: frecuencia diaria/semanal a elección del profesional, general para sus pacientes; automatización y selector de frecuencia todavía pendientes de implementación, no se presentan como activos.

### Bandeja REAL — 2026-09-04

Implementada localmente con vista API autorizada: pendientes (incluye reconocidas), en revisión, resueltas y todos; búsqueda por paciente y filtro de prioridad alta. Muestra motivo, fecha y respuesta del snapshot que activó campana, o valores legacy; acceso a ficha/check-ins. Reconocer conserva aviso pendiente; resolver permite nota opcional de 500 caracteres, conserva fecha e historial y no envía mensajes al paciente. Control de doble envío y errores dentro del diálogo. Sin avisos no se interpreta como ausencia de dificultades. Permisos reforzados de lectura y RPC: sólo nutricionista activo asignado, nunca owner no clínico, paciente o Platform Admin. Sin borrado ni importación de mocks. Contador global en navegación y recorrido manual paciente→profesional pendientes; pruebas de transiciones y privacidad locales con rollback.

Ajuste UX: sólo tres preguntas preestablecidas al iniciar una biblioteca sin guardar (energía, seguimiento del plan y descanso). Se elimina el selector redundante «Agregar sugerencia»; «Nueva pregunta» crea una entrada propia. Bibliotecas ya guardadas no se recortan ni se sobrescriben. Tarjetas compactas con tipo de respuesta, obligatoriedad y campana en una misma fila adaptable, conservando controles táctiles de 44 px; reglas sólo visibles al activar alerta. Sin cambios de permisos ni del historial.

Implementado en local (migración 46): biblioteca por nutricionista activo y consultorio, general para sus pacientes. Todas las preguntas, incluidas energía y adherencia, se pueden editar, incluir/excluir, ordenar y archivar; sugerencias iniciales editables, nuevas preguntas y respuestas escala 1–5, sí/no, opciones o texto breve. Se elige obligatoriedad. Archivar conserva historia. Esta decisión reemplaza la obligatoriedad fija de energía/adherencia para nuevas asignaciones después de guardar la biblioteca; DEMO y formularios legacy conservan su flujo anterior.

Campana BellRing con explicación visible y máximo dos preguntas con alerta (se permite cero), validado también en servidor. Escala usa umbral explícito; opciones/sí-no usan valores elegidos. Texto libre no genera interpretación automática. Una respuesta que coincide crea aviso consolidado CUSTOM_CHECKIN y prioridad alta en Check-ins, con respuestas señaladas en historial; no es diagnóstico ni aviso de emergencia. La Bandeja REAL completa sigue pendiente.

Cada asignación conserva preguntas y reglas; editar biblioteca no altera formularios enviados ni respuestas. Biblioteca vacía puede guardarse pero impide nuevas asignaciones. Control de versión evita sobrescritura concurrente. Paciente sólo responde su asignación pendiente no vencida; Platform Admin no accede a contenido clínico. Aceptación: 122 pruebas frontend, 51 pruebas DB de este flujo y regresión seleccionada, build correcto; configuración revisada a 390 px sin overflow documental. No se guardaron preferencias de prueba del usuario. Recorrido manual completo con cuenta paciente permanece por revisar.

### Horarios y reglas REAL — 2026-09-03

Implementado en local para nutricionista activo por consultorio: franjas múltiples por día, zona horaria, pausas entre citas, bloqueos/vacaciones con nota y plazos de cancelación/reprogramación. Mismo editor en Configuración y bloque desplegable de Agenda. La identidad profesional deriva de auth.uid(); no se aceptan cambios de agenda de otro profesional, ni acceso de paciente o Platform Admin a esta configuración. Owner/assistant no reciben edición de preferencias profesionales por este incremento.

Sin configuración guardada no se imponen horarios ficticios. Las franjas sólo restringen al activar explícitamente la opción; bloqueos y pausas se aplican después de guardar. La UI distingue borrador de configuración vigente. Máximos técnicos: 42 franjas y 200 bloqueos, nota de 300 caracteres. Franjas dentro de un día, sin superposición; bloques con instantes absolutos, editados en la zona del dispositivo indicada. Guardar usa versión previa y bloqueo por profesional, sin modificar citas existentes. Un bloqueo que coincida con cita solicitada/confirmada del mismo consultorio no se guarda.

El servidor valida horario completo, bloqueos y pausa al insertar/mover/reactivar una cita activa, incluyendo aprobación de reprogramación. Cambiar notas, precio o datos no horarios conserva la cita aunque una configuración posterior haya reducido sus franjas. Una reprogramación rechazada revierte la transición original. La propuesta del paciente no reserva disponibilidad: se verifica al aprobar. La solicitud guarda el plazo vigente y si fue tardía; el profesional ve Fuera de plazo. El paciente puede consultar sólo los plazos de su cita y siempre puede pedir revisión tardía. No hay cambios ni cobros automáticos. Las solicitudes históricas no se reclasifican al cambiar las reglas. La sincronización posterior a aprobación incluye la cita nueva además de la original.

Aceptación local: 25 pruebas nuevas de base (incluyendo descanso, bordes de franja, pausa exacta, bloqueo conflictivo, zona, concurrencia por versión, aislamiento y solicitud tardía), regresión Agenda/Ingresos, formulario y avisos de paciente automatizados. Revisión móvil de franjas/bloqueos y anchos 390/768 px sin overflow documental; no se guardaron horarios de prueba para Andrea. Pendiente recorrido manual paciente→profesional con sesiones del usuario. Moneda/precios/duración predeterminados, avisos internos y resumen de configuración siguen pendientes de paridad REAL.

### Configuración REAL — organización y preferencias de citas, 2026-09-04

Configuración se organiza como un resumen fijo de lo esencial y secciones desplegables independientes: Agenda y reglas, preferencias de citas e ingresos, Google Calendar, Check-ins, Antropometría y Marca CUSTOM. Varias secciones pueden permanecer abiertas; abrir/cerrar no descarta borradores ni modifica datos. La estructura reduce longitud visual, conserva controles existentes y mantiene objetivos táctiles en móvil.

Implementado localmente para nutricionista activo por consultorio: moneda predeterminada (ARS, CLP, BRL, USD, MXN, COP, PEN, EUR o UYU), duración sugerida (15 a 90 min) y precios sugeridos separados para modalidad virtual y presencial. Guardar valida versión concurrente y deja auditoría sin valores de precio. Agenda precarga esos valores al crear una cita nueva y ajusta el precio sugerido al cambiar modalidad antes de guardarla; cada cita conserva su propia moneda e importe, ambos editables en los flujos autorizados. Cambiar preferencias nunca reescribe citas, cobros, reembolsos ni gráficos históricos.

### Mi perfil profesional REAL — 2026-09-04

Implementado localmente para nutricionista activo y su consultorio: el perfil separa identidad de cuenta (nombre completo, correo sólo de lectura y teléfono) de práctica contextual (especialidad, zona horaria y matrícula opcional). Especialidad sólo orienta la experiencia, no certifica; matrícula exige número, provincia/estado y país juntos, y no es verificada por NutriSoft. La práctica se guarda por consultorio; identidad no se duplica entre consultorios. Platform Admin, paciente, responsable no clínico y asistente no pueden consultar ni modificar este perfil mediante estas RPC.

El correo no se edita directamente: requerirá un flujo específico de verificación de correo antes de estar disponible. La sesión activa puede actualizar contraseña con confirmación local, mínimo diez caracteres y control para mostrar/ocultar durante la escritura; nunca se conserva ni muestra la contraseña previa. Guardar perfil valida versión concurrente y deja auditoría de presencia de campos, sin teléfonos ni matrícula. No se alteran pacientes, citas ni historiales existentes.
