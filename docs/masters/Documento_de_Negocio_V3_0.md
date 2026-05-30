# Documento de Negocio V3.0
## Sistema de Gestión Clínica y Operativa
### Clínica de Medicina Natural y Tradicional Salud Intercultural

---

## 1. Introducción

### Propósito

Este documento define el modelo de negocio, procesos operativos, actores, roles, permisos, entidades, reglas de negocio y roadmap funcional del Sistema de Gestión Clínica y Operativa de la Clínica de Medicina Natural y Tradicional Salud Intercultural.

- Este documento constituye la **fuente oficial de verdad** para el diseño funcional del sistema.
- No define aspectos técnicos de implementación.
- Su objetivo es documentar cómo funciona la clínica y cómo debe comportarse el sistema.

---

## 2. Visión General

El sistema debe convertirse en la **plataforma central de operación** de la clínica. Su propósito es reemplazar progresivamente los registros manuales en papel y centralizar toda la información relacionada con:

- Pacientes
- Atención clínica
- Estudios
- Tratamientos
- Enfermería
- Administración
- Ventas
- Seguimientos
- Inventario

El sistema debe permitir la **trazabilidad completa** de cada paciente desde el primer contacto hasta sus futuras visitas.

---

## 3. Restricciones Operativas

### Restricción Principal

Actualmente la clínica dispone de una sola computadora utilizada principalmente para la resonancia.

Por esta razón:

- **Mobile First** — Obligatorio
- **Desktop Adaptativo** — Secundario

Todos los procesos principales deben poder realizarse desde dispositivos Android. El sistema deberá funcionar correctamente desde:

- Celulares Android
- Tablets Android
- Computadoras de escritorio

---

## 4. Principio Central del Sistema

Toda la información registrada dentro de la clínica debe terminar asociada a un **paciente**.

```
Paciente
├── Visitas
├── Consultas
├── Diagnósticos
├── Estudios
├── Signos Vitales
├── Tratamientos
├── Recetas
├── Ventas
├── Seguimientos
├── Aplicaciones
└── Historial
```

---

## 5. Estructura Principal

El sistema se basa en:

```
Paciente
├── Ficha Permanente
└── Visitas
```

---

## 6. Ficha Permanente del Paciente

La ficha permanente almacena información que **no debe repetirse** en cada visita.

### Datos Personales

- ID Interno
- Nombre Completo
- Teléfono
- Fecha de Nacimiento
- Edad
- Género
- Ciudad
- Departamento
- Dirección *(opcional)*

### Información General

- Fuente de Captación
- Fecha Primera Visita
- Observaciones Generales
- Alergias
- Antecedentes Relevantes
- Estado del Paciente

---

## 7. Fuente de Captación

**Responsable principal:** Marlen

La fuente se registra cuando el paciente llega físicamente a la clínica.

**Opciones iniciales:**

- Facebook Ads
- Facebook Orgánico
- TikTok
- WhatsApp
- Referido
- Paciente Anterior
- Volante
- Otro

---

## 8. Flujo General del Paciente

```
Lead
↓
Interesado
↓
Visita Potencial
↓
Paciente
↓
Recepción
↓
Consulta
↓
Estudios
↓
Enfermería
↓
Administración
↓
Venta
↓
Seguimiento
↓
Nueva Visita
```

---

## 9. Actores del Sistema

| Rol | Persona |
|-----|---------|
| Dirección | Dra. Cinthia |
| Médico | Dr. Franco |
| Recepción | Marlen |
| Captación y Seguimiento Comercial | Yazmin |
| Administración | María |
| Enfermería | Enfermera 1 / Enfermera 2 |
| Marketing y TI | Ariel |
| Super Administrador | Usuario técnico con acceso total |

---

## 10. Roles y Permisos

### Super Administrador

Acceso total al sistema. Puede:

- Administrar usuarios
- Administrar permisos
- Administrar configuración
- Ver toda la información

---

### Dirección

Puede:

- Ver métricas
- Ver pacientes
- Ver ventas
- Ver stock
- Ver reportes
- Supervisar operación

---

### Médico

Puede:

- Ver expediente clínico completo
- Crear diagnósticos
- Crear tratamientos
- Crear indicaciones
- Registrar evolución
- Revisar estudios

---

### Recepción

Puede:

- Registrar pacientes
- Buscar pacientes
- Registrar llegada
- Actualizar estados
- Registrar fuente de captación
- Registrar datos personales

No puede:

- Modificar diagnósticos
- Modificar tratamientos

---

### Captación y Seguimiento Comercial

**Responsable:** Yazmin

**Objetivo:** Convertir interesados en pacientes presenciales.

