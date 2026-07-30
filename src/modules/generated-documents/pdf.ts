import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage
} from "pdf-lib";
import type { GeneratedDocumentSnapshot } from "@/modules/generated-documents/types";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const TEXT = rgb(0.08, 0.1, 0.12);
const MUTED = rgb(0.34, 0.37, 0.4);
const GREEN = rgb(0.08, 0.42, 0.27);

function pdfText(value: string) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function money(cents: number) {
  return `Bs ${(cents / 100).toFixed(2)}`;
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = pdfText(text).split(/\s+/);
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

class Writer {
  page: PDFPage;
  y = PAGE_HEIGHT - MARGIN;

  constructor(
    private readonly pdf: PDFDocument,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont
  ) {
    this.page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  }

  private ensure(height: number) {
    if (this.y - height >= MARGIN) return;
    this.page = this.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  line(
    text: string,
    options: {
      size?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
      gap?: number;
      width?: number;
    } = {}
  ) {
    const size = options.size ?? 10;
    const font = options.bold ? this.bold : this.regular;
    const lines = wrap(
      text,
      font,
      size,
      options.width ?? PAGE_WIDTH - MARGIN * 2
    );
    const lineHeight = size * 1.35;
    this.ensure(lines.length * lineHeight + (options.gap ?? 0));
    for (const value of lines) {
      this.page.drawText(value, {
        x: MARGIN,
        y: this.y,
        size,
        font,
        color: options.color ?? TEXT
      });
      this.y -= lineHeight;
    }
    this.y -= options.gap ?? 0;
  }

  row(label: string, value: string, strong = false) {
    this.ensure(18);
    this.page.drawText(pdfText(label), {
      x: MARGIN,
      y: this.y,
      size: 9,
      font: this.regular,
      color: MUTED
    });
    this.page.drawText(pdfText(value), {
      x: 225,
      y: this.y,
      size: 9,
      font: strong ? this.bold : this.regular,
      color: TEXT
    });
    this.y -= 17;
  }

  rule(gap = 14) {
    this.ensure(gap + 1);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.7,
      color: rgb(0.82, 0.84, 0.85)
    });
    this.y -= gap;
  }
}

function header(writer: Writer, snapshot: GeneratedDocumentSnapshot, title: string) {
  writer.line(snapshot.clinic.name, {
    size: 13,
    bold: true,
    color: GREEN,
    gap: 2
  });
  writer.line(`${snapshot.clinic.address} - ${snapshot.clinic.city}`, {
    size: 8,
    color: MUTED
  });
  writer.line(`Contacto: ${snapshot.clinic.phone}`, {
    size: 8,
    color: MUTED,
    gap: 10
  });
  writer.line(title, { size: 18, bold: true, gap: 2 });
  writer.line(
    `${snapshot.documentNumber} - Version ${snapshot.version} - Emitido ${dateTime(snapshot.issuedAt)}`,
    { size: 9, color: MUTED, gap: 10 }
  );
  writer.rule();
  writer.line("Paciente", { size: 11, bold: true, gap: 3 });
  writer.row("Nombre", snapshot.patient.fullName, true);
  writer.row("Codigo interno", snapshot.patient.internalCode);
  writer.row(
    "Documento de identidad",
    snapshot.patient.identityDocument ?? "No registrado"
  );
  writer.rule();
}

