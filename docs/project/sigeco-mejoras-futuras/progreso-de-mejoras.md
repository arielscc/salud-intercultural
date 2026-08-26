# Progreso De Mejoras Futuras De Sigeco

Ultima actualizacion: 2026-07-28.

## Estado General

Backlog investigado y priorizado. No se implemento codigo funcional en esta fase.

Este archivo conserva el estado histórico y ya no controla la ejecución. La nueva numeración y la relación con este backlog están documentadas en [tasks.md](../sigeco-mejoras-integrales/tasks.md). Todo inicio o cierre nuevo se registra en [progress.md](../sigeco-mejoras-integrales/progress.md).

| # | Tarea | Prioridad | Estado | Dependencia principal |
| --- | --- | --- | --- | --- |
| 1 | CI, dependencias y staging | P0 | Pendiente | Ninguna |
| 2 | Auditoria append-only | P0 | Pendiente | 1 |
| 3 | Usuarios, sesiones y accesos | P0 | Pendiente | 2 |
| 4 | Backup, restore e incidentes | P0 | Pendiente | 1 |
| 5 | Adjuntos clinicos seguros | P0 | Pendiente | 2-4 |
| 6 | Duplicados y fusion de pacientes | P1 | Pendiente | 2 |
| 7 | Correcciones y firma clinica | P1 | Pendiente | 2 |
| 8 | Actualizacion de bandejas | P1 | Pendiente | 1-2 |
| 9 | Receta y comprobante imprimibles | P1 | Pendiente | 2, 7 |
| 10 | Cierre de caja y reversiones | P1 | Pendiente | 2 |
| 11 | Proveedores, compras y lotes | P1 | Pendiente | 2, 10 |
| 12 | Automatizacion de seguimiento | P1 | Pendiente | 2-3 |
| 13 | Agenda y citas | P2 | Pendiente | 2, 3, 6, 12 |
| 14 | Reportes y exportaciones | P2 | Pendiente | 2, 3, 10 |
| 15 | Modo degradado | P2 | Pendiente | 2, 4, 8 |
| 16 | Preparacion FHIR | P3 | Pendiente | 2, 5-7, 14 |

## Decisiones Vigentes

- Las iniciativas movil y desktop estan cerradas; las nuevas funciones deben ser completas en ambas superficies.
- P0 es un gate de operacion clinica amplia, no deuda opcional.
- Portal, telemedicina, IA y multi-sucursal quedan diferidos.
- Modelos Prisma parciales no justifican activar una UI sin seguridad, reglas y ownership aprobados.
- Auditoria, consentimiento y procedencia son contratos separados.

## Siguiente Paso Recomendado

No iniciar una tarea desde este archivo. Consultar su destino en `tasks.md` y actualizar únicamente `progress.md`. El primer paso vigente es la Tarea 1 de CI y control de dependencias.
