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
3. [Modelo Integral de Operación, Atención y Crecimiento](./Ideas/modelo-operativo-y-crecimiento/README.md)
   - [Filosofía del libro aplicada](./Ideas/modelo-operativo-y-crecimiento/01-filosofia-del-libro-aplicada.md)
   - [Organización, talento y responsabilidades](./Ideas/modelo-operativo-y-crecimiento/02-organizacion-talento-y-responsabilidades.md)
   - [Engranaje operativo y recorrido del paciente](./Ideas/modelo-operativo-y-crecimiento/03-engranaje-operativo-y-recorrido-del-paciente.md)
   - [Crecimiento, contenido, lives y ventas](./Ideas/modelo-operativo-y-crecimiento/04-crecimiento-contenido-lives-y-ventas.md)
   - [Experiencia, fidelización y mejora](./Ideas/modelo-operativo-y-crecimiento/05-experiencia-fidelizacion-y-mejora.md)
   - [SIGECO y transformación digital](./Ideas/modelo-operativo-y-crecimiento/06-sigeco-y-transformacion-digital.md)
   - [Plan de 90 días, rutinas e indicadores](./Ideas/modelo-operativo-y-crecimiento/07-plan-90-dias-rutinas-e-indicadores.md)
   - [Guías, listas y ejemplos prácticos](./Ideas/modelo-operativo-y-crecimiento/08-guias-listas-y-ejemplos.md)
   - [Estrategia de TikTok y Facebook para posicionamiento local y expansión](./Ideas/modelo-operativo-y-crecimiento/09-estrategia-tiktok-facebook-posicionamiento-expansion.md)
   - [Antecedentes: problemas actuales que SIGECO resuelve](./Ideas/modelo-operativo-y-crecimiento/10-antecedentes-y-puntos-de-dolor-actuales.md)
   - [Personal talento: dolores y nuevas actividades](./Ideas/modelo-operativo-y-crecimiento/11-personal-talento-dolores-y-nuevas-actividades.md)
