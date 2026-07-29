# Clínica Salud Intercultural antes de SIGECO

## Propósito y alcance

Este documento reúne la información disponible sobre la **Clínica de Medicina Natural y Tradicional Salud Intercultural**, sus responsables y la forma en que se desarrolla el trabajo sin SIGECO.

Se construyó a partir de la documentación interna del proyecto, especialmente:

- `docs/masters/Documento_de_Negocio_V3_0.md`
- `docs/masters/Documento_Maestro_Estratégico.md`
- `docs/project/sigeco-simplificacion/`

El documento distingue tres niveles:

1. **Confirmado:** aparece expresamente en la documentación.
2. **Reconstrucción del flujo:** conecta actividades documentadas para mostrar el recorrido completo, sin agregar nuevas funciones.
3. **No documentado:** información que no puede afirmarse con seguridad.

No se utiliza el funcionamiento de SIGECO como prueba de que una actividad manual ya se realice exactamente de esa manera. El objetivo es describir el escenario previo al sistema.

---

## 1. Descripción general de la clínica

Salud Intercultural es una clínica de medicina natural y tradicional. Su operación comprende:

- Captación y comunicación con personas interesadas.
- Recepción de pacientes.
- Consulta médica.
- Diagnósticos.
- Tratamientos personalizados.
- Recetas.
- Resonancia y otros estudios.
- Signos vitales.
- Aplicaciones de enfermería.
- Ventas y cobros.
- Entrega de medicamentos y productos.
- Seguimiento posterior.
- Control de inventario.
- Supervisión de Dirección.
- Marketing y soporte tecnológico.

La documentación confirma dos condiciones importantes del trabajo previo a SIGECO:

- Existen **registros manuales en papel** que se pretende reemplazar progresivamente.
- La clínica dispone de **una sola computadora**, utilizada principalmente para la resonancia.

También se documenta una dependencia de la **comunicación verbal** para transmitir indicaciones, tareas y cambios entre áreas. El futuro sistema fue planteado precisamente para evitar que aplicaciones, cobros, productos, estudios y seguimientos dependan solamente de avisos verbales.

---

## 2. Personas, cargos y responsabilidades

### 2.1. Dra. Cinthia — Director Operativo Administrativo - DOA (jefa)

**Cargo documentado:** Director Operativo Administrativo .

La Dra. Cinthia es la responsable de supervisar la operación general de la clínica.

La documentación asigna a Dirección la necesidad de conocer:

- Pacientes.
- Ventas.
- Stock.
- Reportes.
- Métricas.
- Funcionamiento general de la operación.

### Actividades previas a SIGECO

Sin un sistema central, Dirección depende de información generada por las diferentes áreas:

- Recepción comunica la llegada y movimiento de pacientes.
- El Médico comunica la atención clínica.
- Enfermería comunica procedimientos y estudios.
- Administración informa ventas, cobros y productos.
- Seguimiento informa contactos posteriores.
- Marketing informa resultados de comunicación y captación.

Para obtener una visión completa, Dirección necesita reunir y comparar información que puede estar distribuida entre:

- Registros en papel.
- Anotaciones.
- Conversaciones.
- Información verbal.
- Archivos de la computadora de resonancia.

### Decisiones y supervisión

Dirección debe supervisar, entre otros asuntos:

- Cómo se está atendiendo a los pacientes.
- Qué áreas tienen trabajo pendiente.
- Cuánto se vendió o cobró.
- Qué saldos quedan pendientes.
- Qué productos deben reponerse.
- Qué pacientes necesitan seguimiento.
- Qué problemas operativos se repiten.

La documentación no especifica el formato exacto de los informes manuales que recibe la Dra. Cinthia ni la frecuencia con la que se elaboran.

---

### 2.2. Dr. Franco — Director Comercial de Ventas (DCV)

**Cargo documentado:** Director Comercial de Ventas.

El Dr. Franco es responsable de la atención clínica.

Sus funciones documentadas incluyen:

- Ver y revisar el expediente clínico.
- Realizar la consulta.
- Crear diagnósticos.
- Registrar hallazgos.
- Definir el plan de tratamiento.
- Crear tratamientos personalizados.
- Elaborar recetas.
- Dar indicaciones.
- Registrar la evolución.
- Solicitar o revisar estudios.
- Derivar actividades a Enfermería.
- Solicitar acciones administrativas o seguimientos cuando correspondan.

