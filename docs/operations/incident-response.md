# Respuesta A Incidentes Y Gate De Seguridad De SIGECO

Esta guía explica qué hacer cuando existe un acceso indebido, pérdida de datos,
archivo peligroso o caída del sistema. Está escrita para que Dirección y otra
persona técnica autorizada puedan seguirla sin depender de quien desarrolló
SIGECO.

Un incidente no se resuelve solamente “arreglando el sistema”. También hay que
detener el daño, conservar evidencia, comprobar la recuperación y aprender para
que no vuelva a ocurrir.

## Regla Principal

Ante una sospecha real:

1. **Detener el daño.**
2. **No borrar evidencia.**
3. **Avisar a Dirección.**
4. **Registrar horas, decisiones y responsables.**
5. **Recuperar en un entorno aislado antes de reabrir.**

No compartir nombres, teléfonos, diagnósticos, contraseñas, tokens, capturas
clínicas o archivos de pacientes por WhatsApp, correo personal o chats de
soporte.

## Responsables

| Responsabilidad | Persona o área |
| --- | --- |
| Declarar el incidente y decidir si SIGECO puede reabrir | Dirección |
| Coordinar personas, tiempos y comunicaciones | Dirección, como responsable del incidente |
| Revocar accesos, rotar secretos, revisar logs y recuperar | Equipo técnico |
| Revocar sesiones de un empleado desde SIGECO | Super administrador |
| Confirmar que pacientes, visitas, Caja, inventario y adjuntos están completos | Responsables de cada área |
| Decidir comunicaciones a pacientes, proveedores o autoridades | Dirección con asesoría legal local |

Solo Dirección comunica externamente un incidente. El personal informa lo que
observó, pero no debe especular sobre causas, responsables o cantidad de
personas afectadas.

## Niveles De Severidad

| Nivel | Ejemplos | Acción inicial |
| --- | --- | --- |
| `SEV1` crítico | Posible exposición de datos clínicos, cuenta administrativa comprometida, pérdida amplia, ransomware o producción alterada | Avisar inmediatamente a Dirección, contener primero y suspender el uso afectado |
| `SEV2` alto | Teléfono perdido con sesión activa, acceso sospechoso limitado, adjunto peligroso aislado o caída prolongada | Dirección y equipo técnico inician revisión en 30 minutos |
| `SEV3` menor | Intento fallido sin acceso, error breve sin pérdida o evento que quedó bloqueado | Registrar, corregir y revisar en la jornada |

Estos tiempos son objetivos internos de respuesta, no plazos legales. Dirección
debe consultar asesoría legal local para determinar si corresponde notificar a
personas o autoridades y en qué plazo.

## Registro Mínimo Del Incidente

Asignar un identificador que no revele al paciente, por ejemplo
`INC-2026-07-001`, y registrar:

- hora de detección;
- quién informó y a quién;
- ambiente afectado;
- severidad y motivo;
- cuentas, servicios y tipos de datos posiblemente afectados;
- acciones de contención y hora;
- credenciales o sesiones revocadas, sin copiar sus valores;
- backup utilizado y resultado de la restauración;
- hora de recuperación;
- decisión de Dirección;
- mejoras pendientes, responsable y fecha.

Usar identificadores internos en la bitácora. Los datos clínicos permanecen en
SIGECO y no se copian al reporte técnico.

## Flujo General

### 1. Detectar Y Confirmar

- Anotar la hora exacta y conservar el mensaje o evento original.
- Revisar auditoría de SIGECO, logs de Vercel y eventos de Neon o Blob según el
  caso.
- No afirmar que hubo una filtración hasta tener evidencia.
- Si el daño todavía puede continuar, pasar directamente a contención.

### 2. Contener

- Cerrar las sesiones de la cuenta afectada.
- Desactivar temporalmente la cuenta si no se conoce el alcance.
- Revocar primero un secreto expuesto; después crear y configurar el nuevo.
- Bloquear el archivo u operación afectada.
- Pedir al personal que deje de usar el flujo afectado cuando continuar pueda
  aumentar el daño.

La contención puede interrumpir temporalmente el trabajo. Es preferible una
interrupción controlada a permitir que el incidente continúe.

### 3. Conservar Evidencia

- No borrar eventos de auditoría, cuentas, metadata o archivos relacionados.
- Guardar identificadores de deployment, request, backup y evento.
- Registrar quién obtuvo cada evidencia y cuándo.
- No descargar archivos sospechosos a teléfonos personales.
- No ejecutar herramientas de limpieza antes de conservar la evidencia
  necesaria.

### 4. Eliminar La Causa

