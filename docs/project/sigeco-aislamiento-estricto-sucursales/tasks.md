# Tasks — Aislamiento Operativo Y Continuidad Clínica Por Sucursal

Estado: plan creado el 2026-09-08 por decisión de Dirección.

Control de avance: [progress.md](./progress.md)

## Objetivo

Aplicar un modelo híbrido para una sola clínica con varias sucursales:

- una identidad única del paciente y maestros corporativos reutilizables;
- cada visita, expediente, movimiento y resultado pertenece a la sucursal donde
  ocurrió;
- médicos y enfermería pueden consultar antecedentes de otras sucursales en
  solo lectura, dentro de la información permitida a su rol, porque rotan entre
  sedes;
- los demás roles trabajan únicamente con la sucursal seleccionada, salvo una
  búsqueda exacta y controlada para identificar al paciente que está siendo
  atendido;
- actualizar el contacto maestro de un paciente o proveedor actualiza el dato
  vigente para toda la clínica, sin alterar las fotografías históricas.

El trabajo se divide porque una migración única sería difícil de verificar,
difícil de revertir y podría atribuir datos históricos a una sede incorrecta.
Cada tarea debe poder revisarse y cerrarse antes de iniciar la siguiente.

## Maestros Globales Permitidos

Pueden permanecer globales porque la organización es una sola clínica:

- `ClinicBranch`: catálogo técnico de sucursales.
- `InternalUser`: identidad, credenciales y condición de superadministrador de
  plataforma.
- `InternalSession`: sesión autenticada; la sucursal seleccionada no concede
  acceso por sí sola.
- `InternalUserBranch`: asignación del usuario, rol operativo y sucursal
  predeterminada.
- Definición técnica de módulos, permisos y dependencias versionada en código.
- `Patient`: identidad clínica única y datos de contacto vigentes. No contiene
  consultas, diagnósticos ni notas clínicas globales.
- `Supplier`: identidad legal y contacto general vigente del proveedor.
- `InventoryItem`: identidad canónica del producto, presentación, fabricante y
  código de barras; no contiene stock ni precio operativo global.
- Definiciones canónicas de servicios, estudios y métodos de pago. Su
  disponibilidad, precio y configuración viven por sucursal.
- Campañas corporativas, siempre relacionadas mediante asignaciones explícitas
  a las sucursales que participan.
- Metadatos técnicos de migraciones y mantenimiento.

El contenido institucional público que no contiene información de pacientes ni
operaciones queda fuera de la frontera de SIGECO. Las capturas de leads,
campañas, formularios y métricas operativas de Payload sí deben pertenecer a
una sucursal.

## Datos Que Deben Pertenecer A Una Sucursal

- Expediente local del paciente, visitas, fotografías de contacto,
  consentimientos firmados, notas, duplicados y fusiones operativas.
- Leads, intentos, recordatorios, asignación de campañas y atribución.
- Visitas, recepción, rutas, estados y tiempos por área.
- Consultas, diagnósticos, tratamientos, recetas, órdenes y configuración local
  de catálogos clínicos.
- Enfermería, signos vitales, aplicaciones, estudios, sesiones y adjuntos.
- Configuración local de productos, proveedores, servicios y métodos de pago;
  compras, lotes, stock, movimientos, ajustes, traslados y alertas.
- Ventas, pagos, Caja, egresos, conciliaciones, comprobantes y documentos.
- Seguimientos, reglas, candidatos, opiniones, reclamos e indicadores.
- Estado e historial de activación de módulos.
- Auditoría de toda operación de negocio.

## Regla De Visibilidad Del Paciente

| Rol | Identidad y contacto vigente | Historia de otra sucursal | Escritura |
| --- | --- | --- | --- |
| Médico | Puede buscar pacientes de toda la clínica | Sí, solo lectura, con motivo asistencial y auditoría | Solo en la sucursal activa |
| Recepción | Lista local; búsqueda exacta global durante una llegada | No | Identidad global y expediente de la sucursal activa |
| Administración | Lista local; acceso al paciente vinculado a una operación local | No | Contacto global y operaciones de la sucursal activa |
| Enfermería | Puede buscar pacientes de toda la clínica durante una atención | Sí, solo lectura, limitada a antecedentes de enfermería y órdenes necesarias, con motivo y auditoría | Solo en la sucursal activa |
| Dirección/superadministrador | Por defecto, contexto de una sola sucursal | No por el mero rol; requiere una función clínica o reporte explícito | Solo bajo el contexto seleccionado |

