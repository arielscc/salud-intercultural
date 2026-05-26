# Leads

Los leads llegan por el formulario publico y se guardan en Payload/DB mediante `/api/leads`.

## Flujo

1. `ContactLeadForm` valida en cliente con React Hook Form y Zod.
2. El submit envia `POST /api/leads`.
3. El route handler valida con `createLeadSchema`.
4. Se aplica honeypot con el campo `website`.
5. Se aplica rate limit por IP y telaofono.
6. Se persiste con `createLeadRecord`.
7. El lead aparece en `/admin` dentro de `lead-submissions`.

## Estados

- `new`
- `contacted`
- `scheduled`
- `closed`
- `lost`

Cuando un lead cambia a `contacted`, `scheduled` o `closed`, Payload actualiza `contactedAt`.

## Revisar Leads

En `/admin`:

1. Abrir grupo `Comercial`.
2. Entrar a `Leads`.
3. Buscar por nombre, telaofono o email.
4. Usar acciones rapidas de WhatsApp o llamada en el detalle.
5. Actualizar estado y notas internas.

## API

Endpoint:

```txt
POST /api/leads
```

Respuestas relevantes:

- `201`: lead creado.
- `400`: payload invaelido o honeypot.
- `429`: rate limit.
- `500`: error de persistencia.

## Variables

```env
RATE_LIMIT_MAX="10"
RATE_LIMIT_WINDOW_SECONDS="60"
```
