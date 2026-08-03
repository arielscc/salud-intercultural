-- Rol "seguimiento" deprecado (2026-08-02): el seguimiento de pacientes lo hace
-- ahora Recepcion. Las cuentas con rol seguimiento se reasignan a recepcion.
-- El valor del enum permanece en "InternalRole" por el historial y la auditoria,
-- igual que ocurrio con "captacion".

UPDATE "InternalUser"
SET "role" = 'recepcion'
WHERE "role" = 'seguimiento';