Recepción y Administración no disponen de una lista global navegable. La
búsqueda exacta por documento o teléfono sirve para evitar duplicados cuando el
paciente se presenta; no expone resultados aproximados de otras sedes. Al
vincularlo a la sede se crea `PatientBranchRecord`, que habilita el trabajo
local.

El acceso transversal de médicos y enfermería exige un paciente seleccionado,
un motivo de atención o una visita activa y genera un evento de auditoría. Cada
rol ve únicamente la información necesaria para su trabajo: Enfermería no
obtiene permisos de diagnóstico. Los registros de otra sede muestran origen y
fecha, son inmutables desde la sede actual y no se copian.

## Invariantes Obligatorias

1. Todo modelo operativo tiene `branchCode String` obligatorio, sin
   `@default`, y una relación restrictiva con `ClinicBranch`. Los maestros
   globales se mantienen en una allowlist cerrada y nunca almacenan saldos,
   consultas ni movimientos.
2. El servidor obtiene la sucursal desde la sesión y la asignación del usuario;
   nunca confía en un `branchCode` enviado por un formulario o URL.
3. Toda consulta, escritura, exportación, archivo, job y clave de caché
   operacional incluye la sucursal activa. La única excepción clínica es la
   lectura médica transversal, identificada y auditada explícitamente.
4. Un registro hijo solo puede relacionarse con un padre de la misma sucursal.
   PostgreSQL lo impide mediante claves foráneas compuestas.
5. La identidad maestra usa claves globales; los códigos, precios, números y
   configuraciones operativas usan `@@unique([branchCode, campo])`.
6. El rol operativo vive en `InternalUserBranch`. Ser superadministrador permite
   cambiar de sede, pero las consultas normales siguen limitadas a la sede
   seleccionada.
7. No existe una vista consolidada implícita. La historia clínica transversal y
   cualquier reporte multisucursal son modos explícitos, con permisos y
   auditoría diferentes de la operación normal.
8. PostgreSQL aplica RLS a las tablas operativas. El rol web no es propietario,
   no tiene `BYPASSRLS` y trabaja con `app.branch_code`, `app.user_id` y el rol
   efectivo dentro de una transacción. Las políticas de lectura médica
   transversal son distintas de las políticas de escritura.
9. Migraciones, backups y mantenimiento usan un rol separado y auditado; nunca
   reutilizan el rol de la aplicación web.
10. Ningún backfill inventa una sucursal. Los maestros se conservan una sola
    vez y sus operaciones se asignan por evidencia; los registros ambiguos
    bloquean el endurecimiento hasta que una persona responsable los resuelva.

## Estrategia De Migración Para Cada Dominio

Cada tarea de datos sigue el mismo contrato:

1. **Expandir:** agregar `branchCode` temporalmente nullable, índices y columnas
   de apoyo sin romper el runtime vigente.
2. **Escritura doble controlada:** toda creación nueva guarda la sucursal
   explícita; no se agrega ningún default temporal.
3. **Rellenar:** derivar la sede solo desde relaciones verificables y producir
   un reporte sin datos sensibles para lo ambiguo.
4. **Reconciliar:** corregir manualmente los pendientes con un script que exige
   una decisión explícita.
5. **Leer por sucursal:** cambiar queries, acciones, APIs, documentos y jobs.
6. **Endurecer:** `SET NOT NULL`, claves únicas locales, relaciones compuestas y
   checks de consistencia.
7. **Retirar compatibilidad:** eliminar columnas, claves globales operativas y
   caminos de lectura antiguos únicamente después de validar el dominio; no se
   eliminan las identidades maestras aprobadas.

Una migración no debe clonar, fusionar, borrar ni reasignar datos sensibles de
forma silenciosa.

## Validación Vigente

Durante cada tarea se ejecutan únicamente `pnpm lint` y `pnpm typecheck`, según
la decisión vigente del proyecto. Las pruebas se escriben junto con el cambio,
pero integración, build, RLS real y QA de navegador se ejecutan en la Tarea 17,
que es el cierre acumulado.

---

## Fase A — Frontera Técnica

## Tarea 1 — Contrato De Tenencia Y Detector Automático

**Prioridad:** P0. **Dependencias:** ninguna.

**Estado:** terminada el 2026-09-08. Evidencia:
[reporte de la Tarea 1](../task-reports/2026-09-08-tarea-1-contrato-tenencia.md).

