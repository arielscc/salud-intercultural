# Reportes De Cambios Por Tarea

Regla operativa: toda tarea de implementacion debe cerrar con un documento `.md` que registre que se cambio, que se implemento, que se valido y que queda pendiente.

Esta regla aplica a cambios de codigo, base de datos, UI, configuracion, documentacion tecnica relevante y entregas V3.

## Ubicacion

Crear los reportes en:

```txt
docs/project/task-reports/
```

Formato recomendado:

```txt
YYYY-MM-DD-descripcion-corta.md
```

Ejemplos:

```txt
2026-05-30-v3-auth-interna.md
2026-05-30-sigeco-shell-mobile.md
2026-05-30-leads-v3-pipeline.md
```

## Cuándo Crear Un Reporte

Crear un reporte cuando la tarea:

- Agrega o modifica funcionalidad.
- Cambia modelos, migraciones, queries o seeds.
- Cambia permisos, autenticacion o reglas de negocio.
- Cambia UI, rutas o flujos de usuario.
- Cambia integraciones, variables de entorno o deploy.
- Actualiza documentacion tecnica que afecta decisiones futuras.

No es necesario crear un reporte para correcciones menores de texto, typos o cambios sin impacto funcional, salvo que formen parte de una entrega mayor.

## Plantilla

```md
# Tarea: Nombre corto

## Fecha

YYYY-MM-DD

## Objetivo

Resumen breve de lo que se buscaba lograr.

## Cambios Implementados

- Cambio 1.
- Cambio 2.
- Cambio 3.

## Archivos Modificados

- `ruta/al/archivo.ts`
- `ruta/al/documento.md`

## Decisiones Tecnicas

- Decision tomada y razon.

## Validacion

- Comando ejecutado o validacion manual.
- Resultado.

## Pendientes

- Pendiente 1, si aplica.
- Ninguno, si no aplica.
```

## Reglas

- El reporte debe escribirse al final de la tarea, no antes.
- Debe reflejar el estado real implementado, no el plan inicial.
- Debe mencionar validaciones no ejecutadas cuando aplique.
- Debe evitar datos sensibles, telefonos reales, nombres de pacientes reales o informacion clinica real.
- Si la tarea pertenece a V3, debe indicar la fase relacionada: V3.1A, V3.1B, V3.2, V3.3, V3.4, V3.5 o V3.6.
