# Especificación funcional aprobada — Profesional y Paciente

**Fecha:** 20 de agosto de 2026  
**Estado:** decisiones aprobadas; perfil, invitación, planes multidía, cumplimiento por comida, próximos pasos, recomendaciones, recursos y recetas implementados en modo demostración. Persistencia real pendiente.  
**Fuente:** relevamiento del documento “Nuevas funciones-1” y respuestas del usuario en nueve bloques.

## 1. Secuencia de entrega

1. Completar perfil profesional.
2. Invitar al primer paciente.
3. Crear y asignar el primer plan alimentario.
4. Agenda, Citas e Ingresos.
5. Adherencia y antropometría ampliadas.

La primera secuencia constituye el cierre prioritario. Las capturas competitivas son referencias funcionales; toda UI conserva la identidad visual NutriSoft.

### Corte simulado disponible

- Perfil contextual editable con especialidad, zona horaria y matrícula opcional.
- Invitación de paciente pendiente por 7 días, revocable y renovable; el email real no está conectado.
- Biblioteca de todos los planes propios, borrador/publicación/archivo, asignación principal o complemento, snapshot e historial.
- Visualización del plan activo en el portal Paciente.
- Editor de 7 a 30 días; cada día admite hasta cuatro comidas opcionales y cada comida varios elementos con cantidad opcional.
- Organización vertical compacta de días con alta, copia profunda, baja y reordenamiento por arrastre o controles accesibles; numeración automática y título adicional opcional por día. Las cuatro acciones secundarias se presentan en el mismo renglón del día.
- Cada tarjeta y editor muestran los pacientes con acceso activo a la plantilla.
- Cada elemento de una comida puede vincular opcionalmente una receta publicada propia; profesional y paciente acceden a fichas de detalle separadas y autorizadas.
- Biblioteca de frases motivacionales con alta, edición, copia, eliminación y asignación múltiple, manteniendo una única frase activa por paciente.
- Recorrido principal revisado en móvil, tablet y escritorio; el profesional dispone de navegación inferior móvil para las cinco funciones centrales.

## 2. Perfil profesional

- Perfil contextual por consultorio.
- Obligatorios: nombre, apellido y email.
- Teléfono visible para administración y pacientes propios.
- Matrícula opcional, una por perfil contextual: número, provincia y país; sin entidad emisora ni verificación.
- Una especialidad seleccionable. La taxonomía de producto no equivale a certificación profesional.
- Zona horaria configurable.
- Onboarding guía, nunca bloqueo: perfil, horarios/modalidad, primer paciente, primer plan y enlace de reservas.

## 3. Invitación de pacientes

- Pueden invitar profesionales, responsables, Platform Admin y futura secretaria dentro de su alcance.
- La identidad global se reutiliza si el email ya existe; se crea una nueva vinculación, no otra cuenta.
- Estado inicial `pending`; aceptación por email configura contraseña, términos/privacidad y datos iniciales.
- El nombre precargado puede corregirse.
- Vencimiento 7 días; revocación; reenvío con token nuevo e invalidación del anterior.
- Menores/tutores quedan fuera de esta etapa.

## 4. Agenda, Citas e Ingresos

