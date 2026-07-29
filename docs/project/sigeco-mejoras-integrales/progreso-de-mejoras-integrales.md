# Progreso De Mejoras Integrales De SIGECO

Última actualización: 2026-07-28.

## Estado General

El plan fue documentado y contrastado con los módulos actuales de SIGECO. Todavía no se implementó código funcional de estas 20 tareas.

El alcance acordado de Caja, gastos, compras e inventario quedó incorporado principalmente en las tareas 11 y 12.

## Resumen

| Estado | Cantidad |
| --- | ---: |
| Pendiente | 20 |
| En progreso | 0 |
| Bloqueada | 0 |
| Terminada | 0 |
| Descartada | 0 |

## Estado Por Tarea

| # | Tarea | Prioridad | Estado | Dependencias principales |
| --- | --- | --- | --- | --- |
| 1 | Resultado de propuesta de tratamiento | P1 | Pendiente | 19 para producción amplia |
| 2 | Departamento y procedencia | P1 | Pendiente | Ninguna |
| 3 | Fuentes de captación | P1 | Pendiente | 2 |
| 4 | Tipos de seguimiento | P1 | Pendiente | 1, 5 |
| 5 | Consentimientos separados | P0 | Pendiente | Aprobación de textos |
| 6 | Recorrido completo del paciente | P1 | Pendiente | 1-5, 19 |
| 7 | Tiempo por área | P1 | Pendiente | 10 |
| 8 | Abandono, bloqueo y pendientes | P1 | Pendiente | 4 |
| 9 | Duplicados y fusión de pacientes | P1 | Pendiente | 19 |
| 10 | Actualización entre áreas | P1 | Pendiente | 19 |
| 11 | Caja, dinero al personal, gastos y cierre | P0 | Pendiente | 19 |
| 12 | Productos, compras, proveedores, lotes y stock | P0 | Pendiente | 11, 19 |
| 13 | Encuestas y reclamos | P2 | Pendiente | 5, piloto manual |
| 14 | Recordatorios con supervisión | P1 | Pendiente | 4, 5, 19 |
| 15 | Multi-sucursal El Alto y Cochabamba | P1 | Pendiente | 2, 6, 11, 12, 19 |
| 16 | Móvil y conectividad lenta | P1 | Pendiente | 10, 19 |
| 17 | Recetas y comprobantes | P2 | Pendiente | 1, 11, 19 |
| 18 | Integración Payload-SIGECO | P2 | Pendiente | 3, 5, 19 |
| 19 | Seguridad, auditoría y recuperación | P0 | Pendiente | CI y staging |
| 20 | Validación con personal real | P0 | Pendiente | Módulos que entren al piloto |

## Decisiones Vigentes

- El médico es quien explica y cierra la venta del tratamiento; SIGECO debe registrar el resultado.
- Administración maneja cobros, egresos, compras, productos, entradas y cierre de Caja.
- Marlen realiza el seguimiento de pacientes en tratamiento.
- Yazmin no recibe tareas nuevas de seguimiento clínico, ventas, caja, inventario, contenido o lives.
- El dinero de almuerzo se registra por empleado y monto, aunque forme parte de una entrega grupal.
- Las compras urgentes desde Caja deben identificar solicitante, receptor, motivo y comprobante.
- Registrar una compra no aumenta stock. El stock aumenta al confirmar la recepción.
- Compra, egreso y entrada de inventario deben quedar enlazados.
- Los pagos y movimientos históricos no se borran; se compensan.
- La primera sucursal operativa es El Alto. Cochabamba se prepara y se activa después de un piloto aprobado.
- Web y móvil usan la misma lógica y permisos. Móvil significa web responsive; no una app nativa en esta fase.
- El plan anterior de mejoras futuras queda como antecedente técnico. Este archivo controla el avance de los 20 puntos consolidados.

## Orden Inicial Recomendado

Para entregar valor sin dejar Caja e inventario sobre una base insegura:

1. Iniciar la Tarea 19 por CI, staging y auditoría.
2. En paralelo funcional, aprobar textos de consentimiento de la Tarea 5.
3. Diseñar y ejecutar la Tarea 11 hasta apertura, egresos y cierre.
4. Ejecutar la Tarea 12 para enlazar compras y recepción de stock.
5. Validar ambas con el escenario financiero de la Tarea 20.
6. Continuar con las tareas 1-4 y 8 para completar el flujo comercial y el seguimiento.
7. Construir reportes 6-7 solo cuando los datos fuente estén funcionando.
8. Preparar la Tarea 15 después de estabilizar El Alto.

## Próximo Paso Ejecutable

Descomponer la Tarea 19 en entregas técnicas pequeñas y comenzar por CI y staging aislado. Para Caja, antes de migrar datos, Dirección debe confirmar:

- Qué usuarios pueden abrir y cerrar Caja.
- Qué monto de diferencia requiere aprobación.
- Si todo gasto necesita comprobante o solo algunas categorías/montos.
- Si una compra urgente puede quedar pendiente de comprobante y por cuánto tiempo.

Estas decisiones no impiden diseñar la base, pero sí impiden declarar terminado el cierre de Caja.

## Registro De Avances

Agregar una entrada cada vez que una tarea cambie de estado.

### Plantilla

```markdown
## AAAA-MM-DD — Tarea N — Nombre

Estado anterior:
Estado nuevo:

### Resultado

- Qué se implementó o decidió.

### Archivos Y Migraciones

- Rutas modificadas.

### Validación

- Comandos ejecutados.
- Pruebas web y móvil.
- Casos permitidos y denegados por rol.

### Pendientes

- Riesgos, decisiones o seguimiento.
```