### Actividades previas a SIGECO

Antes de SIGECO, el Médico recibe al paciente después de que Recepción informa su llegada.

El flujo clínico reconstruido a partir de sus responsabilidades es:

```text
Recepción informa que el paciente espera
                ↓
El Médico recibe al paciente y su información disponible
                ↓
Realiza preguntas y evaluación
                ↓
Define diagnóstico, tratamiento o estudios
                ↓
Entrega indicaciones a Enfermería o Administración
                ↓
Revisa resultados cuando el paciente retorna
                ↓
Confirma tratamiento, receta, salida o control
```

La documentación confirma que las indicaciones pueden depender de comunicación verbal y que SIGECO se diseñó para eliminar esa dependencia. Por lo tanto, antes del sistema, el Médico debe hacer llegar sus instrucciones mediante los medios manuales disponibles, como la indicación escrita o el aviso entre áreas.

### Información clínica que maneja

- Motivo de consulta.
- Diagnóstico principal.
- Diagnósticos secundarios.
- Hallazgos.
- Observaciones.
- Plan de tratamiento.
- Medicamentos.
- Dosis.
- Frecuencia.
- Duración.
- Indicaciones.
- Evolución.
- Estudios.

No está documentado el formato exacto de la historia clínica de papel ni dónde se archiva físicamente.

---

### 2.3. Marlen — Recepción

**Cargo documentado:** Recepción.

Marlen es responsable de recibir al paciente cuando llega físicamente a la clínica.

Sus funciones documentadas incluyen:

- Registrar pacientes.
- Buscar pacientes anteriores.
- Registrar la llegada.
- Registrar datos personales.
- Registrar la fuente de captación.
- Actualizar información y estados.
- Orientar el recorrido del paciente.
- Realizar el seguimiento de pacientes que ya están en tratamiento.

Marlen está identificada expresamente como la responsable principal de registrar cómo conoció el paciente la clínica.

### Datos que necesita recoger o confirmar

- Nombre completo.
- Teléfono.
- Fecha de nacimiento o edad.
- Género, cuando corresponda.
- Ciudad.
- Departamento.
- Dirección, cuando corresponda.
- Motivo de la visita.
- Alergias.
- Enfermedades o antecedentes relevantes.
- Medicación actual.
- Fuente de captación.
- Información general necesaria para la atención.

### Actividades previas a SIGECO

El flujo manual de Recepción puede reconstruirse así:

```text
El paciente llega
        ↓
Marlen pregunta si ya fue atendido
        ↓
Busca antecedentes o ficha existente
        ↓
Si es nuevo, recoge sus datos
        ↓
Registra la llegada
        ↓
Informa al Médico
        ↓
Orienta al paciente sobre dónde esperar
        ↓
Mantiene conocimiento de quién sigue dentro de la clínica
```

Como la documentación confirma registros manuales en papel, la búsqueda y el registro previo al sistema dependen de esos registros. No está documentado si se utiliza un solo archivador, varios cuadernos o fichas de formatos diferentes.

### Seguimiento del tratamiento

Marlen y Recepción realizan el seguimiento de los pacientes que ya están en tratamiento. Esto significa que Recepción no solamente participa en la llegada. También puede:

- Contactar pacientes.
- Recordar controles.
- Consultar su evolución.
- Coordinar una nueva visita.

Yazmin no participa en este seguimiento clínico.

---

### 2.4. Yazmin — Comunicación y apoyo para la llegada

**Cargo vigente documentado:** Comunicación y apoyo para la llegada.

Yazmin tiene únicamente estas tareas:

- Responder mensajes de WhatsApp.
- Responder llamadas realizadas por WhatsApp.
- Responder llamadas al número telefónico de la clínica.
- Llamar a las personas que solicitaron o necesitan información.
- Contactar a las personas que tenían una visita prevista, pero no lograron llegar.
- Recoger a pacientes que no pueden llegar a la clínica por sus propios medios, cuando el recojo haya sido coordinado internamente.

### Límites del puesto

Yazmin no pregunta por la evolución del tratamiento, no recuerda controles clínicos, no coordina cambios de tratamiento, no registra pacientes en SIGECO y no realiza el seguimiento de quienes ya fueron atendidos. Esas responsabilidades corresponden a Marlen y Recepción.

