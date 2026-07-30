# Tiempo De Atención Por Área

Guía operativa de la Tarea 23. El reporte vive en
`/sigeco/reportes/tiempos`; Dirección y el super administrador lo consultan
mediante `reports_read`.

## Qué Se Mide

SIGECO mide cuatro áreas:

- Recepción.
- Consulta médica.
- Enfermería.
- Administración.

Cada paso del recorrido comienza con **Entró al área** y termina con **Salió
del área**. Dentro de ese paso el personal registra eventos inmutables:

1. **En espera:** el paciente llegó, pero la atención todavía no comenzó.
2. **En atención:** el responsable comenzó a trabajar con el paciente.
3. **Bloqueada:** la atención no puede avanzar por un motivo concreto.
4. **Reanudada:** continúa en espera o en atención según el estado anterior.

Los eventos tienen un número secuencial. Aunque dos se guarden en el mismo
milisegundo, el sistema conserva su orden real. PostgreSQL rechaza `UPDATE` y
`DELETE`: una corrección debe agregar un evento nuevo, no reescribir la
historia.

## Quién Registra

| Área | Rol que registra | Acción |
| --- | --- | --- |
| Recepción | Recepción | Iniciar, bloquear o reanudar la atención de Recepción. |
| Consulta | Médico | Iniciar, bloquear o reanudar la consulta. |
| Enfermería | Enfermería | Iniciar, bloquear o reanudar su trabajo. |
| Administración | Administración | Iniciar, bloquear o reanudar Caja/venta. |

El super administrador puede operar cualquier área para soporte. Dirección
solo revisa el reporte. Un rol no puede registrar tiempo para otra área.

La entrada y salida se registran automáticamente cuando la visita cambia de
área, se completa o se abandona. El botón **Iniciar atención** es explícito
porque abrir una página no demuestra que el personal ya esté atendiendo.

## Fórmulas

Para cada paso:

```text
espera = suma de intervalos en espera
atención = suma de intervalos en atención
bloqueo = suma de intervalos bloqueados
total = salida del área - entrada al área
```

El período se filtra por la fecha y hora de entrada al área en
`America/La_Paz`.

El reporte muestra:

- promedio;
- mediana;
- percentil 75 (P75);
- percentil 90 (P90).

Los percentiles usan rango más cercano. Por ejemplo, un P90 de 45 minutos
significa que al menos nueve de cada diez sesiones medidas tardaron 45 minutos
o menos. La mediana evita que una atención excepcionalmente larga distorsione
la lectura como puede hacerlo el promedio.

## Reglas Y Exclusiones

- Las visitas canceladas se excluyen.
- Las visitas con `isTestData = true` se excluyen.
- Los abandonos se incluyen y conservan tiempo hasta el evento de salida.
- Una visita que vuelve a un área crea otro paso; no mezcla ambas sesiones.
- Solo las sesiones cerradas y con eventos completos forman promedios y
  percentiles.
- Las sesiones activas aparecen aparte y no alteran las estadísticas cerradas.

La migración identifica como prueba únicamente los fixtures reservados
`QA-*` o `[QA]`. No intenta adivinar que un paciente real es de prueba por un
nombre común.

## Datos Anteriores A La Tarea 23

Los pasos históricos ya tenían entrada y salida, pero no indicaban cuándo
comenzó la atención. La migración conserva esos límites con `inferred = true`.

Su duración total puede revisarse, pero no se usa para afirmar cuánto fue
espera, atención o bloqueo. Así el reporte no inventa una distribución que
nunca se registró.

## Aviso Móvil De Espera

La ficha muestra el tiempo actual y se actualiza cada 30 segundos sin consultar
la base de datos en cada actualización. A partir de 30 minutos de espera se
muestra un aviso visual no invasivo.

El aviso no cambia estados ni envía mensajes. Solo pide revisar si el paciente
puede avanzar o necesita una explicación. El umbral inicial debe revisarse con
datos del piloto antes de producción.

## Cómo Leer El Reporte

- **Comparación por área:** permite encontrar el cuello de botella principal.
- **Tendencia por día:** muestra días con esperas inusuales.
- **Franja por hora:** identifica horarios en los que llegan más pacientes o
  aumenta el P90.
- **Sesiones activas:** permite abrir la visita de un paciente que sigue
  esperando o está bloqueado.
- **Calidad:** muestra recorridos históricos, secuencias inválidas y cierres sin
  salida.

Los filtros disponibles son período, área y sucursal. La administración de
sucursales continúa perteneciendo a la Tarea 28.

## Antes De Producción

- Ejecutar integración completa, lint global, build y QA gstack acumulado.
- Validar los cuatro roles operativos en staging.
- Simular cambio de área, bloqueo, reanudación, cierre y abandono.
- Comparar una muestra manual con un reloj externo.
- Confirmar con Dirección si 30 minutos es el umbral adecuado.
- No aplicar migraciones ni publicar el reporte sin aviso y autorización
  expresa.
