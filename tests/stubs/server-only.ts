/*
 * Sustituto de `server-only` para las pruebas.
 *
 * `server-only` no es un paquete instalado: lo resuelve el empaquetador de Next
 * y su único trabajo es romper el build si un módulo de servidor termina en el
 * bundle del navegador. Vitest no empaqueta para el navegador, así que aquí no
 * hay nada que proteger y sin este sustituto el import no resuelve.
 *
 * No debilita la guarda: la que cuenta la sigue aplicando `next build`.
 */
export {};