**Objetivo:** convertir las reglas anteriores en un contrato verificable y
evitar que aparezcan modelos o defaults nuevos sin sucursal.

**Alcance:**

- Crear un inventario canónico `modelo -> tipo de alcance`: `global-master`,
  `branch-operation`, `platform-event` o `controlled-cross-branch-read`.
- Mantener una allowlist global cerrada con los modelos descritos arriba.
- Agregar un chequeo que inspeccione Prisma/DMMF y falle si un modelo operativo
  no tiene `branchCode`, lo declara nullable o contiene un default de sede; los
  maestros globales deben coincidir con la allowlist.
- Detectar en código productivo `"el-alto"`, `?? branch` y parámetros opcionales
  usados como fallback de una operación.
- Registrar excepciones temporales con responsable y tarea de eliminación; no
  aceptar excepciones permanentes sin decisión de Dirección.

**Criterios de aceptación:**

- El chequeo enumera todos los modelos Prisma y ninguna tabla queda sin
  clasificación.
- Agregar un modelo operativo sin sucursal hace fallar el chequeo.
- La migración `20260908120000_require_explicit_branch_code` queda incorporada
  como primer endurecimiento y no hay escrituras con fallback a El Alto.

**Commit sugerido:** `test(sigeco): enforce branch ownership contract`

## Tarea 2 — Contexto Central De Sucursal En Servidor

**Prioridad:** P0. **Dependencias:** Tarea 1.

**Estado:** terminada el 2026-09-09. Evidencia:
[reporte de la Tarea 2](../task-reports/2026-09-09-tarea-2-contexto-central-sucursal.md).

**Objetivo:** que toda operación reciba una sucursal autenticada desde un único
punto y no pueda elegir otra mediante datos del cliente.

**Alcance:**

- Definir `BranchRequestContext` con usuario, sucursal activa, asignación y rol
  operativo.
- Resolver el contexto desde sesión/cookie solo contra sucursales asignadas y
  activas.
- Crear wrappers obligatorios para páginas, acciones, APIs, exports y jobs.
- Rechazar peticiones sin sede con estado seguro; nunca elegir El Alto.
- Comparar cualquier `branchCode` informativo del formulario contra el contexto
  y descartarlo como fuente de autoridad.
- Hacer que el cambio de sucursal invalide cachés y datos precargados antes de
  renderizar la nueva sede.

**Criterios de aceptación:**

- Una cookie manipulada no permite entrar a una sede no asignada.
- Una acción con ID válido de otra sede responde no encontrado/denegado y no
  revela si el registro existe. La lectura clínica médica usa una ruta separada,
  solo lectura y auditada.
- No hay helper de servidor que seleccione una sede predeterminada cuando falta
  contexto.

**Commit sugerido:** `feat(sigeco): centralize authenticated branch context`

## Tarea 3 — Roles Y Permisos Por Sucursal

**Prioridad:** P0. **Dependencias:** Tarea 2.

**Estado:** terminada el 2026-09-09. Evidencia:
[reporte de la Tarea 3](../task-reports/2026-09-09-tarea-3-roles-permisos-sucursal.md).

**Objetivo:** conservar una identidad global y permitir roles operativos
distintos en cada sede.

**Alcance:**

- Mover el rol operativo desde `InternalUser.role` hacia
  `InternalUserBranch.role` o una tabla equivalente de membresías.
- Reservar en `InternalUser` únicamente la capacidad global
  `super_admin`/plataforma.
- Asignar automáticamente a los superadministradores todas las sucursales
  activas o en preparación, sin convertir esa asignación en acceso transversal
  dentro de una consulta.
- Actualizar sesiones, permisos, administración de usuarios, seeds y selector.
- Auditar alta, baja, cambio de rol y cambio de sede predeterminada.
- Permitir varias membresías activas únicamente a médicos y enfermería en
  rotación; los demás roles operativos conservan una sola sede activa.
- Al cambiar de sede, ofrecer al personal clínico `Trabajar en esta sucursal`
  o `Solo consultar`; únicamente una sede conserva capacidad de escritura.

**Criterios de aceptación:**

- Un médico o una enfermera puede rotar entre El Alto y Cochabamba con una sola
  cuenta y el mismo rol clínico en ambas sedes.
- Administración, Recepción y los demás roles operativos no pueden conservar
  dos sucursales activas simultáneamente.
