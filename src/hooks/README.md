# Hooks

Hooks reutilizables compartidos entre features y componentes.

Reglas:

- Solo hooks genericos viven aqui.
- Hooks especificos de dominio viven dentro de `src/features/<feature>/`.
- Todo hook que use estado, efectos o APIs del navegador debe consumirse desde Client Components.
