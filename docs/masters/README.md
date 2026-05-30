# Masters

Documentos maestros de negocio, operacion clinica y vision estrategica de Salud Intercultural.

Estos documentos describen como trabaja la clinica, que procesos existen, que roles participan y hacia donde debe evolucionar el ecosistema. Funcionan como fuente de verdad funcional para entender el negocio antes de disenar o implementar nuevas funcionalidades.

## Alcance

Usar este directorio para:

- Vision estrategica de largo plazo.
- Procesos reales de la clinica.
- Flujos de pacientes, leads, visitas, atencion, administracion e inventario.
- Roles operativos y responsabilidades.
- Reglas de negocio no tecnicas.
- Lineamientos para priorizar V3 y versiones futuras.

No usar este directorio para:

- Decisiones de arquitectura tecnica.
- Eleccion de framework, hosting, base de datos o librerias.
- Diseno de tablas, collections, APIs o componentes.
- Checklists de deploy, testing o migraciones.

Las decisiones tecnicas deben documentarse en `docs/architecture`, `docs/operations`, `docs/design` o `docs/project`, segun corresponda.

## Principio Mobile-First Desde V3

Hasta V2, el enfoque responsive actual del sitio publico se mantiene como base valida.

A partir de V3, el sistema operativo interno debe tratar mobile-first como una restriccion principal de producto, porque la clinica trabaja con disponibilidad limitada de computadoras y los procesos diarios deben poder ejecutarse desde celulares Android.

Esto implica que cada flujo nuevo de V3 debe poder realizarse correctamente en mobile antes de optimizarse para escritorio:

- Registro y busqueda de pacientes.
- Gestion de leads y seguimientos.
- Recepcion y apertura de visitas.
- Registro clinico esencial.
- Enfermeria y signos vitales.
- Ventas, cobros e inventario operativo.
- Dashboards y listas de trabajo internas.

Desktop sigue siendo importante, pero desde V3 queda como experiencia adaptativa secundaria para flujos operativos internos.

## Relacion Con V3

El Documento de Negocio V3.0 define lineamientos y flujos de trabajo de la clinica. No define decisiones tecnicas.

La implementacion tecnica de V3 debe partir de estos lineamientos, pero cada modulo debe pasar por una definicion tecnica separada antes de construir:

1. Alcance funcional.
2. Fuente de verdad de datos.
3. Modelo de permisos.
4. UI mobile-first.
5. Persistencia y migraciones.
6. Pruebas y criterios de cierre.

## Documentos

1. [Documento de Negocio V3.0](./Documento_de_Negocio_V3_0.md)
2. [Documento Maestro Estrategico](./Documento_Maestro_Estratégico.md)
