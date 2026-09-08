# Acceso Local Explícito A Cochabamba

Fecha: 2026-09-07.

## Alcance

- Agregar un comando inequívoco para levantar el piloto local de Cochabamba.
- Reemplazar la credencial de prueba anterior por la solicitada y cerrar sus
  sesiones existentes.

## Implementación

- `pnpm cochabamba:dev` carga `.env.piloto` y ejecuta Next en
  `http://127.0.0.1:3001`.
- No se guarda la contraseña de prueba en `package.json` ni en documentación
  versionada.
- La cuenta se actualiza sobre su misma identidad interna porque los eventos de
  auditoría son inmutables y referencian al usuario con `RESTRICT`. Así deja de
  existir la credencial anterior sin borrar ni falsificar el historial.
- Se invalidan las sesiones anteriores, se conserva Cochabamba como sucursal
  predeterminada y el rol final solicitado es `super_admin`.

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado.
- `pnpm cochabamba:dev`: Next quedó disponible en `127.0.0.1:3001`.
- `GET /sigeco/login`: HTTP 200.
- Inicio de sesión con la nueva cuenta: redirección a `/sigeco`, HTTP 200 y
  contexto visible de Cochabamba con Administración.
