-- Motivo de abandono cuando el paciente fue derivado al médico pero no entró a
-- la consulta dentro de su día de atención (barrido diario en Consultas).
ALTER TYPE "VisitDiscontinuationReason" ADD VALUE 'no_show' BEFORE 'other';
