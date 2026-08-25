# Lanzamiento Y Suspension De Modulos

SIGECO se enciende por etapas. Un modulo apagado no aparece en la navegacion y
sus paginas y acciones se rechazan en el servidor. Este documento describe como
se lanza un modulo, como se suspende cuando algo sale mal y que pasa con el
trabajo que quedo abierto.

Plan de referencia:
[lanzamiento por etapas](../project/sigeco-lanzamiento-por-etapas/tasks.md).

## Quien Decide Y Quien Ejecuta

| Rol | Puede |
| --- | --- |
| Direccion | Decide cuando se lanza cada etapa. Ve el estado, el historial y los pendientes de un modulo suspendido, en solo lectura. |
| Super administrador | Enciende y apaga modulos desde `/sigeco/modulos`. |
| Resto del personal | No ve la pantalla ni el aviso de suspension. |

El super administrador no evade el bloqueo: un modulo apagado esta apagado para
todos. Lo unico que puede hacer es volver a encenderlo.

## Tres Estados, No Dos

| Estado | Que significa |
| --- | --- |
| Lanzado | El modulo opera con normalidad. |
| Sin lanzar | Todavia no llego su turno. Nadie lo ve, ni siquiera Direccion. |
| Suspendido | Estuvo lanzado y se apago. Direccion y el super administrador lo consultan en solo lectura. |

La diferencia entre "sin lanzar" y "suspendido" importa: solo en el segundo caso
existe trabajo abierto que alguien tiene que resolver.

## Dependencias

Son duras y se validan en los dos sentidos:

- Compras exige Inventario.
- Consulta exige Recepcion.
- Enfermeria exige Consulta.
- Seguimiento, Opiniones y Reportes exigen Recepcion.

No se puede encender un modulo sin sus prerrequisitos ni apagar uno del que otro
activo dependa. La pantalla nombra que falta encender o apagar antes.

## Lanzar Un Modulo

1. Confirmar con Direccion que la etapa anterior esta estable.
2. Verificar en staging el recorrido completo del modulo.
3. Capacitar al personal que lo va a usar.
4. En `/sigeco/modulos`, encender el modulo y confirmar.
5. Acompañar los primeros dias y revisar la auditoria.

El cambio queda registrado con quien, cuando y el estado anterior.

## Suspender Un Modulo

Se suspende cuando el modulo produce un error que afecta la operacion o los
datos, y esperar a un despliegue no es aceptable.

1. Avisar al personal afectado antes de apagar.
2. En `/sigeco/modulos`, apagar el modulo escribiendo el motivo. Es obligatorio:
   es la decision que despues hay que poder explicar.
3. Revisar en la misma tarjeta el trabajo abierto que quedo dentro.
4. Definir con Direccion como se atiende ese trabajo mientras dure la suspension
   (papel, otra area, o espera).

Desde ese momento:

- Nadie puede registrar cambios en el modulo, ni el super administrador.
- Direccion y el super administrador siguen consultando sus pantallas, sin los
  botones de guardado.
- El shell muestra un aviso permanente con los modulos suspendidos.
- Los intentos de escribir quedan auditados como `module.disabled`.

## Que Pasa Con El Trabajo Abierto

Apagar un modulo no cierra ni cancela nada. Una visita activa sigue activa, una
venta con saldo sigue debiendo y una tarea pendiente sigue pendiente. La tarjeta
del modulo suspendido lista lo que quedo dentro:

| Modulo | Se cuenta |
| --- | --- |
| Recepcion | Visitas sin cerrar y tareas de Recepcion abiertas. |
| Consulta | Consultas en borrador y pacientes esperando al medico. |
| Enfermeria | Tareas abiertas y paquetes de sesiones sin terminar. |
| Caja y Administracion | Ventas con saldo, Cajas sin cerrar y cobros pendientes. |
| Inventario | Alertas de stock abiertas. |
| Compras | Compras sin recibir por completo. |
| Seguimiento | Seguimientos sin resolver y recordatorios esperando aprobacion. |
| Opiniones | Casos abiertos. |

Catalogo y Reportes no acumulan pendientes.

## Reactivar

Encender de nuevo el modulo lo devuelve tal como quedo. No reabre, no cierra y no
recalcula nada por su cuenta: el trabajo pendiente vuelve a estar disponible en
el mismo estado. Conviene revisar primero la lista de pendientes para saber que
va a encontrar el personal.

## Preparar Un Ambiente Sin La Pantalla

Para una base recien migrada o un ambiente de pruebas, existe el script
equivalente, con las mismas reglas y el mismo historial:

```bash
SIGECO_MODULE=administracion SIGECO_MODULE_ACTIVE=true pnpm modules:set
SIGECO_MODULE=administracion SIGECO_MODULE_ACTIVE=false \
  SIGECO_MODULE_REASON="Motivo" pnpm modules:set
```

No reemplaza a la pantalla: un cambio hecho asi queda sin actor en el historial,
porque lo hace la plataforma y no una persona identificada.

## Documentacion Relacionada

- [Desarrollo local](./local-development.md)
- [Auditoria append-only](./audit-events.md)
- [Permisos, privacidad, logs y secretos](./permissions-privacy-secrets.md)
