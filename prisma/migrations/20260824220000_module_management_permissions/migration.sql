-- Tarea 5 del lanzamiento por etapas: permisos de la pantalla de módulos.
--
-- `modules_read` deja ver el estado y el historial; `modules_manage` permite
-- encender y apagar. Ambos pertenecen al núcleo, así que el gate de módulos
-- nunca los bloquea: sin ellos no habría forma de volver a encender nada.
--
-- Migración aditiva: solo agrega valores al enum, no altera ninguna tabla.

ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'modules_read';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'modules_manage';
