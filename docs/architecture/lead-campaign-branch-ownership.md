# Leads, Campañas Y Entradas Públicas Por Sucursal

## Decisión

La definición de una campaña es corporativa, pero debe tener una asignación
explícita mediante `CaptureCampaignBranch` para cada sede donde puede operar.
Los leads, intentos, recordatorios, cambios de estado, atribuciones y métricas
son datos locales y llevan una sola `branchCode` obligatoria.

Payload sigue siendo la fuente activa del formulario web. El modelo Prisma
`Lead` se conserva para el flujo histórico interno sin UI; ambos almacenes
aplican la misma regla de tenencia y no se convierten en copias editables entre
sí.

## Entrada Pública

`POST /api/leads` resuelve la sede antes de llamar a Payload. Nunca lee una
`branchCode` enviada por el navegador. Admite, en este orden:

1. una prueba `branch_proof` firmada para el código `camp` y con vencimiento;
2. el hostname exacto configurado en `PUBLIC_LEAD_HOST_BRANCH_MAP`;
3. `PUBLIC_LEAD_FORM_BRANCH_CODE`, únicamente para un despliegue cuyo
   formulario pertenezca de forma inequívoca a una sede.

La sucursal debe existir y estar activa. Si la prueba está presente pero es
inválida, no se intenta otra vía: el endpoint devuelve `422` con
`branch_not_resolved` y no persiste nombre, teléfono, correo ni mensaje.

Los enlaces firmados se construyen exclusivamente en servidor con
`createPublicLeadBranchProof` y `PUBLIC_LEAD_BRANCH_SIGNING_SECRET`. Un ejemplo
de URL resultante es:

```text
/contacto?camp=CBBA-AGOSTO&branch_proof=v1.cochabamba.1798761600.firma
```

El valor real de la firma nunca se documenta ni se reutiliza como secreto de
Payload.

## Aislamiento Y Consistencia

- La idempotencia se deriva de `sucursal + Idempotency-Key`.
- La clave de deduplicación se deriva de `sucursal + teléfono normalizado`.
- Los editores de Payload solo leen y actualizan leads de su
  `payloadBranch`; los administradores conservan la administración corporativa.
- Un código de campaña solo se guarda como atribución si la campaña está
  asignada a la sede resuelta.
- `VisitAttribution` toma la sede de la visita y sus touches heredan la misma
  sede mediante claves compuestas.
- Los reportes y exportaciones exigen una sede y filtran antes de agregar.
- Convertir un lead en paciente, nuevo o existente, crea únicamente
  `PatientBranchRecord` en la sede del lead.

## Migración Y Reconciliación

1. Aplicar `20260909150000_lead_campaign_branch_scope`.
2. Ejecutar `pnpm branch:reconcile:leads` en dry-run.
3. Resolver los IDs técnicos ambiguos con el archivo de decisiones y volver a
   ejecutar con `--apply --confirm=APPLY_BRANCH_RECONCILIATION`.
4. Actualizar el schema Payload y ejecutar
   `pnpm branch:reconcile:payload-leads` con el mismo procedimiento.
5. Ejecutar ambos comandos con `--assert-ready`.
6. Aplicar `20260909160000_harden_lead_campaign_branch_scope`.

Los reportes de reconciliación contienen IDs técnicos, estados y códigos de
sucursal; nunca imprimen PII ni contenido clínico. Una campaña histórica sin
resultados no recibe una sede inventada: se asigna explícitamente en Payload.
