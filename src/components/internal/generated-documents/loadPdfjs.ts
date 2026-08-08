// Cargador único de pdf.js para el navegador: importa el módulo de forma dinámica
// (solo pesa en las pantallas que lo usan) y fija el worker una sola vez. Lo
// comparten la vista previa y la impresión, ambas a prueba de gestores de descarga.
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

export function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      return pdfjs;
    });
  }
  return pdfjsPromise;
}