- Corregir la vulnerabilidad o configuración.
- Rotar secretos y credenciales afectadas.
- Exigir cambio de contraseña a las cuentas involucradas.
- Revisar si el mismo problema existe en staging o producción.
- Ejecutar pruebas negativas antes de restaurar el servicio.

### 5. Recuperar

- Nunca restaurar directamente sobre producción para “probar”.
- Seguir [Backup y restauración de SIGECO](./backup-restore.md).
- Restaurar primero en un destino nuevo y aislado.
- Comparar pacientes, visitas, Caja, inventario, usuarios, auditoría y adjuntos.
- Dirección y responsables de área validan el resultado antes de reabrir.

### 6. Cerrar Y Aprender

Dentro de los cinco días hábiles siguientes, realizar una revisión sin buscar
culpables:

- qué ocurrió;
- por qué los controles no lo evitaron o detectaron antes;
- qué funcionó;
- qué demoró la respuesta;
- qué información faltó;
- acciones correctivas, responsable y fecha;
- si debe repetirse el simulacro.

Un incidente queda cerrado cuando Dirección acepta el riesgo residual y las
acciones pendientes tienen responsable y fecha.

## Playbook 1: Acceso Indebido O Teléfono Perdido

1. Dirección registra el incidente y la cuenta afectada.
2. Un super administrador abre `SIGECO → Usuarios → empleado`.
3. Usa **Cerrar sesiones**. Si existe duda sobre la cuenta, también la
   desactiva temporalmente.
4. Marca **Exigir cambio de contraseña**.
5. Revisa en Auditoría:
   - inicios de sesión;
   - accesos denegados;
   - cambios de rol;
   - consultas y acciones críticas realizadas durante la ventana.
6. Si la contraseña o un secreto pudo quedar expuesto, se rota.
7. El empleado recupera acceso solamente después de cambiar contraseña y
   confirmar el dispositivo.

Si una cuenta `super_admin` fue comprometida, otro super administrador realiza
la contención. Nunca debe existir una sola cuenta compartida entre empleados.

## Playbook 2: Pérdida O Alteración De Datos

1. Pedir al personal que deje de registrar cambios en el módulo afectado.
2. No corregir manualmente muchas filas ni ejecutar migraciones improvisadas.
3. Conservar auditoría, identificador de deployment y hora aproximada.
4. Seleccionar una copia anterior al daño.
5. Restaurar en una base nueva y aislada.
6. Verificar los dominios y archivos con el manifiesto.
7. Determinar qué cambios válidos ocurrieron después de la copia.
8. Dirección decide entre:
   - recuperar el sistema completo;
   - recuperar solamente registros comprobados mediante un proceso técnico;
   - continuar en modo manual hasta contar con evidencia suficiente.
9. Reabrir solo después de la validación por áreas.

## Playbook 3: Malware O Archivo Sospechoso

1. No abrir, reenviar ni descargar el archivo en otro equipo.
2. Identificar el adjunto por su ID técnico, no por datos del paciente.
3. Revocar accesos a la cuenta que lo subió si existe comportamiento
   sospechoso.
4. Si detener el riesgo exige eliminar el contenido, Dirección autoriza la
   eliminación controlada solamente después de conservar la evidencia técnica
   necesaria. La metadata y auditoría permanecen.
5. Revisar archivos relacionados y logs del Blob Store.
6. Si el archivo se abrió en un equipo, aislar ese equipo de la red y solicitar
   revisión profesional.
7. No describir la validación básica actual como un antivirus. Si existe riesgo
   real, usar un servicio antimalware profesional.

## Playbook 4: Indisponibilidad

1. Confirmar si falla SIGECO completo o solo un módulo.
2. Revisar Vercel, Neon y Blob Store sin copiar secretos en tickets.
3. No ejecutar varias veces migraciones o resets.
4. Si la caída impide atender, registrar temporalmente lo mínimo en un formato
   autorizado por Dirección y mantenerlo bajo custodia.
5. Restaurar según RTO y RPO cuando exista pérdida de datos.
6. Antes de volver, comprobar login, pacientes, visita, consulta, Caja,
   inventario y adjuntos.
7. Transcribir los registros manuales con responsable y referencia de origen;
   no destruir el original hasta reconciliarlo.

## Playbook 5: Secreto Expuesto

1. Tratar el secreto como comprometido aunque todavía funcione.
2. Revocarlo en el proveedor.
3. Crear uno nuevo con el alcance mínimo.
4. Configurarlo únicamente en el ambiente correcto.
5. Desplegar y comprobar el servicio.
6. Revisar el período entre exposición y revocación.
7. Buscar usos no reconocidos en Vercel, Neon, Blob o GitHub.
8. Si apareció en Git, limpiar el historial mediante un procedimiento
   autorizado; no hacer `force-push` sin coordinar a todo el equipo.

