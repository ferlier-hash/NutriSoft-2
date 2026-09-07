# NutriSoft — Decisiones previas al modelo comercial real (Fase 3.2.2)

**Estado:** fundamentos aprobados el 14 de agosto de 2026; restan políticas económicas antes de implementar cobros reales.

Este es el punto recomendado para sumar más datos al módulo Admin. Los valores actuales de precio y almacenamiento son demostrativos; no deben copiarse automáticamente a la base real.

## Decisiones confirmadas

1. Los planes definitivos se denominan `Basic`, `Pro`, `Ultra` y `Custom`.
2. Los precios actuales son ejemplos. Los precios reales deberán administrarse fácilmente y conservar historial/versionado.
3. Ciudad, provincia/estado y país se almacenan por separado.
4. El ciclo es mensual y conserva el día de vencimiento. La fecha de vencimiento también puede modificarse manualmente mediante una operación autorizada y auditable.
5. El estado comercial se separa del estado operativo:
   - comercial: al día, pendiente y vencido;
   - operativo: activo, suspendido y cerrado.

## Orden recomendado

1. Identidad y ubicación del consultorio.
2. Catálogo versionado de planes y capacidades.
3. Suscripción vigente del consultorio.
4. Vencimientos y registro manual de pagos.
5. Responsables e invitaciones.
6. Uso de almacenamiento medido.

## Decisiones que necesita producto

### Identidad y ubicación

- Recomendado: `nombre visible` obligatorio y `razón social` opcional hasta activar facturación fiscal.
- Recomendado: ciudad, provincia/estado, país y zona horaria como campos separados.
- Dirección postal completa: opcional mientras no sea necesaria para facturación o sedes.

### Planes y precios

- Basic, Pro, Ultra y Custom son nombres reales confirmados.
- Confirmar moneda inicial y si el precio incluye impuestos.
- Requisito aprobado: versionar precios; un cambio futuro no debe reescribir el historial de suscripciones anteriores.
- Recomendado: guardar capacidades del plan separadas del consumo real.

### Ciclo de cobro

- Aprobado: mes calendario conservando el día de vencimiento, no bloques fijos de 30 días.
- Definir qué ocurre con días 29, 30 y 31 al pasar a meses más cortos.
- Definir período de gracia y momento exacto de suspensión.
- Aprobado: separar estado comercial (`al_día`, `pendiente`, `vencido`) del estado operativo de la cuenta (`activa`, `suspendida`, `cerrada`).
- La fecha de vencimiento es editable por Platform Admin; cada modificación debe registrar valor anterior, valor nuevo, autor, fecha y motivo opcional.

### Pagos

- Definir métodos iniciales y si el monto puede editarse al registrar un pago.
- Definir si el comprobante será inicialmente texto, archivo o ambos.
- Recomendado: historial append-only con correcciones mediante contrapartidas, no edición destructiva.

### Invitaciones

- Definir vigencia del enlace, reenvío y revocación.
- Evitar duplicados por correo y consultorio.
- El correo real puede esperar; localmente se validará con Mailpit.

## Criterio de salida

La estructura de Fase 3.2.2 ya puede diseñarse. Antes de habilitar cobros reales todavía deben confirmarse: moneda, impuestos, regla para días 29–31, período de gracia y efecto de un cambio de precio sobre suscripciones existentes.