Para realizar sus tareas solo necesita la información de contacto y el motivo operativo: responder una consulta, devolver una llamada, contactar por una visita no realizada o completar un recojo coordinado.

---

### 2.5. María — Director Productivo Operativo - DPO

**Cargo documentado:** Director Productivo Operativo

María es responsable de la parte administrativa y financiera de la atención.

Sus funciones documentadas incluyen:

- Registrar ventas.
- Registrar cobros.
- Registrar productos entregados.
- Registrar medicamentos entregados.
- Actualizar seguimientos cuando corresponda.
- Ver y controlar inventario.
- Cerrar la atención después del cobro.

### Actividades previas a SIGECO

El flujo administrativo puede reconstruirse así:

```text
El Médico o Enfermería termina su parte
                  ↓
El paciente pasa a Administración
                  ↓
María conoce los servicios y productos utilizados
                  ↓
Calcula el monto
                  ↓
Recibe el pago
                  ↓
Registra pagos completos o parciales
                  ↓
Entrega medicamentos o productos
                  ↓
Anota el saldo, si existe
                  ↓
Actualiza el inventario de forma manual
```

### Información que administra

- Paciente.
- Fecha.
- Servicios.
- Productos.
- Cantidades.
- Monto.
- Forma de pago.
- Pago recibido.
- Saldo pendiente.
- Productos entregados.
- Medicamentos entregados.

### Inventario

El inventario documentado comprende:

- Producto.
- Stock actual.
- Stock mínimo.
- Entradas.
- Salidas.
- Precio referencial.
- Costo referencial.

Antes de la automatización, la salida de productos debe reflejarse manualmente después de una venta o entrega.

La documentación no especifica:

- El formato exacto del control manual.
- Si se utiliza un cuaderno o una hoja de cálculo.
- Quién realiza los conteos físicos.
- Con qué frecuencia se concilia el stock.

---

### 2.6. Enfermera 1 y Enfermera 2 — Enfermería

**Cargos documentados:** Enfermería.

Los nombres propios de las dos enfermeras no aparecen en la documentación revisada. Por esa razón se mantienen las denominaciones documentales “Enfermera 1” y “Enfermera 2”.

Sus funciones incluyen:

- Registrar o controlar signos vitales.
- Realizar controles.
- Registrar estudios.
- Realizar aplicaciones.
- Registrar observaciones.
- Ejecutar indicaciones médicas.

### Signos vitales documentados

- Presión arterial.
- Peso.
- Altura.
- Saturación.
- Temperatura.

### Aplicaciones documentadas

- Ampollas.
- Inyecciones.
- Sueros.
- Vitaminas.

Toda aplicación debería relacionarse con:

- Paciente.
- Fecha.
- Hora.
- Responsable.
- Medicamento.
- Cantidad.
- Observaciones.

### Actividades previas a SIGECO

```text
El Médico entrega o comunica una indicación
                       ↓
El paciente pasa a Enfermería
                       ↓
Enfermería interpreta la indicación
                       ↓
Realiza signos vitales, estudio o aplicación
                       ↓
Anota el resultado disponible
                       ↓
Comunica al Médico que terminó
                       ↓
El paciente retorna al Médico o continúa a Administración
```

La documentación confirma que el objetivo futuro es evitar la dependencia de mensajes verbales. Por ello, el proceso previo depende de que la indicación llegue físicamente o sea comunicada entre las personas.

No se documenta:

- Cómo se distribuyen las tareas entre Enfermera 1 y Enfermera 2.
- Si cada enfermera tiene un horario o especialidad diferente.
- El formato exacto donde registran procedimientos.

---

### 2.7. Ariel — Marketing y Tecnología

**Cargo documentado:** Marketing y TI.

Ariel es responsable de actividades relacionadas con promoción, presencia digital y tecnología.

La documentación estratégica contempla:

- Sitio web.
- Facebook.
- TikTok.
- WhatsApp.
- Contenido.
- Publicidad.
- Analítica.
- Automatización futura.
- Soporte tecnológico.

### Actividades previas a SIGECO

En el proceso anterior al sistema, Marketing y Tecnología participa principalmente antes de la llegada del paciente:

```text
Se publica contenido o publicidad
                ↓
Una persona conoce la clínica
                ↓
Llama o escribe por WhatsApp
                ↓
Recibe información
                ↓
Decide visitar la clínica
```