Consultar también
[Permisos, privacidad, logs y secretos](./permissions-privacy-secrets.md).

## Simulacro Local

```bash
pnpm security:incident:drill:local
```

El simulacro:

1. crea una base local aislada con datos sintéticos;
2. crea dos sesiones para un empleado ficticio;
3. simula la pérdida de un teléfono;
4. revoca ambas sesiones y exige cambio de contraseña;
5. registra detección y contención en auditoría;
6. comprueba que la auditoría no pueda modificarse;
7. elimina la base temporal;
8. ejecuta el simulacro cifrado de backup y restauración de la Tarea 7;
9. guarda tiempos y resultado en `.data/incident-evidence/`.

No usa pacientes reales ni modifica `salud_intercultural_dev`, staging o
producción.

## Gate Técnico Local

Después del simulacro:

```bash
pnpm security:gate:local
```

Este comando exige:

- ambiente y base local correctos;
- documentos y workflows de las Tareas 1–8;
- evidencia de incidente menor a 90 días;
- sesiones revocadas y auditoría protegida;
- restauración con migraciones y adjuntos;
- pruebas de permisos, privacidad, secretos y gate;
- cero vulnerabilidades altas o críticas conocidas.

Un resultado local correcto imprime `taskImplementationApproval=true` y
`productionApproval=false`. El primer valor confirma que Dirección aprobó el
runbook y el funcionamiento del gate de esta tarea. El segundo mantiene
bloqueada la producción hasta comprobar todos los controles remotos.

La evidencia de esa decisión está en
[`task-8-approval.json`](../project/security-gate/task-8-approval.json). El gate
la valida y rechaza cualquier registro que intente convertir la aprobación de
la tarea en una autorización de producción.

## Gate De Producción

El gate solo puede aprobarse cuando todos estos puntos tienen evidencia:

| Control | Evidencia requerida | Estado actual |
| --- | --- | --- |
| CI obligatorio | Cinco jobs aprobados y branch protection en `staging` y `main` | Pendiente remoto |
| Staging aislado | Siete roles QA, headers, comunicaciones bloqueadas y base/storage separados | Pendiente de cierre |
| Auditoría | Migración aplicada y acciones críticas verificadas remotamente | Pendiente remoto |
| Usuarios y sesiones | Accesos negativos y revocación comprobados en staging | Pendiente remoto |
| Privacidad y secretos | Propietarios, rotación y límites por rol confirmados | Pendiente de Dirección y remoto |
| Adjuntos | Blob clínico privado y permisos negativos comprobados | Pendiente remoto |
| Recuperación | Backup real cifrado restaurado fuera de producción | Pendiente remoto |
| Incidentes | Simulacro registrado y mejoras asignadas | Local aprobado; remoto pendiente |
| Hallazgos críticos | Ningún hallazgo crítico abierto | Local: ninguno confirmado |
| Aprobación de la Tarea 8 | Rol, fecha, alcance y decisión de Dirección | Aprobada el 2026-07-29 |
| Autorización de producción | Nombre, fecha y decisión de Dirección después de revisar todos los controles remotos | Pendiente |

La Tarea 8 queda terminada porque su runbook, simulacro, gate y aprobación
están comprobados. Esto **no autoriza** ampliar el uso clínico ni abrir una
nueva sucursal. Dirección autoriza producción solamente después de revisar las
evidencias remotas y aceptar los riesgos pendientes.

## Frecuencia

- Revisar el runbook cada seis meses.
- Ejecutar un simulacro técnico trimestral.
- Ejecutar otro simulacro después de un incidente real o cambio crítico de
  autenticación, storage, base, cifrado o proveedor.
- Revisar el gate antes de ampliar personal, sucursales o datos clínicos.

## Referencias

- [NIST SP 800-61 Rev. 3: respuesta a incidentes](https://csrc.nist.gov/pubs/sp/800/61/r3/final).
- [NIST Cybersecurity Framework 2.0](https://www.nist.gov/cyberframework).
- [CISA: Incident and Vulnerability Response Playbooks](https://www.cisa.gov/resources-tools/resources/federal-government-cybersecurity-incident-and-vulnerability-response-playbooks).
- [OWASP: Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).
- [OWASP: Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html).

## Límite De Esta Guía

Esta guía ayuda a responder de forma ordenada, pero no sustituye una auditoría
profesional, análisis forense, servicio antimalware ni asesoría legal sobre
datos clínicos.
