"use client";

import { useEffect, useRef, useState } from "react";
import { loadPdfjs } from "@/components/internal/generated-documents/loadPdfjs";

/**
 * Vista previa de PDF a prueba de gestores de descarga (IDM, FDM, etc.). El
 * navegador nunca "abre un PDF": traemos los bytes por `fetch` y los rasterizamos
 * con pdf.js dibujando cada página en un `<canvas>`. Como no se navega a ningún
 * recurso `application/pdf`, esas extensiones no tienen nada que capturar.
 */
export function PdfPreviewFrame({ src, title }: { src: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    "loading"
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const container = containerRef.current;

    async function renderPdf() {
      try {
        const pdfjs = await loadPdfjs();

        const response = await fetch(src, {
          signal: controller.signal,
          credentials: "same-origin"
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = new Uint8Array(await response.arrayBuffer());
        if (cancelled || !container) return;

        const pdf = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;
        container.replaceChildren();

        const dpr = window.devicePixelRatio || 1;
        const targetWidth = container.clientWidth || 800;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          if (cancelled) return;

          const base = page.getViewport({ scale: 1 });
          const cssScale = targetWidth / base.width;
          const viewport = page.getViewport({ scale: cssScale * dpr });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.className = "mx-auto mb-3 block max-w-full rounded-[4px] shadow-sm";
          const context = canvas.getContext("2d");
          if (!context) continue;

          container.appendChild(canvas);
          await page.render({ canvas, canvasContext: context, viewport }).promise;
          if (cancelled) return;
        }

        if (!cancelled) setStatus("ready");
      } catch {
        if (!controller.signal.aborted && !cancelled) setStatus("failed");
      }
    }

    void renderPdf();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [src]);

  return (
    <div className="relative h-[70vh] min-h-[420px] w-full overflow-auto bg-surface-soft p-3 sm:min-h-[720px] sm:p-4">
      {status !== "ready" ? (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted">
          {status === "failed"
            ? "No se pudo cargar la vista previa. Usa «Descargar PDF» o «Imprimir copia»."
            : "Cargando vista previa…"}
        </div>
      ) : null}
      <div ref={containerRef} aria-label={title} />
    </div>
  );
}