function drawPrescription(
  writer: Writer,
  snapshot: Extract<GeneratedDocumentSnapshot, { kind: "prescription" }>
) {
  header(writer, snapshot, "RECETA MEDICA");
  writer.line(
    `Receta clinica ${snapshot.prescription.clinicalVersion} registrada ${dateTime(snapshot.prescription.createdAt)}`,
    { size: 9, color: MUTED, gap: 8 }
  );
  snapshot.prescription.items.forEach((item, index) => {
    writer.line(`${index + 1}. ${item.medication}`, {
      size: 12,
      bold: true,
      gap: 3
    });
    if (item.dose) writer.row("Dosis", item.dose);
    if (item.frequency) writer.row("Frecuencia", item.frequency);
    if (item.duration) writer.row("Duracion", item.duration);
    if (item.observations) {
      writer.line(`Observaciones: ${item.observations}`, {
        size: 9,
        gap: 8
      });
    }
  });
  writer.rule(22);
  writer.line(
    `${snapshot.professional.professionalTitle} ${snapshot.professional.displayName}`,
    { size: 11, bold: true, gap: 2 }
  );
  writer.line(`Especialidad: ${snapshot.professional.specialty}`, { size: 9 });
  writer.line(
    `Registro Ministerio de Salud: ${snapshot.professional.ministryRegistration}`,
    { size: 9 }
  );
  writer.line(
    `Registro Colegio Medico: ${snapshot.professional.medicalCollegeRegistration}`,
    { size: 9, gap: 28 }
  );
  writer.line("Firma y sello del profesional", {
    size: 9,
    color: MUTED,
    gap: 8
  });
  writer.rule(8);
  writer.line(
    "Documento preparado por SIGECO. Requiere firma y sello del profesional para su entrega.",
    { size: 8, color: MUTED }
  );
}

function drawReceipt(
  writer: Writer,
  snapshot: Extract<
    GeneratedDocumentSnapshot,
    { kind: "internal_sale_receipt" }
  >
) {
  header(writer, snapshot, "COMPROBANTE INTERNO DE VENTA");
  writer.line("NO ES FACTURA FISCAL", {
    size: 13,
    bold: true,
    color: rgb(0.72, 0.12, 0.12),
    gap: 12
  });
  writer.line("Conceptos", { size: 11, bold: true, gap: 5 });
  snapshot.sale.items.forEach((item) => {
    writer.line(item.description, { size: 10, bold: true });
    writer.line(
      `${item.quantity} x ${money(item.unitPriceCents)} = ${money(item.totalCents)}`,
      { size: 9, color: MUTED, gap: 6 }
    );
  });
  writer.rule();
  writer.row("Subtotal", money(snapshot.sale.subtotalCents));
  writer.row("Descuento", money(snapshot.sale.discountCents));
  writer.row("Total", money(snapshot.sale.totalCents), true);
  writer.row("Pagado efectivo", money(snapshot.sale.paidCents));
  writer.row("Saldo", money(snapshot.sale.balanceCents), true);
  writer.rule();
  writer.line("Pagos registrados", { size: 11, bold: true, gap: 5 });
  if (snapshot.sale.payments.length === 0) {
    writer.line("Sin pagos registrados.", { size: 9, color: MUTED });
  }
  snapshot.sale.payments.forEach((payment) => {
    writer.line(
      `${dateTime(payment.paidAt)} - ${payment.method} - ${money(payment.effectiveCents)}`,
      { size: 9, bold: true }
    );
    if (payment.refundedCents > 0) {
      writer.line(`Devuelto: ${money(payment.refundedCents)}`, {
        size: 8,
        color: MUTED
      });
    }
    if (payment.reference) {
      writer.line(`Referencia: ${payment.reference}`, {
        size: 8,
        color: MUTED
      });
    }
  });
  writer.rule(10);
  writer.line(`Registrado por: ${snapshot.generatedBy.name}`, {
    size: 8,
    color: MUTED
  });
  writer.line(
    "Este comprobante registra una operacion interna de SIGECO y no sustituye una factura autorizada por Impuestos Nacionales.",
    { size: 8, color: MUTED }
  );
}

export async function createGeneratedDocumentPdf(
  snapshot: GeneratedDocumentSnapshot
) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(snapshot.documentNumber);
  pdf.setAuthor(snapshot.clinic.name);
  pdf.setCreator("SIGECO");
  pdf.setCreationDate(new Date(snapshot.issuedAt));
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const writer = new Writer(pdf, regular, bold);

  if (snapshot.kind === "prescription") {
    drawPrescription(writer, snapshot);
  } else {
    drawReceipt(writer, snapshot);
  }
  return pdf.save();
}