- Al elegir `Trabajar`, la sede anterior permanece asignada y conserva sus
  datos, pero pasa a consulta; al elegir `Solo consultar`, ninguna escritura se
  habilita en la sede visitada.
- El superadministrador cambia de sede con una sola cuenta y ve únicamente la
  sede seleccionada.
- Desactivar una membresía revoca esa sede sin cerrar las demás asignaciones.

**Commit sugerido:** `feat(sigeco): scope operational roles by branch`

## Tarea 4 — Herramientas De Backfill Y Reconciliación

**Prioridad:** P0. **Dependencias:** Tareas 1-3.

**Objetivo:** disponer de un mecanismo único y seguro para particionar datos
históricos sin inventar ownership.

**Alcance:**

- Crear reportes agregados de `resuelto`, `ambiguo`, `huérfano` e
  `inconsistente`, sin nombres, teléfonos, diagnósticos ni contenido clínico.
- Derivar sucursal únicamente desde relaciones consistentes como visita, venta,
  sesión de Caja, compra, lote o membresía.
- Crear un formato de decisiones manuales por ID técnico y sucursal, validado
  contra `ClinicBranch`.
- Hacer los backfills idempotentes y con modo `--dry-run` por defecto.
- Bloquear `SET NOT NULL` mientras exista una fila no resuelta.
- Conservar conteos antes/después y checksums técnicos por dominio.

**Criterios de aceptación:**

- Dos ejecuciones producen el mismo resultado.
- El modo normal exige confirmación/flag explícito para escribir.
- Ningún reporte contiene PII ni datos clínicos.

**Commit sugerido:** `feat(sigeco): add branch ownership reconciliation tooling`

---

## Fase B — Partición De Dominios

## Tarea 5 — Identidad Global Y Expediente Local Del Paciente

**Prioridad:** P0. **Dependencias:** Tarea 4.

**Objetivo:** conservar una identidad única para toda la clínica y separar por
sucursal cada relación asistencial y fotografía histórica.

**Alcance:**

- Mantener `Patient` como identidad global con código, documento, nombre, fecha
  de nacimiento y contacto vigente.
- Crear `PatientBranchRecord` para registrar que una sede atiende al paciente,
  con estado local, número de ficha y primera/última atención.
- Mantener alias y reglas de duplicidad sobre la identidad global para no crear
  dos personas cuando viajan entre sedes.
- Asociar consentimientos firmados, contactos de atención y notas a la sucursal
  que los generó; calcular por separado el consentimiento corporativo vigente
  para continuidad clínica y los consentimientos locales de contacto/marketing.
- Guardar en cada visita una fotografía inmutable de nombre, documento,
  teléfono y dirección usados ese día.
- Actualizar el teléfono/dirección maestra una sola vez para toda la clínica,
  con historial de versiones y auditoría.
- Dar a Recepción una búsqueda exacta global durante el alta y a Administración
  acceso solo si el paciente ya está ligado a una operación de la sede activa.
- Mantener listas, búsquedas aproximadas y notas internas limitadas a
  `PatientBranchRecord` de la sede activa.

**Criterios de aceptación:**

- El paciente conserva un solo ID aunque se atienda en El Alto y Cochabamba.
- Actualizar su teléfono autorizado desde una sede actualiza el maestro global,
  pero no modifica visitas ni documentos históricos.
- Recepción de El Alto no puede navegar pacientes exclusivos de Cochabamba;
  puede encontrarlos por coincidencia exacta cuando se presentan y crear la
  relación local sin duplicarlos.
- Las notas y consentimientos locales no aparecen en otra sede salvo mediante
  la vista clínica médica autorizada.

**Commit sugerido:** `feat(sigeco): separate patient identity from branch records`

## Tarea 6 — Leads, Campañas Y Entradas Públicas

**Prioridad:** P0. **Dependencias:** Tareas 2, 4 y 5.

**Objetivo:** asignar toda captación a una sede antes de almacenar información
de contacto.

**Alcance:**

- Agregar sucursal a `Lead`, intentos, recordatorios, historial y atribución.
- Mantener una campaña corporativa global solo cuando tenga asignaciones
  explícitas a sus sucursales; sus resultados permanecen locales.
- Particionar los registros operativos equivalentes en Payload.
- Resolver la sede pública por hostname, landing/campaña firmada o configuración
  explícita del formulario; no confiar en un campo editable del navegador.
- Incluir la sede en idempotencia, deduplicación, métricas y exportaciones.
- Convertir el lead en la identidad global existente o nueva y crear
  `PatientBranchRecord` únicamente en la sede del lead.