Puede:

- Registrar leads
- Registrar interesados
- Registrar canal de origen
- Registrar ciudad
- Registrar síntomas generales
- Registrar intención de visita
- Registrar fecha estimada de visita
- Registrar observaciones comerciales
- Registrar historial de llamadas
- Registrar resultados de contacto
- Crear recordatorios
- Actualizar estados

Debe visualizar:

- Nombre
- Teléfono
- Ciudad
- Canal de origen
- Historial de contacto
- Recordatorios
- Estado del interesado

No puede:

- Ver diagnósticos
- Ver estudios clínicos
- Ver resonancias
- Ver laboratorios
- Modificar tratamientos
- Registrar ventas
- Ver información financiera

**Estados del Lead:**

- Nuevo
- Contactado
- Interesado
- Quiere Visitar
- Recordatorio Pendiente
- Confirmó Asistencia
- No Responde
- Descartado
- Convertido a Paciente

---

### Administración

**Responsable:** María

Puede:

- Registrar ventas
- Registrar cobros
- Registrar productos entregados
- Registrar medicamentos entregados
- Actualizar seguimientos
- Ver inventario

No puede:

- Modificar diagnósticos
- Modificar estudios

---

### Enfermería

Puede:

- Registrar signos vitales
- Registrar estudios
- Registrar controles
- Registrar aplicaciones
- Registrar observaciones

No puede:

- Crear diagnósticos
- Modificar tratamientos médicos

---

## 11. Entidades del Negocio

### Lead

Representa una persona interesada que todavía no asistió a la clínica.

**Datos:**

- Nombre
- Teléfono
- Ciudad
- Síntomas generales
- Canal de origen
- Estado
- Fecha de contacto
- Responsable

---

### Paciente

Representa una persona atendida formalmente por la clínica.

---

### Visita

Cada atención genera una visita independiente. Una visita puede contener:

- Recepción
- Consulta
- Estudios
- Enfermería
- Venta
- Seguimiento

---

### Consulta

Registro clínico realizado por el médico. Incluye:

- Motivo
- Diagnóstico principal
- Diagnósticos secundarios
- Hallazgos
- Observaciones
- Plan de tratamiento
- Indicaciones

---

### Diagnóstico

La clínica utilizará diagnóstico formal. Estructura:

- Diagnóstico Principal
- Diagnósticos Secundarios
- Hallazgos
- Observaciones
- Plan de Tratamiento

---

### Estudio

Tipos iniciales:

- Resonancia
- Laboratorio
- Ecografía
- Otros

---

### Signos Vitales

Incluye:

- Presión arterial
- Peso
- Altura
- Saturación
- Temperatura

---

### Tratamiento

No existe catálogo fijo. Todo tratamiento es **personalizado**. Un tratamiento está compuesto por:

- Medicamentos
- Indicaciones
- Dosificación
- Duración
- Observaciones

Opcionalmente puede tener un nombre interno.

---

### Receta

Incluye:

- Medicamento
- Dosis
- Frecuencia
- Duración
- Observaciones

---

### Venta

Una venta puede incluir:

- Tratamiento
- Medicamentos
- Resonancia
- Sueros
- Servicios
- Estudios

**Campos:**

- Paciente
- Fecha
- Productos
- Cantidades
- Monto
- Forma de pago

---

### Seguimiento

Representa una tarea de contacto futuro.

**Estados:**

- Pendiente
- Realizado
- Mejoró
- No Mejoró
- No Responde
- Quiere Volver
- Requiere Nueva Visita
- Requiere Llamada del Médico
- Cancelado

---

### Inventario

Incluye:

- Producto
- Stock Actual
- Stock Mínimo
- Entradas
- Salidas
- Precio Referencial
- Costo Referencial

---

## 12. Aplicaciones Clínicas

Toda aplicación realizada por enfermería debe registrar:

- Paciente
- Fecha
- Hora
- Responsable
- Medicamento
- Cantidad
- Observaciones

**Ejemplos:** Ampollas, Inyecciones, Sueros, Vitaminas

---

## 13. Estados de la Visita

- En Recepción
- En Consulta
- En Enfermería
- En Administración
- Finalizada
- Abandonó Atención
- Cancelada

---

## 13.1 Ruta De Atención Y Comunicación Entre Áreas

La atención del paciente debe funcionar como una ruta coordinada entre áreas.

Cada área involucrada debe recibir información actualizada cuando otra área registre una indicación, cambio de estado o tarea que afecte su trabajo.

Ejemplo:

```
Médico registra indicación de suero ABC
↓
La visita del paciente se actualiza
↓
Enfermería recibe la indicación en su lista de trabajo
↓
Enfermería aplica el suero y registra el resultado
↓
El expediente del paciente queda actualizado
```

