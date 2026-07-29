# Consentimientos Y Preferencias De Contacto

Esta guía explica cómo registrar y respetar las decisiones del paciente en
SIGECO. No reemplaza la revisión legal o profesional aplicable al tratamiento
de datos personales y clínicos.

## Regla Principal

Cada finalidad se pregunta y registra por separado:

| Finalidad | Qué permite | Qué no permite |
| --- | --- | --- |
| Seguimiento | Preguntar cómo evoluciona el tratamiento | Promociones, educación o testimonios |
| Recordatorios | Recordar citas, controles o actividades de atención | Seguimiento clínico o publicidad |
| Educación | Enviar información general de salud | Diagnosticar, tratar o promocionar |
| Promociones | Enviar campañas y novedades comerciales | Seguimiento clínico o testimonios |
| Imagen o voz | Usar testimonio, imagen o voz para contenido | Llamar o escribir al paciente |

Una respuesta afirmativa nunca se extiende automáticamente a otra finalidad.

## Responsables Y Permisos

- Recepción lee el texto al paciente y registra su decisión.
- El super administrador puede registrar decisiones para recuperación
  operativa excepcional.
- Dirección, Médico, Administración, Enfermería y Seguimiento pueden consultar
  el estado cuando ya tienen acceso a la ficha, pero no modificarlo.
- El rol retirado `captacion` no tiene acceso.

La interfaz oculta acciones no permitidas y el servidor vuelve a validar el
permiso.

## Cómo Registrar Una Decisión

1. Abrir la ficha del paciente.
2. Entrar en **Consentimientos y contacto**.
3. Leer sin resumir el texto mostrado para la finalidad correspondiente.
4. Registrar si autoriza, no autoriza o retira una autorización vigente.
5. Si autoriza contacto, marcar WhatsApp, llamada o ambos según su respuesta.
6. Indicar cómo se confirmó: verbalmente en clínica, formulario escrito,
   llamada, WhatsApp o formulario digital.
7. Guardar la decisión.

Cada finalidad aparece cerrada y solo se abre la que se está atendiendo. Los
campos de selección y canales usan los componentes visuales compartidos de
SIGECO. Los canales aparecen únicamente cuando la persona autoriza una
finalidad de contacto. Después de guardar correctamente, la ficha vuelve a
cargar con la sección cerrada y el estado resumido en su encabezado.

Volver a abrir una finalidad no modifica el registro anterior: permite anotar
una decisión nueva, por ejemplo el retiro posterior de una autorización.

El sistema guarda fecha, finalidad, estado, canales, medio de confirmación,
versión, texto exacto y persona que registró la respuesta.

## Retiro

El retiro crea un registro nuevo; no borra ni cambia la aceptación anterior.
Desde ese momento:

- los botones no muestran canales retirados;
- el formulario de Seguimiento no ofrece esos métodos;
- el servidor bloquea un nuevo intento aunque alguien manipule la pantalla.

Un contacto presencial puede registrarse sin permiso de llamada o WhatsApp,
porque no inicia una comunicación remota.

Los accesos directos para llamar o abrir WhatsApp viven únicamente en el
detalle de Seguimiento, donde la finalidad y el canal están validados. La vista
de una visita muestra el número como dato de la ficha, pero no inicia llamadas.

## Historial Y Auditoría

La ficha muestra el historial de más reciente a más antiguo y permite filtrar
por finalidad o ver retiros. El texto aceptado puede abrirse en cada registro.

Los consentimientos son append-only en PostgreSQL: `UPDATE` y `DELETE` están
bloqueados. Las acciones exitosas, fallidas o denegadas también quedan en la
auditoría general de SIGECO sin copiar datos sensibles innecesarios.

## Preferencia Anterior

`Patient.followUpPreference` permanece solo para compatibilidad histórica y ya
no se pregunta ni se edita en Recepción.

- Un antiguo `no_contact` se conserva como negativa de seguimiento.
- WhatsApp, llamada o ambos no se convierten en autorización, porque no
  demuestran qué texto conoció el paciente.

## Producción Bloqueada

La versión `v1` está aprobada únicamente para desarrollo y staging. Antes de
producción se debe:

1. revisar los cinco textos con Dirección;
2. realizar la revisión legal o profesional que Dirección considere necesaria;
3. confirmar por escrito que se autoriza exactamente la versión `v1`;
4. configurar `PATIENT_CONSENT_PRODUCTION_TEXT_VERSION=v1`;
5. volver a ejecutar el gate, la migración y el QA de roles en staging.

Sin esa variable exacta, la validación del ambiente productivo falla y el
servidor tampoco permite registrar consentimientos.

Cambiar un texto exige una versión nueva. Nunca se modifica el texto guardado
en decisiones anteriores.

## Validación

```bash
pnpm test:unit
pnpm typecheck
pnpm lint
```

La integración cubre aceptación, texto exacto, retiro y bloqueo de contactos:

```bash
pnpm test:integration
```

Este último comando reinicia únicamente `salud_intercultural_test` y requiere
la confirmación explícita prevista por las protecciones del proyecto.