**Criterios de aceptación:**

- Un formulario sin una sede verificable no almacena PII y devuelve un error
  controlado.
- Una campaña aparece en una sede solo si está asignada a ella; sus leads y
  métricas no se mezclan.
- Los dashboards de captación no agregan datos de otras sedes.

**Commit sugerido:** `feat(sigeco): scope leads and campaigns by branch`

## Tarea 7 — Visitas, Recepción, Rutas Y Tiempos

**Prioridad:** P0. **Dependencias:** Tarea 5.

**Estado:** terminada el 2026-09-09. Evidencia:
[reporte de la Tarea 7](../task-reports/2026-09-09-tarea-7-visitas-recepcion-rutas-tiempos.md).

**Objetivo:** materializar y asegurar la sucursal en todo el recorrido de una
visita.

**Alcance:**

- Mantener `Visit.branchCode` obligatorio y agregarlo a discontinuaciones,
  atribución, historial de estado, check-in, rutas, pasos, work items y eventos
  de tiempo.
- Relacionar la visita con la identidad global y con el
  `PatientBranchRecord` de la misma sede; usar relaciones compuestas en todos
  los hijos de la visita.
- Retirar parámetros opcionales de bandejas, contadores, detalles y reportes de
  recorrido/tiempos.
- Validar derivaciones y cambios de estado dentro de la misma sede.
- Particionar abandonos y trabajos abiertos.

**Criterios de aceptación:**

- Una visita y todos sus hijos comparten exactamente el mismo `branchCode`.
- PostgreSQL rechaza un hijo asociado a una visita de otra sede.
- El dashboard de El Alto permanece en cero al crear una visita activa solo en
  Cochabamba.

**Commit sugerido:** `feat(sigeco): enforce branch ownership across visits`

## Tarea 8 — Consulta, Recetas, Órdenes Y Catálogos Clínicos

**Prioridad:** P0. **Dependencias:** Tarea 7.

**Objetivo:** mantener cada expediente bajo su sucursal de origen y ofrecer a
los médicos continuidad clínica transversal sin permitir escritura remota.

**Alcance:**

- Agregar sucursal a consultas, versiones, diagnósticos, planes, resultados de
  propuestas, recetas, ítems, evoluciones, notas y órdenes clínicas.
- Mantener definiciones clínicas canónicas globales cuando sean iguales para
  toda la clínica y crear configuración/activación por sede; `DoctorOrder` y sus
  líneas siempre pertenecen a una sucursal.
- Convertir `ClinicalProfessionalProfile` en perfil por membresía/sucursal.
- Aplicar relaciones compuestas con paciente y visita.
- Mantener edición, precargas y autocompletados operativos en la sede activa.
- Crear una vista médica de continuidad que reúna cronológicamente expedientes
  de todas las sucursales, etiquete la sede de origen y sea solo lectura.
- Exigir paciente seleccionado, motivo asistencial o visita activa; registrar
  médico, sede solicitante, sedes consultadas, fecha y motivo.

**Criterios de aceptación:**

- Un médico asignado a la sede activa puede consultar la historia previa del
  paciente en otras sedes, pero no modificarla ni reutilizar sus IDs en una
  escritura local.
- Recepción y Administración no obtienen esa vista transversal. Enfermería no
  recibe la vista médica completa; su continuidad limitada se define en la
  Tarea 9.
- Una orden, receta o diagnóstico no puede enlazar paciente/visita de otra sede.
- Los perfiles profesionales mostrados en documentos corresponden a la sede.

**Commit sugerido:** `feat(sigeco): isolate clinical records by branch`

## Tarea 9 — Enfermería, Estudios, Adjuntos Y Sesiones

**Prioridad:** P0. **Dependencias:** Tareas 7-8.

**Objetivo:** cerrar las rutas de acceso clínico indirecto y permitir que los
antecedentes históricos necesarios formen parte de vistas transversales
controladas para médicos y enfermería.

**Alcance:**

- Agregar sucursal a estudios, signos vitales, aplicaciones, notas, resultados
  de tareas, paquetes de sesiones y usos.
- Agregar sucursal a adjuntos y permisos temporales de acceso.
- Proteger las cuatro APIs de archivos mediante contexto activo y relación
  compuesta. Una descarga remota solo se concede desde la vista clínica
  transversal autorizada para el rol, con grant corto y auditoría.
