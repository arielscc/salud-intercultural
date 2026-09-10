# Tenencia Por Sucursal Del Recorrido De Una Visita

## Regla

`Visit` pertenece a una sola sucursal y enlaza tanto la identidad global
`Patient` como el expediente `PatientBranchRecord` de esa misma sucursal. El
recorrido no se copia al cambiar el selector: recepción, estados, rutas, pasos,
trabajos, abandonos y tiempos conservan la sede donde ocurrieron.

Los hijos materializan `branchCode` sin valor predeterminado:

- `ReceptionCheckIn` y `VisitStatusHistory`;
- `PatientRoute` y `PatientRouteStep`;
- `VisitWorkItem` y `VisitDiscontinuation`;
- `VisitAreaTimeEvent`;
- `VisitAttribution` y `VisitAttributionTouch`, cubiertos por la Tarea 6.

Cada relación padre-hijo usa el identificador y la sucursal. Las claves
foráneas compuestas hacen que PostgreSQL rechace un hijo cuyo `branchCode` no
coincida con la visita, ruta o paso relacionado. `VisitAreaTimeEvent` queda
ligado simultáneamente a la visita y al paso de ruta de la misma sede.

## Frontera Del Servidor

La sede proviene de `BranchRequestContext`. Bandejas, contadores, detalles,
reportes, derivaciones y cambios de estado requieren `branchCode`; no existe un
parámetro opcional ni una sede predeterminada para este dominio. Los IDs se
resuelven con claves compuestas como `(id, branchCode)` antes de leer o mutar.

Por tanto, cambiar de Cochabamba a El Alto vuelve a consultar el recorrido de
El Alto. Una ruta activa creada solamente en Cochabamba no incrementa las
visitas activas del dashboard de El Alto.

## Migración

La expansión `20260909170000_visit_flow_branch_scope` agrega las columnas
temporales y deriva la sede únicamente desde la visita o ruta existente. El
endurecimiento `20260909180000_harden_visit_flow_branch_scope` se detiene si
queda un hijo sin sede o si un evento apunta a una ruta distinta; después
aplica `NOT NULL`, índices locales y claves foráneas compuestas.

Estas migraciones no inventan sedes, no duplican recorridos y no fueron
ejecutadas durante la implementación. Su aplicación y el QA real corresponden
al cierre acumulado de la Tarea 17.
