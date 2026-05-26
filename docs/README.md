# Documentation

Documentacion oficial del proyecto Salud Intercultural. Este directorio esta organizado por responsabilidad para evitar duplicacion y dejar una base clara para iniciar V3.

## Directorios

1. [Architecture](./architecture/README.md): decisiones tecnicas, estructura del monolito modular, limites de dominio y convenciones de codigo.
2. [Design](./design/README.md): sistema visual publico, criterios de UI y reglas de experiencia.
3. [Operations](./operations/README.md): procedimientos diarios para desarrollo, deploy, variables, CMS, media, leads, analytics, QA y troubleshooting.
4. [Project](./project/README.md): estado de implementacion, preparacion V3, backlog y documentacion de gestion del producto.

## Regla De Ubicacion

- Si describe como esta construido el sistema, va en `architecture`.
- Si describe como debe verse o comportarse la interfaz, va en `design`.
- Si describe como operar, configurar, validar o publicar el sistema, va en `operations`.
- Si describe estado, roadmap, decisiones de version o preparacion futura, va en `project`.

## Antes De Crear Un Documento Nuevo

1. Revisar si ya existe un documento canonico relacionado.
2. Agregar la informacion al documento existente si comparte responsabilidad.
3. Crear un documento nuevo solo si tiene una responsabilidad clara y estable.
4. Actualizar el `README.md` del directorio correspondiente.
5. Evitar historiales extensos; mantener estado actual, decisiones vigentes y pendientes accionables.
