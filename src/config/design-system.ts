export const publicDesignSystem = {
  palette: {
    primary: "teal medico",
    secondary: "verde intercultural",
    accent: "ambar calido",
    neutral: "superficies claras, texto profundo y bordes suaves",
    states: {
      success: "verde confirmacion",
      error: "rojo destructivo",
      loading: "primario atenuado",
      empty: "superficie suave"
    }
  },
  typography: {
    heading: "Sora",
    body: "Inter",
    scale: {
      hero: "text-4xl sm:text-5xl lg:text-6xl",
      sectionTitle: "text-3xl sm:text-4xl",
      cardTitle: "text-lg sm:text-xl",
      body: "text-base sm:text-lg"
    }
  },
  spacing: {
    section: "py-20 sm:py-24",
    sectionCompact: "py-16 sm:py-20",
    gridGap: "gap-6 sm:gap-8",
    card: "p-5 sm:p-6"
  },
  radius: {
    card: "rounded-[1.75rem]",
    media: "rounded-[2rem]",
    control: "rounded-full"
  },
  motion: {
    duration: 0.48,
    ease: [0.22, 1, 0.36, 1],
    viewport: { once: true, margin: "-80px" }
  }
} as const;
