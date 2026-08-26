/**
 * Catálogo de módulos de SIGECO.
 *
 * Un módulo es una parte del sistema que se enciende o se apaga desde el super
 * administrador para lanzar la operación por etapas. El catálogo y las
 * dependencias viven en código, versionados; la base de datos solo guarda el
 * estado de cada módulo y su historial (Tarea 2).
 *
 * Plan: docs/project/sigeco-lanzamiento-por-etapas/tasks.md
 */

export const sigecoModuleCodes = [
  "core",
  "administracion",
  "inventario",
  "compras",
  "catalogo",
  "recepcion",
  "consulta",
  "enfermeria",
  "seguimientos",
  "opiniones",
  "reportes"
] as const;

export type SigecoModuleCode = (typeof sigecoModuleCodes)[number];

export type SigecoModule = {
  code: SigecoModuleCode;
  name: string;
  /** Qué cubre el módulo, en el lenguaje del personal. */
  description: string;
  /**
   * Dependencias duras: no se puede activar el módulo mientras alguna de estas
   * siga apagada, ni apagar una mientras este siga encendido.
   */
  dependsOn: readonly SigecoModuleCode[];
  /**
   * El núcleo no se apaga: sin él nadie puede entrar al sistema ni administrar
   * los demás módulos.
   */
  alwaysActive?: true;
};

/** Orden de presentación: núcleo, Etapa 1, y después cada etapa siguiente. */
export const sigecoModules: readonly SigecoModule[] = [
  {
    code: "core",
    name: "Núcleo",
    description:
      "Inicio, mi cuenta, usuarios, auditoría, sucursales y configuración de documentos.",
    dependsOn: [],
    alwaysActive: true
  },
  {
    code: "administracion",
    name: "Caja y Administración",
    description: "Ventas, cobros, pagos, Caja, egresos, cierre diario y recibos internos.",
    dependsOn: []
  },
  {
    code: "inventario",
    name: "Inventario",
    description: "Productos, proveedores, stock, lotes, ajustes y traslados.",
    dependsOn: []
  },
  {
    code: "compras",
    name: "Compras",
    description: "Órdenes de compra, pagos a proveedor y recepciones.",
    dependsOn: ["inventario"]
  },
  {
    code: "catalogo",
    name: "Catálogo",
    description: "Servicios, tratamientos y estudios vendibles, con sus precios y topes.",
    dependsOn: []
  },
  {
    code: "recepcion",
    name: "Recepción",
    description:
      "Llegadas, ficha del paciente, visitas, duplicados, consentimientos y abandono.",
    dependsOn: []
  },
  {
    code: "consulta",
    name: "Consulta médica",
    description:
      "Consulta, catálogos clínicos, pedido del médico, propuestas de tratamiento y recetas.",
    dependsOn: ["recepcion"]
  },
  {
    code: "enfermeria",
    name: "Enfermería",
    description: "Tareas, signos vitales, aplicaciones, estudios y sesiones de servicio.",
    dependsOn: ["consulta"]
  },
  {
    code: "seguimientos",
    name: "Seguimiento",
    description: "Tareas de contacto posterior y recordatorios supervisados.",
    dependsOn: ["recepcion"]
  },
  {
    code: "opiniones",
    name: "Opiniones",
    description: "Encuestas, reclamos y casos con responsable y plazo.",
    dependsOn: ["recepcion"]
  },
  {
    code: "reportes",
    name: "Reportes",
    description: "Recorrido completo, tiempos por área y captación.",
    dependsOn: ["recepcion"]
  }
];

const modulesByCode = new Map<SigecoModuleCode, SigecoModule>(
  sigecoModules.map((entry) => [entry.code, entry])
);

export function getSigecoModule(code: SigecoModuleCode): SigecoModule {
  const entry = modulesByCode.get(code);
  // El tipo ya lo garantiza; esto protege contra un catálogo incompleto.
  if (!entry) throw new Error(`Módulo desconocido: ${code}`);
  return entry;
}

/** Módulos que nunca se apagan, cualquiera sea el estado guardado en base. */
export const alwaysActiveModuleCodes: readonly SigecoModuleCode[] = sigecoModules
  .filter((entry) => entry.alwaysActive)
  .map((entry) => entry.code);

/**
 * Módulos que se activan en cada etapa de lanzamiento. Es documentación
 * ejecutable del plan: la activación real la hace el super administrador.
 */
export const sigecoLaunchStages: readonly {
  stage: number;
  name: string;
  modules: readonly SigecoModuleCode[];
}[] = [
  {
    stage: 1,
    name: "Caja y Administración",
    modules: ["administracion", "inventario", "compras", "catalogo"]
  },
  { stage: 2, name: "Recepción", modules: ["recepcion"] },
  { stage: 3, name: "Clínica", modules: ["consulta", "enfermeria"] },
  { stage: 4, name: "Gestión", modules: ["seguimientos", "opiniones", "reportes"] }
];