- Una cita es la fuente de verdad para calendario, historial e ingresos.
- Agenda se sincronizará con un único calendario de Google Calendar elegido explícitamente por el profesional mediante OAuth de alcance mínimo. Toda cita creada en NutriSoft se refleja en ese calendario. Los eventos existentes en el calendario elegido bloquean su franja en la disponibilidad de NutriSoft, pero no se convierten automáticamente en citas ni exponen su título, asistentes o descripción dentro de la plataforma. NutriSoft conserva su propia cita como fuente de verdad; si Google Calendar no está disponible, Agenda, Citas e Ingresos siguen operando localmente y la sincronización se reintenta de forma controlada.
- Estados: solicitada, confirmada, completada, cancelada por paciente, cancelada por profesional, reprogramada y ausente.
- Reservas públicas siempre requieren aprobación manual y usan enlace propio por profesional.
- Configuración profesional: paciente, duración, precio editable, modalidad, disponibilidad, descansos, feriados, bloqueos, vacaciones, recurrencia y reglas de cancelación/ausencia. Cada cita puede tener un precio diferente por paciente, duración o criterio profesional; Configuración ofrece valores sugeridos reutilizables, pero nunca impide el ajuste puntual.
- La moneda predeterminada se configura por vinculación profesional-consultorio en Configuración; una misma identidad puede usar una moneda distinta en otro consultorio. Catálogo inicial: ARS, CLP, BRL, USD, MXN, COP, PEN, EUR y UYU. El sistema conserva el código de moneda en cada cita y movimiento para que un cambio posterior de configuración no altere el historial.
- Duraciones iniciales seleccionables: 15, 30, 45, 60, 75 y 90 minutos. No se permite duración libre en la primera versión.
- No se permite solapamiento.
- En modalidad virtual, una vez conectado el calendario Google elegido, NutriSoft genera automáticamente el enlace de Google Meet junto con la cita. Si el profesional aún no conectó Google, la interfaz explica que debe hacerlo antes de confirmar una cita virtual con enlace automático; no inventa ni expone un enlace alternativo.
- Notas privadas sólo para profesional asignado; resumen para paciente separado.
- Cada cita admite un único campo de notas profesionales privadas en texto libre para el seguimiento de la consulta, incluidos observaciones y cómo se sintió el paciente. No son visibles para owner no clínico, secretaria, Platform Admin, otros profesionales no asignados ni el paciente. Si se desea comunicar algo al paciente, se guarda en un resumen separado y autorizado. Los próximos pasos se gestionan exclusivamente en su sección individual y no se duplican dentro de la nota.
- La sección Citas ofrece historial completo y filtros por paciente y por fecha/período.
- La ficha del paciente dentro del portal Profesional incluye un resumen no editable de sus últimos cinco turnos: fecha/hora, modalidad, estado de cita y estado de pago, sin mostrar importes. Es una vista derivada de la misma cita, no una fuente de datos separada.
- Búsqueda por texto completo dentro de registros autorizados.
- Avisos iniciales in-app y email. WhatsApp: futuro.
- El paciente recibe avisos dentro de NutriSoft ante cita nueva, cancelación o reprogramación desde la primera versión. Email permanece pendiente y WhatsApp es futuro.
- NutriSoft es fuente principal; Google Calendar/Meet será integración degradable. GHL continúa en evaluación.

## 5. Cobros manuales

- Estado de cita y pago independientes.
- Estados: pendiente, pagado, parcial, sin cargo y reembolsado.
- Una cita admite varios movimientos manuales; NutriSoft no procesa dinero.
- Importe editable por cita; métodos efectivo, transferencia u otro; nota opcional.
- Ingreso real por fecha de pago. Métricas: cobrado, pendiente, proyectado y perdido; realizadas, canceladas, ausencias y tasa de asistencia.
- Sin comprobantes, número de operación, recibos ni facturación fiscal en esta etapa.
- Movimientos y correcciones auditables.
- Una cita cancelada o una ausencia no genera cobro adicional automáticamente. Ambas generan una alerta operativa para que el profesional decida, por cita, mantener sin cargo, registrar un importe pendiente o cargar un importe parcial/extra. La decisión y cualquier movimiento quedan auditados.
- La alerta de cancelación o ausencia vive sólo dentro de NutriSoft en esta etapa. Su pop-up permite resolver el caso inmediatamente: sin cargo, pendiente o importe parcial/extra y, cuando corresponda, ingresar el monto en el mismo paso.

## 6. Plan alimentario