También existe una función tecnológica relacionada con:

- Presencia web.
- Canales digitales.
- Equipos.
- Soporte.
- Evolución de las herramientas de trabajo.

La documentación no permite afirmar con precisión:

- Quién responde cada mensaje de redes sociales.
- Qué campañas maneja personalmente Ariel.
- Cómo se divide el trabajo entre Marketing y Seguimiento.
- Qué mantenimiento técnico realiza directamente.

---

## 3. Organigrama operativo previo a SIGECO

La estructura documentada puede representarse así:

```text
                         Dra. Cinthia
                            Dirección
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
      Dr. Franco              María                 Ariel
        Médico           Administración       Marketing y TI
          │                     │
          │                     ├── Cobros
          │                     ├── Ventas
          │                     └── Inventario
          │
          ├── Enfermera 1
          └── Enfermera 2

       Marlen                                    Yazmin
      Recepción                       Comunicación y apoyo de llegada
 Seguimiento del tratamiento          WhatsApp, llamadas y recojos
```

Este diagrama muestra relaciones funcionales generales. La documentación no proporciona un organigrama formal de subordinación laboral, por lo que las líneas no deben interpretarse como contratos jerárquicos exactos.

---

## 4. Recorrido completo de un paciente sin SIGECO

### 4.1. Conocimiento de la clínica

El paciente puede conocer Salud Intercultural mediante:

- Facebook Ads.
- Facebook orgánico.
- TikTok.
- WhatsApp.
- Referido.
- Paciente anterior.
- Volante.
- Otro medio.

Marketing y los canales de comunicación generan el primer contacto.

### 4.2. Contacto inicial

La persona llama o escribe para preguntar por atención, tratamientos o síntomas generales.

En esta etapa se puede conocer:

- Nombre.
- Teléfono.
- Ciudad.
- Síntomas generales.
- Intención de visitar.
- Fecha estimada.

La documentación no permite identificar con certeza quién responde cada conversación previa a la visita.

### 4.3. Llegada

Marlen recibe al paciente y pregunta si ya fue atendido.

Si ya existe información:

- Busca la ficha disponible.
- Confirma los datos.

Si es nuevo:

- Registra sus datos.
- Registra el motivo.
- Registra antecedentes básicos.
- Registra cómo conoció la clínica.

### 4.4. Espera

Recepción informa al Dr. Franco que el paciente está esperando y conserva conocimiento del orden y ubicación de las personas.

Antes de SIGECO, esta coordinación depende de:

- Avisos verbales.
- Fichas.
- Presencia física del paciente.
- Memoria y observación del personal.

### 4.5. Consulta médica

El Dr. Franco:

- Escucha al paciente.
- Revisa antecedentes disponibles.
- Evalúa.
- Diagnostica.
- Define tratamiento.
- Crea receta.
- Solicita estudios o procedimientos.
- Decide los pasos siguientes.

### 4.6. Enfermería y estudios

Si existe una indicación:

- El paciente pasa a Enfermería.
- Enfermera 1 o Enfermera 2 realiza el procedimiento.
- Se registran o comunican resultados.
- El paciente puede volver con el Médico.

Los estudios iniciales documentados incluyen:

- Resonancia.
- Laboratorio.
- Ecografía.
- Otros.

### 4.7. Resonancia

La resonancia utiliza principalmente la única computadora documentada de la clínica.

El estudio debe asociarse al paciente, pero antes de un sistema central puede encontrarse separado entre:

- Archivo digital.
- Resultado impreso.
- Ficha clínica.

No está documentada la convención de nombres ni el procedimiento manual de respaldo.

### 4.8. Revisión médica

Cuando existen resultados, el paciente retorna al Dr. Franco.

El Médico:

- Revisa resultados.
- Ajusta el diagnóstico o tratamiento.
- Confirma indicaciones.
- Decide si necesita otra actividad.
- Indica control futuro.

### 4.9. Administración

El paciente pasa con María.

Administración:

- Conoce servicios y productos.
- Calcula el total.
- Cobra.
- Registra un saldo cuando el pago es parcial.
- Entrega productos o medicamentos.
- Actualiza el inventario.

### 4.10. Salida

El paciente puede:

- Terminar la atención.
- Irse después de la consulta.
- Irse después de Enfermería.
- Irse después del cobro.
- Retirarse sin completar el recorrido.

