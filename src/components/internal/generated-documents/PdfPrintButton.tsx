"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/internal/ui/Button";
import { loadPdfjs } from "@/components/internal/generated-documents/loadPdfjs";

/**
 * Imprime la receta sin descargarla ni abrir el visor de PDF: rasteriza cada
 * página con pdf.js, arma un iframe oculto con las imágenes y dispara el diálogo
 * de impresión. Al no navegar a un recurso `application/pdf`, los gestores de
 * descarga (IDM, etc.) no interceptan la acción.
 */
export function PdfPrintButton({ src }: { src: string }) {
  const [busy, setBusy] = useState(false);

  async function handlePrint() {
    if (busy) return;
    setBusy(true);
    try {
      const pdfjs = await loadPdfjs();
      // `purpose=print` deja el registro de auditoría de reimpresión en el servidor.
      const response = await fetch(`${src}?purpose=print`, {
        credentials: "same-origin"
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = new Uint8Array(await response.arrayBuffer());

      const pdf = await pdfjs.getDocument({ data }).promise;
      const images: string[] = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const base = page.getViewport({ scale: 1 });
        // ~150 DPI para una hoja A4: legible al imprimir sin pesar de más.
        const viewport = page.getViewport({ scale: 1240 / base.width });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const context = canvas.getContext("2d");
        if (!context) continue;
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        images.push(canvas.toDataURL("image/png"));
      }
      if (images.length === 0) throw new Error("Sin páginas");

      await printImages(images);
    } catch {
      toast.error("No se pudo preparar la impresión. Intenta con «Descargar PDF».");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" size="sm" onClick={handlePrint} disabled={busy}>
      <Printer className="h-4 w-4" aria-hidden="true" />
      {busy ? "Preparando…" : "Imprimir copia"}
    </Button>
  );
}

function printImages(images: string[]) {
  return new Promise<void>((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (!doc) {
      iframe.remove();
      resolve();
      return;
    }

    const body = images
      .map((source) => `<img src="${source}" alt="" />`)
      .join("");
    doc.open();
    doc.write(
      `<!doctype html><html><head><meta charset="utf-8" />` +
        `<style>` +
        `@page{margin:0}` +
        `html,body{margin:0;padding:0}` +
        `img{display:block;width:100%;page-break-after:always}` +
        `img:last-child{page-break-after:auto}` +
        `</style></head><body>${body}</body></html>`
    );
    doc.close();

    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      // Se retira tras un margen para no cortar el diálogo de impresión.
      window.setTimeout(() => iframe.remove(), 1000);
      resolve();
    };

    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      cleanup();
      return;
    }

    // Espera a que carguen todas las imágenes antes de imprimir.
    const imgs = Array.from(doc.images);
    let pending = imgs.length;
    const start = () => {
      frameWindow.focus();
      // print() es bloqueante: al retornar, el usuario ya imprimió o canceló.
      // Resolvemos aquí para no depender de onafterprint (que al cancelar puede
      // no dispararse y dejaría el botón trabado en "Preparando…").
      frameWindow.print();
      cleanup();
    };
    if (pending === 0) {
      start();
      return;
    }
    imgs.forEach((img) => {
      if (img.complete) {
        pending -= 1;
        if (pending === 0) start();
        return;
      }
      img.addEventListener("load", () => {
        pending -= 1;
        if (pending === 0) start();
      });
      img.addEventListener("error", () => {
        pending -= 1;
        if (pending === 0) start();
      });
    });
  });
}
