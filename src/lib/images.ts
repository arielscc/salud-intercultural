export const imagePlaceholder =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAzMiAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBzdG9wLWNvbG9yPSIjZTdmMmVkIi8+PHN0b3Agb2Zmc2V0PSIwLjU1IiBzdG9wLWNvbG9yPSIjZjhmNWYwIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZDdlOGUxIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNnKSIgd2lkdGg9IjMyIiBoZWlnaHQ9IjI0Ii8+PC9zdmc+";

export const publicImageSizes = {
  hero: "(min-width: 1024px) 46vw, 100vw",
  aboutFeature: "(min-width: 1024px) 42vw, 100vw",
  serviceCard: "(min-width: 1024px) 33vw, 100vw",
  serviceThumb: "(min-width: 1024px) 220px, 100vw",
  teamPortrait: "(min-width: 1024px) 260px, 100vw",
  gallery: "(min-width: 768px) 33vw, 100vw"
} as const;

export const publicImageAspectRatios = {
  hero: "4 / 5",
  serviceCard: "16 / 10",
  serviceThumb: "13 / 14",
  teamPortrait: "4 / 5",
  gallery: "4 / 3"
} as const;

export function getImageAlt(preferred: string | null | undefined, fallback: string) {
  const normalized = preferred?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}