La documentación aclara que el flujo real no siempre es lineal. El paciente puede abandonar en cualquier punto y, después de la consulta, puede ir a Enfermería, Administración o retirarse.

### 4.11. Seguimiento

Marlen y Recepción contactan al paciente que ya está en tratamiento.

El seguimiento busca conocer:

- Si mejoró.
- Si no mejoró.
- Si está cumpliendo el tratamiento.
- Si necesita regresar.
- Si debe hablar con el Dr. Franco.
- Si no respondió.

El contacto puede realizarse por:

- WhatsApp.
- Llamada.

### 4.12. Nueva visita

Si el paciente regresa, Recepción busca su información anterior y se inicia otra atención.

Antes de SIGECO, reconstruir la historia puede requerir consultar:

- Ficha de papel.
- Resultados de estudios.
- Archivos de resonancia.
- Registros de Enfermería.
- Anotaciones de Administración.
- Conversaciones o recordatorios de seguimiento.

---

## 5. Ejemplo narrativo: recorrido manual de Julia

Julia conoce la clínica mediante una publicación y escribe por WhatsApp para preguntar por un dolor de cabeza acompañado de mareos.

La conversación inicial ocurre antes de que Julia llegue. La documentación no identifica con seguridad quién responde ese mensaje específico.

Al día siguiente Julia visita la clínica. Marlen, en Recepción, pregunta si ya fue atendida. Como es una paciente nueva, recoge sus datos, registra el motivo de la consulta y pregunta cómo conoció la clínica.

Marlen informa al Dr. Franco que Julia está esperando. Cuando llega su turno, el Médico conversa con ella, revisa la información disponible y realiza la evaluación.

El Dr. Franco necesita conocer su presión y otros signos vitales. Entrega o comunica la indicación para Enfermería.

Julia pasa con Enfermera 1 o Enfermera 2. La enfermera realiza el control, registra o anota el resultado y comunica que terminó. Si el Dr. Franco necesita revisar el dato, Julia vuelve a consulta.

El Médico revisa el resultado y puede indicar:

- Tratamiento.
- Receta.
- Resonancia.
- Aplicación.
- Control posterior.

Si solicita una resonancia, Julia pasa al procedimiento correspondiente. El estudio se trabaja en la computadora destinada principalmente a resonancia. Después, el resultado vuelve al Médico para su revisión.

Al concluir la parte clínica, Julia pasa con María en Administración. María conoce lo realizado, calcula el costo, recibe el pago y entrega los productos o medicamentos correspondientes. Si Julia paga solo una parte, queda un saldo pendiente en el registro administrativo disponible.

La salida de productos debe reflejarse en el inventario manual.

Antes de retirarse, Julia recibe indicaciones sobre su tratamiento y control.

Después de algunos días, Marlen puede llamar o escribirle para saber:

- Cómo continúa.
- Si mejoró.
- Si necesita volver.
- Si requiere conversar con el Dr. Franco.

Cuando Julia regresa, Marlen busca su información anterior para que el Médico conozca sus antecedentes.

---

## 6. Flujo de información entre personas

Antes de SIGECO, la información necesita avanzar así:

```text
Ariel / canales de comunicación
                ↓
        Persona interesada
                ↓
          Marlen recibe
                ↓
      Dr. Franco diagnostica
          ↙             ↘
Enfermería             María
procedimientos     cobros y productos
          ↘             ↙
             Paciente sale
                   ↓
              Marlen
 seguimiento del tratamiento
                   ↓
            Dra. Cinthia
              supervisa
```

Los medios previos al sistema documentados o directamente implicados por el proceso son:

- Papel.
- Comunicación verbal.
- WhatsApp.
- Llamadas.
- Archivos digitales de resonancia.

No se documenta una única fuente central que reúna todos esos datos antes de SIGECO.

---

## 7. Principales cuellos de botella previos a SIGECO

### 7.1. Información distribuida

La información de una misma persona puede encontrarse en registros clínicos, estudios, anotaciones administrativas y conversaciones separadas.

### 7.2. Dependencia de avisos verbales

Una indicación puede depender de que una persona avise a otra.

### 7.3. Repetición de preguntas

Si la información no viaja con el paciente, diferentes áreas pueden volver a preguntar lo mismo.

### 7.4. Búsqueda manual de antecedentes

