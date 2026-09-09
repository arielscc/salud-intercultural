# Reconciliación De Tenencia Por Sucursal

Esta herramienta resuelve datos históricos usando solamente relaciones técnicas
consistentes. No acepta una sucursal por defecto y no consulta nombres, correos,
teléfonos, diagnósticos ni contenido clínico.

## Contrato Del Reconciliador

Cada adaptador de dominio entrega al motor únicamente:

- ID técnico del registro;
- sucursal actualmente guardada, si existe;
- códigos de sucursal obtenidos desde `visita`, `venta`, `sesión_caja`,
  `compra`, `lote` o `membresía`;
- una marca técnica de conflicto cuando la relación ya es inconsistente.

El motor produce las categorías `resuelto`, `ambiguo`, `huérfano` e
`inconsistente`, conteos antes/después y checksums SHA-256 deterministas de la
tenencia. No incluye fecha de ejecución, por lo que dos dry-runs sobre el mismo
estado producen el mismo reporte.

Los adaptadores de Pacientes, clínica, Enfermería, catálogo, inventario, Caja y
seguimiento se incorporan en sus tareas de dominio. La Tarea 4 incluye el
adaptador `internal-user-access`, necesario para reconciliar los bloqueos
históricos detectados por la migración de roles de la Tarea 3.

## Uso Seguro

El comando sin argumentos es siempre de solo lectura:

```bash
pnpm branch:reconcile
```

Para obtener el formato vacío de decisiones manuales:

```bash
pnpm branch:reconcile -- --template
```

El archivo contiene únicamente IDs técnicos y sucursales existentes:

```json
{
  "version": 1,
  "domain": "internal-user-access",
  "decisions": [
    {
      "recordId": "id_tecnico_sin_datos_personales",
      "branchCode": "cochabamba"
    }
  ]
}
```

Una decisión con dominio incorrecto, ID repetido, ID inexistente o sucursal que
no esté disponible en `ClinicBranch` detiene la ejecución.

Para simular las decisiones sin escribir:

```bash
pnpm branch:reconcile -- --decisions ./decisiones.json
```

Para escribir se exigen simultáneamente el flag y la confirmación literal:

```bash
pnpm branch:reconcile -- --decisions ./decisiones.json \
  --apply --confirm=APPLY_BRANCH_RECONCILIATION
```

La escritura ocurre en una transacción serializable. Las relaciones que ya
tienen el resultado esperado no se vuelven a modificar; al terminar, el
checksum real debe coincidir con el proyectado o toda la transacción se revierte.

## Gate Antes De `SET NOT NULL`

Antes de endurecer un dominio, su adaptador debe ejecutarse con:

```bash
pnpm branch:reconcile -- --assert-ready
```

El código de salida es distinto de cero mientras exista al menos un registro
`ambiguo`, `huérfano` o `inconsistente`, o una escritura derivada todavía no
aplicada. Este gate se ejecuta después del apply y sin reutilizar decisiones
obsoletas. Un reporte parcial nunca autoriza un `ALTER COLUMN ... SET NOT NULL`.

## Límites

- El reporte puede mostrar IDs técnicos y candidatos de sucursal para preparar
  decisiones, pero ningún dato de la persona o de la atención.
- Los superadministradores no requieren reconciliación manual en este adaptador:
  la migración de roles materializa todas las sucursales operables mediante una
  regla de plataforma explícita.
- En el esquema anterior a la Tarea 3, una decisión para un usuario ordinario
  conserva la sede elegida y retira las asignaciones incompatibles. En el
  esquema nuevo las asignaciones no elegidas se desactivan, no se borran.
- Una cuenta huérfana del esquema nuevo no puede inventar un rol a partir de la
  sucursal. Debe recibir primero un rol verificable; la transacción se detiene.
