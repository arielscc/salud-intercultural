export const internalDesignSystem = {
  viewportBase: "390px",
  palette: {
    primary: "teal medico",
    secondary: "verde intercultural",
    surface: "superficies claras de trabajo",
    border: "bordes definidos",
    priority: {
      pending: "ambar operativo",
      active: "teal activo",
      overdue: "rojo critico",
      completed: "verde completado"
    }
  },
  density: {
    shell: "compacta",
    forms: "secciones progresivas",
    lists: "cards escaneables en mobile"
  },
  radius: {
    panels: "rounded-2xl",
    controls: "rounded-xl",
    pills: "rounded-full"
  }
} as const;