Recepción necesita localizar la ficha o información anterior antes de una nueva atención.

### 7.5. Riesgo de duplicados

Sin una búsqueda central, existe riesgo de crear registros separados para la misma persona.

### 7.6. Falta de una lista común de pendientes

No se documenta una lista central previa al sistema que muestre:

- Pacientes esperando.
- Indicaciones de Enfermería.
- Cobros.
- Productos pendientes.
- Seguimientos.

### 7.7. Seguimientos dependientes de recordatorios

Marlen necesita saber a qué paciente debe contactar y cuándo. Por separado, Yazmin necesita una lista de las personas a quienes debe devolver una llamada o contactar porque no lograron llegar.

### 7.8. Ventas e inventario separados

La venta y la salida física del producto deben reflejarse manualmente en el stock.

### 7.9. Dependencia de una computadora

La única computadora se utiliza principalmente para resonancia.

### 7.10. Reportes para Dirección

La Dra. Cinthia necesita reunir información de distintas personas para conocer la situación completa.

---

## 8. Información que no está documentada

Para evitar presentar suposiciones como hechos, no puede afirmarse con la documentación disponible:

- Los nombres de Enfermera 1 y Enfermera 2.
- Los horarios de cada persona.
- La estructura contractual o jerárquica exacta.
- Los salarios.
- El número total de trabajadores.
- Quién responde cada cuenta de redes sociales.
- El cuaderno o formato exacto de Recepción.
- El formato exacto de historia clínica.
- El lugar físico donde se archivan las fichas.
- El formato manual de caja.
- El formato manual de inventario.
- La frecuencia del cierre de caja.
- La frecuencia del conteo de stock.
- Quién realiza cada resonancia.
- El procedimiento manual de respaldo.
- El formato utilizado por Marlen para organizar el seguimiento del tratamiento.
- El formato utilizado por Yazmin para organizar llamadas pendientes, visitas no realizadas y recojos.
- Si existen reuniones periódicas de personal.
- Los tiempos reales de espera.
- Los precios y salarios.
- El volumen diario de pacientes.
- El flujo de compras y proveedores.

---

## 9. Resumen por persona

| Persona | Cargo | Actividad principal |
|---|---|---|
| Dra. Cinthia | Dirección | Supervisa pacientes, operación, ventas, stock y resultados. |
| Dr. Franco | Médico | Consulta, diagnostica, define tratamientos, recetas, indicaciones y evolución. |
| Marlen | Recepción | Recibe, busca o registra pacientes, registra la llegada, orienta y también realiza seguimientos. |
| Yazmin | Comunicación y apoyo para la llegada | Responde WhatsApp y llamadas, devuelve llamadas informativas, contacta a quienes no llegaron y realiza recojos coordinados. |
| María | Administración | Registra ventas, cobra, controla saldos, entrega productos y revisa inventario. |
| Enfermera 1 | Enfermería | Realiza signos vitales, controles, estudios, aplicaciones y observaciones. |
| Enfermera 2 | Enfermería | Realiza signos vitales, controles, estudios, aplicaciones y observaciones. |
| Ariel | Marketing y TI | Trabaja en comunicación, presencia digital, promoción y soporte tecnológico. |

---

## 10. Conclusión

Antes de SIGECO, Salud Intercultural ya cuenta con un recorrido operativo completo:

```text
Comunicación y captación
          ↓
Recepción
          ↓
Consulta médica
          ↓
Enfermería y estudios
          ↓
Revisión médica
          ↓
Administración
          ↓
Entrega y salida
          ↓
Seguimiento
          ↓
Nueva visita
```

Cada persona tiene un área de responsabilidad reconocible. El principal problema previo al sistema no es la ausencia de actividades, sino que la información y la coordinación dependen de registros manuales, mensajes, llamadas, archivos separados y comunicación verbal.

La clínica funciona mediante la colaboración de:

- La Dra. Cinthia en Dirección.
- El Dr. Franco en atención médica.
- Marlen en Recepción.
- Yazmin en Comunicación y apoyo para la llegada.
- María en Administración.
- Enfermera 1 y Enfermera 2 en Enfermería.
- Ariel en Marketing y Tecnología.

El reto central es conservar la continuidad del paciente desde el primer contacto hasta el seguimiento, evitando que su historia quede dividida entre diferentes personas y medios.