Principios:

- La información relevante debe viajar con la visita del paciente.
- Cada área debe ver solo lo necesario para ejecutar su parte del proceso.
- Las indicaciones del médico deben llegar a enfermería o administración sin depender de mensajes verbales.
- Los cambios de estado deben reflejar dónde está el paciente y qué área debe atenderlo.
- Toda acción debe quedar registrada en el historial cronológico del paciente.
- La comunicación entre áreas debe ocurrir en tiempo real o con actualización inmediata suficiente para operar durante la atención.

Áreas involucradas:

- Recepción: registra llegada y deriva a consulta.
- Médico: registra consulta, diagnóstico, indicaciones, tratamiento, receta o estudios requeridos.
- Enfermería: recibe indicaciones clínicas operativas, registra signos vitales, estudios y aplicaciones.
- Administración: recibe ventas, cobros, productos o servicios pendientes.
- Seguimiento: recibe tareas posteriores a la atención cuando corresponda.

Esta regla aplica a toda visita activa.

---

## 14. Reglas de Negocio

**Consulta Gratuita**
La consulta gratuita forma parte del flujo comercial de la clínica.

**Pacientes Familiares**
Cada integrante debe tener expediente independiente.

**Paciente Puede Llegar Sin Cita**
El sistema debe soportar atención por llegada.

**Tratamientos Personalizados**
Todos los tratamientos son personalizados.

**Inventario Automático**
Toda venta debe descontar inventario automáticamente.

```
Venta
↓
Salida Automática de Stock
```

**Movimientos de Inventario — Tipos:**

- Entrada
- Salida Automática por Venta
- Ajuste Manual Autorizado

**Resonancia**
Toda resonancia debe quedar asociada al expediente del paciente.

**Historia Clínica**
Toda la historia clínica debe ser cronológica.

**Comunicación Operativa En Tiempo Real**
Cada área debe recibir las indicaciones, tareas y cambios de estado que le corresponden durante la atención del paciente.

El sistema debe evitar que la clínica dependa únicamente de comunicación verbal para ejecutar indicaciones médicas, aplicaciones de enfermería, cobros, entrega de productos o seguimientos.

```
Área Origen
↓
Indicación / Tarea / Cambio de Estado
↓
Ruta Activa del Paciente
↓
Área Destino
↓
Ejecución y Registro
```

---

## 15. Dashboard de Dirección

Debe mostrar:

- Pacientes Nuevos
- Pacientes Atendidos
- Ventas del Día
- Ventas del Mes
- Seguimientos Pendientes
- Productos con Stock Bajo
- Pacientes por Diagnóstico
- Pacientes por Fuente de Captación

---

## 16. Roadmap V3

### V3.1 — Pacientes y Flujo Base

- Usuarios
- Roles
- Pacientes
- Recepción
- Visitas
- Leads

### V3.2 — Atención Médica

- Consulta
- Diagnósticos
- Evolución
- Tratamientos
- Recetas

### V3.3 — Estudios y Enfermería

- Resonancia
- Laboratorios
- Signos Vitales
- Aplicaciones Clínicas

### V3.4 — Administración y Ventas

- Ventas
- Cobros
- Productos Entregados

### V3.5 — Seguimiento

- Recordatorios
- Llamadas
- Historial de Seguimiento

### V3.6 — Inventario

- Stock
- Movimientos
- Alertas
- Proveedores

---

## 17. Alcance Excluido

No forma parte de V3:

- App móvil nativa
- IA avanzada
- ERP completo
- Multi sucursal
- Telemedicina
- Pacientes remotos
- Portal de pacientes
- Facturación avanzada

---

## 18. Evolución Futura

Versiones futuras podrán incorporar:

- Pacientes remotos
- Envíos nacionales
- WhatsApp API
- Portal de pacientes
- Aplicación móvil
- ERP Clínico completo
- Multi sucursal
- Inteligencia Artificial

---

## 19. Resumen Ejecutivo

El Sistema de Gestión Clínica y Operativa de Salud Intercultural tendrá como objetivo central digitalizar toda la operación de la clínica, manteniendo al **paciente como núcleo** de la plataforma.

Cada registro, estudio, tratamiento, venta o seguimiento deberá quedar asociado al expediente único del paciente, permitiendo construir una **historia clínica completa y cronológica** a lo largo del tiempo.

El sistema se desarrollará bajo una estrategia **Mobile First** y evolucionará progresivamente mediante las fases V3.1 a V3.6 hasta convertirse en la plataforma operativa principal de la clínica.
