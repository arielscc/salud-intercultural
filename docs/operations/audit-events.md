# Auditoría Append-Only De SIGECO

Esta guía explica cómo registrar y consultar acciones críticas sin convertir la auditoría en otra fuente de datos clínicos.

## Fuente De Verdad

`AuditEvent` vive en PostgreSQL mediante Prisma. Payload no administra este historial.

Cada evento contiene:

- actor y rol al momento de la acción;
- acción y tipo de registro;
- identificador del registro, cuando existe;
- resultado: `success`, `failure` o `denied`;
- fecha de la base de datos;
- `requestId` para relacionar el evento con una solicitud;
- contexto operativo pequeño y permitido.

El historial es append-only:

- el servicio de aplicación solo expone inserción y lectura;
- no existe pantalla para editar o borrar;
- el trigger `AuditEvent_prevent_update_delete` rechaza `UPDATE` y `DELETE` en PostgreSQL.
- un usuario con eventos históricos se desactiva, no se borra; la base restringe
  el borrado para conservar su identidad en el historial.

## Cómo Auditar Una Acción Nueva

Las nuevas server actions críticas deben ejecutarse con
`runAuditedAction` de `src/modules/audit/service.ts`.

La operación devuelve `auditedResult`. Solo se informa el identificador creado y metadatos operativos necesarios. Los `redirect` de éxito se hacen después de que `runAuditedAction` termine; un `redirect` dentro de la operación se considera un fallo de validación.

Ejemplo simplificado:

```ts
const result = await runAuditedAction(
  {
    permission: "inventory_write",
    action: "inventory.item.create",
    entityType: "inventory_item"
  },
  async (actor) => {
    const item = await createItem({ userId: actor.id });
    return auditedResult(item, { entityId: item.id });
  }
);

redirect(`/sigeco/inventario/${result.id}`);
```

Las páginas de detalle, listados, filtros y búsquedas validan permisos, pero no
generan auditoría por la navegación normal.

## Contexto Permitido

Se pueden guardar estados anteriores y nuevos, cantidades, montos en centavos, conteos, área operativa e identificadores técnicos.

No se deben enviar:

- contraseñas, tokens, cookies o encabezados de autorización;
- diagnósticos, síntomas, tratamientos o notas clínicas completas;
- texto libre de enfermería, ventas o seguimiento;
- archivos, adjuntos, imágenes, audio o video;
- el contenido escrito en una búsqueda de paciente.

`sanitizeAuditContext` elimina claves sensibles, limita profundidad, cantidad de campos y longitud de texto. Esta barrera no reemplaza la obligación de enviar únicamente metadatos.

## Consulta Y Permisos

La ruta `/sigeco/auditoria` requiere `audit_read`. Solo Dirección y super administrador tienen ese permiso.

- En escritorio muestra filtros por fecha, persona, acción y tipo de registro.
- En móvil muestra tarjetas simplificadas y paginación.

## Cobertura Actual Y Módulos Futuros

La implementación actual cubre acciones importantes de sesiones, pacientes,
visitas, consulta, enfermería, estudios, Caja, ventas, pagos, seguimiento e
inventario, usuarios, sesiones y adjuntos clínicos.

No generan eventos la búsqueda de pacientes, la apertura de fichas, los
listados, los filtros, la paginación ni la consulta del propio visor.

Los adjuntos generan eventos al subir, leer, eliminar y denegar acceso. No
generan eventos al mostrar la lista de metadata. Compras, reportes y
exportaciones todavía no tienen flujos funcionales; cuando se implementen
deben auditar cambios o entregas sensibles, no cada apertura de pantalla.

## Validación

- `src/modules/audit/service.test.ts`: exactamente un evento para éxito, fallo y denegación.
- `src/modules/audit/sanitize.test.ts`: secretos y texto clínico no se persisten.
- `src/modules/audit/audit.integration.test.ts`: PostgreSQL permite insertar y rechaza actualizar o borrar.
- `scripts/audit-coverage.test.ts`: ninguna server action crítica vigente queda fuera del servicio y las lecturas excluidas conservan autorización.
- `scripts/migration-files.test.ts`: la migración conserva la protección append-only.
