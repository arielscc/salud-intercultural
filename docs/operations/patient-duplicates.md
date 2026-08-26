# Duplicados Y Fusión De Pacientes

Esta guía explica cómo prevenir fichas duplicadas, revisar coincidencias y
reunir dos expedientes sin borrar la historia anterior.

## Qué Considera Una Coincidencia

SIGECO normaliza los datos antes de comparar:

- Teléfono principal o alternativo: elimina espacios, guiones, `+591` y otros
  caracteres; compara los últimos ocho dígitos.
- Nombre: ignora mayúsculas, tildes, signos y el orden de las palabras.
- Fecha de nacimiento: compara el día completo cuando ambas fichas la tienen.

Una pareja entra a la cola cuando:

1. coincide alguno de sus teléfonos; o
2. coinciden el nombre normalizado y la fecha de nacimiento.

La puntuación ayuda a priorizar, pero no decide por el personal:

| Coincidencia | Puntos |
| --- | ---: |
| Teléfono | 70 |
| Nombre | 20 |
| Fecha de nacimiento | 30 |

Dos personas diferentes pueden compartir teléfono o nombre. Por eso ninguna
ficha se fusiona automáticamente.

## Prevención En Recepción

El funnel de llegada y la edición de ficha revisan los datos antes de guardar.
Si existe una coincidencia:

- se muestra una alerta;
- Recepción debe buscar la ficha existente;
- si confirma que son personas diferentes, puede continuar;
- la pareja queda disponible en la cola para revisión.

La búsqueda encuentra también nombres, teléfonos y códigos anteriores
guardados como alias después de una fusión.

## Cola De Revisión

La ruta `/sigeco/recepcion/duplicados` muestra:

- las dos fichas;
- por qué coinciden;
- su puntuación;
- cuántos registros dependen de cada una;
- acceso a la comparación completa.

Recepción puede revisar y descartar una falsa coincidencia. Dirección puede
consultar la cola. Solo el super administrador puede fusionar.

## Comparación Y Simulación

La comparación presenta lado a lado:

- identificación y procedencia;
- teléfonos;
- fecha de nacimiento;
- alergias, antecedentes y medicación;
- cantidad de visitas, consultas, recetas, estudios, ventas, pagos,
  seguimientos, consentimientos y adjuntos.

Los valores diferentes se resaltan. SIGECO no elige automáticamente cuál dato
es correcto.

En móvil se puede revisar la información. La acción de fusionar aparece
únicamente en escritorio para reducir errores.

## Qué Ocurre Al Fusionar

El super administrador elige la ficha que seguirá vigente y escribe su código
interno para confirmar.

Dentro de una sola transacción:

1. se vuelve a verificar que ambas fichas estén disponibles;
2. se registra una fotografía de ambas fichas;
3. se guardan los identificadores y cantidades que serán trasladados;
4. se mueven visitas y todas las relaciones clínicas, comerciales y de
   seguimiento;
5. los campos vacíos se completan y los datos diferentes de la ficha anterior
   permanecen visibles en el expediente como información histórica;
6. se conserva la fuente de captación más antigua;
7. la ficha anterior queda archivada, no eliminada;
8. su código, nombre y teléfonos quedan como alias;
9. el enlace anterior redirige al expediente vigente;
10. la operación queda en la auditoría append-only.

Si cualquier paso falla, la transacción completa se revierte.

## Datos Que No Se Deben Borrar

No se elimina:

- la ficha anterior;
- el código anterior;
- visitas;
- registros clínicos;
- ventas o pagos;
- consentimientos;
- adjuntos;
- seguimientos.

`PatientMerge` conserva las fotografías previas y la lista exacta de registros
movidos. Esto permite preparar una compensación supervisada si una fusión
incorrecta debe corregirse. No se debe intentar corregirla con SQL manual.

## Ambientes

Las migraciones locales son:

- `20260729220000_patient_duplicates_merge`;
- `20260729221000_patient_secondary_phone_normalization`.

Antes de staging:

1. aplicar ambas migraciones;
2. ejecutar el seed sintético;
3. probar la cola con `QA-000005` y `QA-000006`;
4. verificar permisos de Recepción, Dirección y super administrador;
5. comprobar redirección por código anterior;
6. ejecutar la integración acumulada y el QA responsive acordado.

Después de generar el cliente Prisma o aplicar estas migraciones, se debe
detener y volver a iniciar `pnpm dev`. La recarga rápida de Next no reemplaza
una instancia antigua de Prisma que ya esté en memoria.

Producción no debe modificarse sin autorización expresa.
