/**
 * Códigos de aviso que el gate de módulos deja en `?aviso=` al redirigir al
 * inicio. Viven aparte de las guardas de servidor para que el componente de
 * avisos, que es cliente, pueda leerlos sin arrastrar código de servidor.
 *
 * Los dos casos se distinguen a propósito: no es lo mismo que la persona no
 * tenga acceso a que la clínica todavía no haya lanzado ese módulo.
 */
export const moduleDisabledNotice = "modulo-no-disponible";
export const permissionDeniedNotice = "permiso-denegado";
