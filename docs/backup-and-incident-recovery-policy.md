# Nutrify — Política de backups y recuperación ante incidentes

## Estado y alcance

Política aprobada el 18 de septiembre de 2026 para preparar el piloto productivo. Define objetivos y controles obligatorios, pero no declara que existan backups remotos activos: staging está aprovisionado pero aún vacío y sin validar, y producción todavía no existe.

Aplica a la base PostgreSQL, Supabase Auth, objetos privados de Storage, Edge Functions, migraciones, configuración operativa y secretos necesarios para reconstruir Nutrify. Local usa exclusivamente datos ficticios y no forma parte del esquema de recuperación productiva.

## Objetivos aprobados

| Control | Objetivo inicial |
|---|---|
| RPO | Hasta 1 hora de datos perdidos como máximo |
| RTO | Servicio recuperado en hasta 4 horas |
| Backup de base | Automático, diario y retenido durante 30 días |
| Recuperación puntual | Habilitada cuando el plan contratado la soporte y configurada para cumplir el RPO |
| Copia de largo plazo | Una copia mensual, retenida durante 12 meses |
| Prueba de restauración | Mensual durante el piloto y antes de admitir datos reales |
| Ambiente de prueba | Proyecto aislado; nunca producción activa |

El RPO de una hora exige recuperación puntual o una alternativa automatizada equivalente. Si el proveedor o plan elegido no puede cumplirlo, producción no queda habilitada hasta aprobar explícitamente un objetivo diferente.

## Cobertura obligatoria

1. **Base y Auth:** esquema, datos, historial de migraciones, auditoría técnica y las identidades administradas por Supabase.
2. **Storage privado:** objetos finales y metadatos necesarios para reconciliarlos. El backup de PostgreSQL no sustituye el de los archivos.
3. **Aplicación:** revisión Git identificada, migraciones, Edge Functions y artefactos inmutables desplegados.
4. **Configuración:** inventario versionado sin valores secretos de dominios, URLs, buckets, Cron, Auth, SMTP, OAuth y observabilidad.
5. **Secretos:** almacenados en un gestor dedicado, recuperables o regenerables y excluidos de repositorios, documentos, logs y copias no autorizadas.

Cada ambiente usa proyectos, claves, buckets y copias independientes. Está prohibido restaurar datos clínicos productivos en local o staging sin un proceso de anonimización aprobado.

## Protección y acceso

- Cifrado en tránsito y reposo.
- Acceso por mínimo privilegio, limitado a responsables técnicos y de seguridad designados.
- Segundo factor obligatorio en cuentas con capacidad de respaldo o restauración.
- Registro de creación, restauración, exportación y eliminación cuando el proveedor lo permita.
- Copias de largo plazo separadas del ambiente productivo y protegidas frente a eliminación accidental desde la misma cuenta operativa.
- Nunca incluir secretos en tickets, chats, capturas, nombres de archivo ni evidencia de pruebas.

## Responsabilidades

- **Responsable de incidente:** clasifica severidad, coordina contención y autoriza reapertura.
- **Responsable técnico:** ejecuta backup, restauración, validaciones y eventual cambio de tráfico.
- **Responsable de seguridad:** controla accesos, preserva evidencia y determina rotación de credenciales.
- **Responsable funcional:** ejecuta smoke tests con cuentas ficticias autorizadas.

Una persona puede asumir más de un rol durante el piloto, pero cada prueba o incidente debe registrar nombre, fecha y decisiones. Los nombres concretos se asignarán antes de crear producción.

## Procedimiento de recuperación

1. Clasificar el incidente: disponibilidad, pérdida, corrupción, privacidad, autenticación o integración.
2. Contener con el menor impacto posible; suspender escrituras afectadas sin desactivar RLS.
3. Preservar logs y auditoría sin copiar contenido clínico a canales no autorizados.
4. Identificar revisión desplegada, último punto sano y pérdida máxima estimada.
5. Restaurar base y archivos en un proyecto aislado.
6. Verificar migraciones, Auth, Storage, Edge Functions, Cron y configuración.
7. Validar RLS y aislamiento: paciente ajeno, profesional no asignado, owner no clínico, assistant y Platform Admin deben continuar sin acceso clínico.
8. Comparar conteos agregados y referencias de archivos, sin exportar contenido clínico como evidencia.
9. Ejecutar smoke tests por rol con cuentas ficticias.
10. Rotar secretos si existió o se sospecha exposición.
11. Autorizar reapertura, registrar RPO/RTO real, impacto, causa, acciones y prevención.

Una restauración completa sólo se utiliza ante pérdida o corrupción. Una migración defectuosa se corrige preferentemente mediante una nueva migración compatible, porque restaurar descarta escrituras posteriores al punto elegido.

## Prueba mensual y evidencia

La restauración mensual debe comprobar, como mínimo:

- integridad del esquema y orden de migraciones;
- acceso de Auth y bloqueo correcto por rol;
- RLS y aislamiento multi-tenant;
- conteos agregados de organizaciones, usuarios, pacientes y recursos;
- reconciliación entre metadatos y objetos privados de Storage;
- disponibilidad de Edge Functions y trabajos programados;
- ausencia de secretos o datos clínicos en logs y evidencia;
- RPO y RTO efectivamente obtenidos.

El registro de prueba conserva ambiente, revisión Git, punto restaurado, responsables, inicio y fin, resultado, desviaciones y acciones correctivas. No conserva historias clínicas, respuestas, notas ni archivos de pacientes.

## Incidentes críticos

Una sospecha de acceso clínico indebido, cruce de tenant o exposición de credenciales privilegiadas es crítica. La superficie afectada se suspende hasta verificar aislamiento; se revocan o rotan credenciales y se preserva evidencia. La obligación y el plazo de notificación externa se determinarán con asesoría legal según jurisdicción y alcance antes del lanzamiento comercial.

## Criterio para habilitar producción

La política queda **aprobada**, pero el control permanece **no operativo** hasta que:

1. staging y producción estén separados;
2. el proveedor y plan permitan cumplir los objetivos aprobados;
3. base y Storage tengan backups automáticos monitoreados;
4. responsables y canal privado de incidentes estén designados;
5. una restauración aislada completa alcance RPO y RTO;
6. la evidencia sea revisada y aprobada;
7. exista una alerta operativa ante fallos de backup.

No se admiten datos clínicos reales antes de completar estos siete puntos.