- Planes individuales propios; estados borrador, publicado y archivado.
- Estructura: entre 7 y 30 días; hasta cuatro comidas opcionales por día; varios elementos por comida; cantidades opcionales, alternativas, indicaciones, lista de compras y objetivos opcionales.
- La vista principal es una biblioteca de planes completos. Cada tarjeta muestra duración, volumen de contenido, su único paciente vinculado y comentarios nuevos; el detalle permite editar día por día.
- En el detalle, `Organización del plan` apila los días y permite agregar, quitar, duplicar y reordenar. El título general es editable y cada día conserva un subtítulo opcional separado de su número automático.
- Un plan queda ligado de forma permanente a un solo paciente. Para otra persona se duplica como borrador independiente, sin asignación, checks ni comentarios heredados.
- Asignar crea snapshot para el paciente.
- Un principal y un complemento opcional. El profesional conserva historial interno; el paciente sólo ve planes activos y nunca planes retirados.
- Los cambios sobre un plan asignado quedan en borrador hasta que el profesional pulsa `Publicar cambios`; la versión anterior continúa visible hasta ese momento.
- Recetas publicadas enlazables desde comidas.
- El paciente consulta todos los días en secciones desplegables y marca cada comida completada. La ausencia de marca permanece como `sin respuesta`.
- El paciente puede agregar, editar o vaciar un comentario opcional por comida mientras el ítem exista. Sólo se conserva el último texto, sin auditoría de contenido. El profesional recibe un contador no diagnóstico en Planes y lo revisa dentro del plan, con día, comida y fecha.
- La ficha profesional muestra porcentaje general y desglose diario de esas marcas.
- Importación PDF/Word: sólo genéricos; IA produce borrador con aprobación humana.
- Calorías/macros ocultos por ahora.

## 7. Adherencia, antropometría y experiencia

- Adherencia: cumplido, parcial, no cumplido y sin respuesta derivado.
- Corrección histórica del cumplimiento permitida con auditoría; comentario por comida privado, mutable y sin historial de versiones.
- Alertas por 3, 5 y 10 días sin actividad.
- Mediciones opcionales por paciente o profesional con autor/origen; peso objetivo autodeclarado.
- Check-in configurable por profesional; tendencia desde tres puntos, neutral y sin proyección.
- La supervisión general de check-ins muestra sólo pacientes clínicamente autorizados, una fila por paciente y su última respuesta. Incluye período (`Todos`, hoy, 7 días, 15 días, mes y personalizado), búsqueda/filtro por paciente, prioridad derivada y orden por paciente o fecha.
- La prioridad de check-in es orientativa: alta ante pedido de ayuda o puntajes 1–2; media ante un puntaje 3; normal en los demás casos. El acceso al historial abre la pestaña de check-ins de ese paciente.
- Biblioteca manual de frases motivacionales y mensajes personalizados; sin IA.
- Próximos pasos agrupados en una lista individual de 7–15 días, sin vencimiento por tarea ni orden manual. Una lista activa y un paciente por lista.
- El profesional crea, edita, aplica, desaplica, duplica y elimina; duplicar no hereda paciente, checks ni comentarios.
- El paciente marca tareas y agrega comentarios opcionales que ve su profesional asignado.
- El paciente dispone de una biblioteca completa y buscable de todos los recursos publicados autorizados; el inicio conserva sólo una vista previa.

## 8. Suscripción, marca y web pública

- La suscripción pertenece al consultorio.
- Branding sólo Custom: logo, color, cabecera, nombre, contacto y página pública.
- Usar 20–30 presets accesibles. Downgrade conserva configuración, pero deja de aplicarla.
- Página pública futura y modular por vinculación profesional-consultorio; estado `Próximamente`.
- Límites de Basic/Pro/Ultra/Custom: próxima decisión de producto.

## 9. Permisos

- Platform Admin: cero clínica; sólo operación comercial y agregados.
- Owner no clínico: equipo, directorio, agenda y cobros; sin clínica.
- Owner que también es nutricionista: clínica únicamente por asignación profesional.
- Nutricionista: clínica de asignados; no asignados sólo directorio básico.
- Secretaria: identidad básica, agenda, modalidad y cobro; sin clínica.
- Paciente: sus propios datos y exportación.
- Citas, pagos, planes, mediciones, permisos y asignaciones requieren historial/auditoría.
- Una reasignación revoca inmediatamente al profesional anterior; el nuevo sólo recibe contenido transferido mediante acción explícita.

## 10. Clasificación

- **Implementar:** perfil, invitaciones, planes, adherencia, antropometría, Agenda/Citas/Ingresos por etapas.
- **Próximamente:** página pública modular.
- **Futuro:** WhatsApp e IA de formateo de recetas.
- **En evaluación:** Google Calendar/Meet y GHL.
- **Fuera de esta etapa:** procesamiento de pagos, facturación fiscal y cuentas de menores/tutores.
