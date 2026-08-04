import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { clinic } from "@/data/clinic";

// Recibo para impresora térmica de 80 mm (ancho fijo, alto según el contenido).
// Muestra ítems + cantidad + total; NO incluye el costo por unidad (ese detalle
// es de uso exclusivo del médico).
const WIDTH = 226.77; // 80 mm en puntos
const MARGIN = 12;
const CONTENT = WIDTH - MARGIN * 2;
const TEXT = rgb(0.08, 0.1, 0.12);
const MUTED = rgb(0.34, 0.37, 0.4);
const LINE = rgb(0.72, 0.74, 0.76);

export type ThermalReceiptData = {
  saleId: string;
  issuedAt: Date;
  patient: { fullName: string; internalCode: string };
  items: Array<{ description: string; quantity: number }>;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
};

function sanitize(value: string) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function money(cents: number) {
  return `Bs ${(cents / 100).toFixed(2)}`;
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = sanitize(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

type Op = { height: number; draw: (page: PDFPage, top: number) => void };

export async function createThermalReceiptPdf(data: ThermalReceiptData) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const ops: Op[] = [];

  const textLine = (
    text: string,
    options: {
      size?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
      align?: "left" | "center";
      gap?: number;
    } = {}
  ) => {
    const size = options.size ?? 8;
    const font = options.bold ? bold : regular;
    const rows = wrap(text, font, size, CONTENT);
    const lineHeight = size * 1.34;
    ops.push({
      height: rows.length * lineHeight + (options.gap ?? 0),
      draw: (page, top) => {
        let cursor = top;
        for (const row of rows) {
          const width = font.widthOfTextAtSize(row, size);
          const x = options.align === "center" ? MARGIN + (CONTENT - width) / 2 : MARGIN;
          page.drawText(row, { x, y: cursor - size, size, font, color: options.color ?? TEXT });
          cursor -= lineHeight;
        }
      }
    });
  };

  const kv = (
    label: string,
    value: string,
    options: { size?: number; bold?: boolean } = {}
  ) => {
    const size = options.size ?? 8;
    const font = options.bold ? bold : regular;
    ops.push({
      height: size * 1.6,
      draw: (page, top) => {
        page.drawText(sanitize(label), {
          x: MARGIN,
          y: top - size,
          size,
          font: regular,
          color: MUTED
        });
        const clean = sanitize(value);
        const valueWidth = font.widthOfTextAtSize(clean, size);
        page.drawText(clean, {
          x: WIDTH - MARGIN - valueWidth,
          y: top - size,
          size,
          font,
          color: TEXT
        });
      }
    });
  };

  const rule = (gap = 4) => {
    ops.push({
      height: gap * 2 + 1,
      draw: (page, top) => {
        const y = top - gap;
        const dash = 3;
        for (let x = MARGIN; x < WIDTH - MARGIN; x += dash * 2) {
          page.drawLine({
            start: { x, y },
            end: { x: Math.min(x + dash, WIDTH - MARGIN), y },
            thickness: 0.6,
            color: LINE
          });
        }
      }
    });
  };

  textLine(clinic.shortName, { size: 11, bold: true, align: "center", gap: 1 });
  textLine(clinic.name, { size: 6.5, color: MUTED, align: "center", gap: 1 });
  textLine(`${clinic.displayAddress} - ${clinic.city}`, {
    size: 6.5,
    color: MUTED,
    align: "center",
    gap: 1
  });
  textLine(`Tel: ${clinic.whatsapp}`, { size: 6.5, color: MUTED, align: "center", gap: 4 });
  rule();
  textLine("RECIBO DE ATENCION", { size: 9, bold: true, align: "center", gap: 1 });
  textLine("No es factura fiscal", { size: 6.5, color: MUTED, align: "center", gap: 4 });

  kv("Fecha", dateTime(data.issuedAt));
  kv("Paciente", data.patient.fullName);
  kv("Codigo", data.patient.internalCode);
  kv("Recibo", data.saleId.slice(-8).toUpperCase());
  rule();

  textLine("Detalle a entregar", { size: 8, bold: true, gap: 3 });
  for (const item of data.items) {
    textLine(item.description, { size: 8, bold: true });
    kv("Cantidad", String(item.quantity), { size: 7 });
  }
  rule();

  kv("TOTAL", money(data.totalCents), { size: 11, bold: true });
  kv("Pagado", money(data.paidCents), { size: 8 });
  kv("Saldo", money(data.balanceCents), { size: 8, bold: true });
  rule();

  textLine("Gracias por su preferencia", {
    size: 7,
    color: MUTED,
    align: "center",
    gap: 1
  });
  textLine("Conserve este recibo", { size: 6.5, color: MUTED, align: "center" });

  const contentHeight = ops.reduce((sum, op) => sum + op.height, 0);
  const height = Math.ceil(contentHeight + MARGIN * 2);
  const page = pdf.addPage([WIDTH, height]);

  let top = height - MARGIN;
  for (const op of ops) {
    op.draw(page, top);
    top -= op.height;
  }

  pdf.setTitle(`Recibo ${data.saleId}`);
  pdf.setAuthor(clinic.name);
  pdf.setCreator("SIGECO");
  pdf.setCreationDate(data.issuedAt);
  return pdf.save();
}