- Incluir sucursal en storage keys, grants, checksum lookup e idempotencia.
- Exigir visita de la misma sede cuando una aplicación descuente inventario.

**Criterios de aceptación:**

- Conocer `attachmentId` o `workItemId` de otra sede no permite metadatos,
  descarga ni inferir existencia fuera del flujo clínico autorizado.
- Un permiso temporal remoto queda ligado al profesional, su rol, paciente,
  sede activa y motivo; no habilita escritura y expira al cambiar de contexto.
- Enfermería solo puede consultar antecedentes de enfermería y órdenes
  necesarias; no recibe la vista diagnóstica completa del médico.
- Enfermería solo descuenta stock de la sede de la visita.

**Commit sugerido:** `feat(sigeco): isolate nursing and clinical files by branch`

## Tarea 10 — Maestros Comerciales Y Configuración Por Sucursal

**Prioridad:** P0. **Dependencias:** Tarea 4.

**Objetivo:** reutilizar identidades comerciales en toda la clínica sin
compartir stock, precios, condiciones ni operaciones.

**Alcance:**

- Mantener `Supplier` global con identidad legal, país y contacto general
  vigente; versionar sus cambios corporativos.
- Crear `SupplierBranchProfile` con activación, ejecutivo local, condiciones,
  plazos, referencias y notas comerciales propias de la sede.
- Mantener `InventoryItem` global con identidad canónica, presentación,
  fabricante y código de barras.
- Crear `BranchInventoryItem` con código/SKU local, disponibilidad, precio,
  descuento máximo, stock mínimo, ubicación y proveedor preferido.
- Mantener servicios, estudios y métodos de pago canónicos y crear tablas de
  activación, precio y configuración por sucursal.
- Hacer que Administración pueda actualizar teléfono/dirección general del
  proveedor para toda la clínica, con auditoría; las condiciones locales no se
  propagan.
- Asignar productos, proveedores y servicios existentes solo a las sedes
  confirmadas; no habilitarlos en Cochabamba por defecto.

**Criterios de aceptación:**

- Corregir nombre, fabricante o contacto maestro se refleja para toda la
  clínica y conserva historial.
- Cambiar precio, stock mínimo, disponibilidad o proveedor preferido en
  Cochabamba no altera El Alto.
- El mismo producto maestro puede usar SKU, precio y condiciones diferentes por
  sede.
- Una compra solo puede usar un proveedor/producto habilitado en su sucursal.
- Los catálogos sin decisión de ownership bloquean el endurecimiento.

**Commit sugerido:** `feat(sigeco): add branch configuration to global catalogs`

## Tarea 11 — Compras, Stock, Lotes, Traslados Y Alertas

**Prioridad:** P0. **Dependencias:** Tarea 10.

**Objetivo:** asegurar que toda unidad física y toda compra pertenezcan a una
sede.

**Alcance:**

- Endurecer compras, líneas, pagos, recepciones, documentos, lotes, ajustes y
  movimientos con relaciones compuestas.
- Eliminar `InventoryItem.currentStock` como fuente global; usar exclusivamente
  `BranchInventoryItem`/saldos locales.
- Convertir `InventoryAlert` en alerta por sucursal y calcularla desde el saldo
  local.
- Retirar todos los defaults de lectura en inventario y FEFO.
- Registrar los traslados como una operación corporativa autorizada con dos
  comprobantes locales inmutables: salida de origen y entrada de destino. Cada
  sede ve su comprobante; Dirección puede ver la conciliación completa.
- Verificar sucursal de Caja, compra, recepción, lote y proveedor en cada paso.

**Criterios de aceptación:**

- Ninguna operación de Cochabamba cambia stock, lotes o alertas de El Alto.
- FEFO solo consume lotes de la sede activa.
- Una compra no puede usar producto, proveedor, Caja o recepción de otra sede.
- La suma de movimientos locales reconcilia el saldo local sin columna global;
  ambos lados de un traslado deben conciliar antes de cerrarlo.

**Commit sugerido:** `feat(sigeco): enforce branch inventory ledger`

## Tarea 12 — Ventas, Pagos, Caja Y Documentos

**Prioridad:** P0. **Dependencias:** Tareas 5, 7, 10 y 11.

**Objetivo:** garantizar que dinero, comprobantes y documentos nunca crucen la
frontera de sede.

**Alcance:**

- Endurecer ventas, líneas, pagos, entregas, sesiones, conciliaciones, egresos y
  beneficiarios con sucursal y relaciones compuestas.
