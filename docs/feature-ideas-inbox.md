# NutriSoft — Bandeja de ideas y funciones futuras

**Propósito:** conservar todas las ideas de producto sin incorporarlas antes de que la arquitectura, los permisos y los datos estén preparados.

## Cómo enviar una idea

No hace falta redactarla como especificación técnica. Puede enviarse en el chat como una frase, una lista, una captura o un ejemplo de otra plataforma. Cuando sea posible, ayuda incluir:

- qué debería poder hacer el usuario;
- quién la usaría: Admin, Responsable, Nutricionista, Assistant o Paciente;
- qué problema resolvería;
- un ejemplo de cómo debería sentirse o funcionar;
- si parece imprescindible para el lanzamiento o puede esperar.

Si falta información, la idea se conserva igualmente y queda marcada para discovery.

## Flujo de organización

Cada idea se transforma en una ficha con:

1. Problema y resultado esperado.
2. Usuario y permisos.
3. Datos necesarios y fuente de verdad.
4. Estados de carga, vacío, error, sin permiso y casos límite.
5. Riesgos de privacidad, seguridad y aislamiento multi-tenant.
6. Dependencias técnicas o comerciales.
7. Criterios de aceptación y pruebas.
8. Versión mínima y ampliaciones posteriores.

## Clasificación temporal

| Clasificación | Significado |
|---|---|
| Incorporar ahora | Es necesaria para cerrar el bloque activo y su base técnica ya está preparada. |
| Próxima ventana funcional | Es valiosa, pero conviene implementarla después del recorrido vertical real y seguro. |
| Antes de producción | Es obligatoria para operar de forma segura, confiable o legal. |
| Después del lanzamiento | Puede validarse con usuarios reales sin bloquear el primer lanzamiento. |
| Discovery pendiente | Requiere definir mejor problema, permisos, datos, alcance o viabilidad. |

## Bandeja

Las nuevas ideas se agregarán aquí después de ser recibidas y se moverán al backlog cuando tengan alcance y prioridad suficientes.

| ID | Idea | Usuario | Estado | Clasificación | Dependencias / notas |
|---|---|---|---|---|---|
| IDEA-001 | Buscador en la biblioteca de planes alimentarios. Debe buscar como mínimo por título y paciente vinculado, con estado vacío y opción de limpiar. | Nutricionista | Implementada en demo | Incorporar ahora | Busca por título, paciente, estado y texto administrativo relevante. |
| IDEA-002 | Revisar preventivamente todos los controles con ícono interno para conservar separación legible entre ícono y texto. | Todos los portales | Implementada en demo | Incorporar ahora | Padding izquierdo homogéneo de 44 px para iconos de 16 px y margen lateral de 12 px; Planes y Recetario usan limpieza rápida sin invadir el texto. |
| IDEA-003 | Personalización de marca por consultorio para plan Custom: logo, nombre visible, color principal mediante presets accesibles, cabecera, datos de contacto y futura página pública por profesional–consultorio. El portal Paciente hereda la misma marca. | Responsable del consultorio / Paciente | Implementada en demo | Migrar con storage privado en producción | Configuración por `organization_id`; JPG/PNG/WebP hasta 2 MB, cabecera recomendada 1600 × 600 px. No permite CSS, fuentes ni layouts arbitrarios. Conservar la configuración si la cuenta baja de plan, pero no aplicarla. Página pública sigue futura. |

## Regla de continuidad

Registrar una idea no significa comprometer su implementación inmediata. La función sólo entra en desarrollo cuando tiene permisos, datos, estados límite y criterios de aceptación definidos, y cuando el bloque técnico correspondiente está estable.
