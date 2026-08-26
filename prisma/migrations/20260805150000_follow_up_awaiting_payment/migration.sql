-- Estado nuevo para seguimientos agendados por el médico que aún no se pagan.
-- Se activan (pasan a `pending`) cuando el paciente paga el tratamiento.
ALTER TYPE "FollowUpStatus" ADD VALUE IF NOT EXISTS 'awaiting_payment';