- Particionar numeración/series de comprobantes y documentos generados.
- Agregar sucursal directa a documentos generados y validar sus fuentes.
- Hacer obligatoria la sede en listados, detalles, impresión y descarga.
- Verificar que la sesión de Caja y todos los movimientos pertenezcan a la misma
  sede antes de cobrar o corregir.
- Retirar cualquier consulta opcional o agregación transversal de dinero.

**Criterios de aceptación:**

- No se puede cobrar una venta de Cochabamba usando Caja de El Alto.
- Un recibo o documento de otra sede responde no encontrado aun con ID válido.
- El cierre de Caja reconcilia exclusivamente movimientos de su sede.

**Commit sugerido:** `feat(sigeco): isolate sales cash and documents by branch`

## Tarea 13 — Seguimientos, Recordatorios, Opiniones Y Reportes

**Prioridad:** P0. **Dependencias:** Tareas 5-12.

**Objetivo:** completar el aislamiento de continuidad, calidad e indicadores.

**Alcance:**

- Finalizar y aplicar la migración de `FollowUpTask` y reglas supervisadas por
  sucursal.
- Agregar sucursal a intentos, historiales, templates, candidatos y eventos de
  revisión.
- Agregar sucursal a solicitudes de opinión, respuestas, casos y eventos.
- Incorporar sede en tokens públicos, idempotencia y responsables permitidos.
- Hacer que todos los reportes exijan una sola sucursal activa.
- Eliminar consolidaciones implícitas y proteger exportaciones.

**Criterios de aceptación:**

- Ningún seguimiento u opinión de Cochabamba aparece ni puede accionarse desde
  El Alto.
- Un token público solo opera dentro de la sede en la que fue emitido.
- Los KPI coinciden con el conteo directo de las tablas de una sola sede.

**Commit sugerido:** `feat(sigeco): isolate followups feedback and reports`

---

## Fase C — Configuración, Auditoría Y Base De Datos

## Tarea 14 — Módulos Y Auditoría Operativa

**Prioridad:** P0. **Dependencias:** Tareas 2-3 y 13.

**Objetivo:** separar configuración e historial sin perder auditoría global de
autenticación.

**Alcance:**

- Mantener la definición técnica de módulos en código y el estado de activación
  por sucursal.
- Hacer `ModuleActivationEvent.branchCode` obligatorio y resolver o clasificar
  los 13 eventos legacy sin sede; no atribuirlos automáticamente.
- Agregar `scope = platform | branch` y `branchCode` a auditoría.
- Exigir sucursal para toda acción de negocio y permitir `branchCode` nulo solo
  en eventos de plataforma definidos (login, mantenimiento, membresías).
- Registrar la lectura médica transversal como evento especial con médico,
  paciente, sede solicitante, sede de origen y motivo, sin copiar contenido
  clínico dentro del log.
- Agregar un `CHECK` que impida evento operativo sin sede.
- Mostrar auditoría operativa según sucursal activa; la auditoría de plataforma
  requiere permiso global explícito.

**Criterios de aceptación:**

- Apagar Caja en Cochabamba no cambia El Alto y genera historia local.
- No existe evento operativo nuevo sin sucursal.
- Un auditor de sede no ve contexto ni IDs de otra sede.

**Commit sugerido:** `feat(sigeco): scope module history and audit events`

## Tarea 15 — Barrido Completo De Aplicación Y Constraints

**Prioridad:** P0. **Dependencias:** Tareas 5-14.

**Objetivo:** eliminar las rutas residuales que puedan saltarse el aislamiento.

**Alcance:**

- Auditar todas las páginas, server actions, queries, APIs, exports, scripts,
  jobs, rutas públicas y acceso por ID.
- Retirar `branchCode?`, defaults, filtros condicionales y consultas globales de
  modelos operativos. Las consultas a maestros y la continuidad médica deben
  usar APIs distintas y reconocibles.
- Incluir sucursal en claves de caché, revalidación, idempotencia y locks.
- Agregar `@@unique([id, branchCode])` en padres y FKs compuestas en todos los
  enlaces operativos.
- Agregar checks para relaciones redundantes: paciente/visita, venta/pago,
  Caja/movimiento, compra/recepción/lote y documento/fuente.
- Añadir un chequeo SQL que liste cruces y falle con cualquier conteo distinto
  de cero.

**Criterios de aceptación:**

- El detector de la Tarea 1 no reporta excepciones operativas no documentadas.
- El chequeo SQL encuentra cero cruces y cero filas operativas sin sede.
- Buscar un ID de otra sede no revela su existencia fuera del flujo médico
  transversal o de una operación corporativa expresamente autorizada.

**Commit sugerido:** `fix(sigeco): close remaining cross-branch access paths`

## Tarea 16 — PostgreSQL Row-Level Security

**Prioridad:** P0. **Dependencias:** Tarea 15.

**Objetivo:** hacer que PostgreSQL rechace por sí mismo una lectura o escritura
indebida de otra sucursal aunque exista un defecto en la aplicación, conservando
la lectura clínica transversal autorizada.

**Alcance:**

- Crear un rol web sin ownership ni `BYPASSRLS` y un rol separado de
  migración/mantenimiento.
- Activar y forzar RLS en cada tabla operativa. Los maestros globales usan
  políticas propias de permiso y no se convierten en tablas de operación.
- Definir políticas `USING` y `WITH CHECK` contra `app.branch_code`,
  `app.user_id`, `app.effective_role` y un contexto temporal de continuidad
  clínica.
- Ejecutar cada unidad de trabajo Prisma en una transacción que establezca la
  sede con `set_config(..., true)` para evitar fugas en el pool.
- No dar bypass al superadministrador durante uso normal: debe seleccionar una
  sede como cualquier otra consulta. Solo médicos y enfermería obtienen
  `SELECT` remoto para el paciente, motivo y campos autorizados a su rol;
  `INSERT`, `UPDATE` y `DELETE` continúan ligados a la sede activa.
- Adaptar scripts, backups y jobs para iterar sedes explícitamente o usar el rol
  técnico auditado.

**Criterios de aceptación:**

- Una consulta deliberadamente sin filtro no devuelve filas de otra sede para
  roles distintos de médico o enfermería ni fuera de un contexto clínico
  autorizado.
- Un `INSERT` o `UPDATE` con otra sede falla por política de PostgreSQL.
- La autorización clínica remota solo devuelve los campos permitidos del
  paciente seleccionado, expira y no habilita escritura.
- Reutilizar una conexión del pool no conserva la sede de la transacción
  anterior.
- El rol web no puede desactivar políticas ni cambiar su rol.

**Commit sugerido:** `feat(sigeco): enforce branch isolation with postgres rls`

## Tarea 17 — Cierre Acumulado Y Despliegue Controlado

**Prioridad:** P0. **Dependencias:** Tareas 1-16.

**Objetivo:** demostrar el aislamiento completo antes de promover migraciones a
staging o producción.

**Alcance:**

- Ejecutar lint, tipos, pruebas unitarias, integración, migraciones desde cero,
  restauración de copia, build y gates de seguridad.
- Ejecutar una matriz negativa El Alto/Cochabamba para cada dominio y rol, más
  casos positivos/negativos de continuidad clínica médica.
- Probar cambio rápido de sucursal, pestañas simultáneas, reintentos, caché,
  archivos, exports, jobs y conexiones reutilizadas.
- Verificar conteos antes/después, saldos de Caja, stock, lotes y documentos.
- Preparar backup, plan de reversión y ensayo en staging con datos sintéticos.
- Requerir autorización expresa antes de migrar producción.

**Criterios de aceptación:**

- Cero filas operativas sin sede, cero relaciones cruzadas indebidas y cero
  excepciones no documentadas en el detector automático.
- Todas las pruebas negativas devuelven no encontrado/denegado sin filtrar PII;
  solo el médico con contexto asistencial puede leer historia remota.
- RLS bloquea accesos aun omitiendo intencionalmente el filtro Prisma.
- Dirección firma el resultado por dominio y por sucursal.
- Producción permanece sin cambios hasta recibir autorización explícita.

**Commit sugerido:** `test(sigeco): verify strict branch isolation end to end`

## Orden De Ejecución

Las tareas se ejecutan en orden. No se debe iniciar RLS antes de que todos los
dominios estén materialmente particionados y todas las rutas establezcan el
contexto de sesión. Tampoco se debe aplicar `NOT NULL` si el reporte de
reconciliación conserva filas ambiguas.

Las tareas 1–16 y el cierre técnico de la Tarea 17 están ejecutados. La
promoción permanece fuera del plan hasta provisionar las credenciales separadas
de staging, completar el QA humano con firma de Dirección y recibir una
autorización explícita independiente para producción.
