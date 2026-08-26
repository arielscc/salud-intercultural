import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../src/modules/database";
import {
  addInventoryEntryRecord,
  createInventoryItemRecord,
  createSupplierRecord,
  updateInventoryItemMaxDiscountRecord,
  updateInventoryItemSuppliersRecord
} from "../src/modules/database/queries/inventory";
import { createServiceCatalogItemRecord } from "../src/modules/database/queries/service-catalog";
import { reportScriptError } from "./safe-error";

/*
 * Carga los datos maestros reales de la Etapa 1: proveedores, productos con su
 * precio y su stock contado, y las ofertas vendibles del catálogo.
 *
 * No inventa nada. Lee un archivo que la clínica completa y falla si falta un
 * dato en lugar de rellenarlo con un valor por defecto: un precio inventado se
 * cobra igual que uno real.
 *
 * Uso:
 *   STAGE_ONE_RESPONSIBLE_EMAIL=admin@clinica STAGE_ONE_CONFIRM=<base> pnpm stage-one:load
 *
 * Plantilla del archivo:
 *   docs/operations/plantillas/datos-maestros-etapa-1.example.json
 * El archivo real va en `.data/`, que no se versiona.
 */

const defaultDataFile = ".data/datos-maestros-etapa-1.json";
const forbiddenCodePrefixes = ["DEMO-", "QA-"];

type SupplierSpec = {
  nombre: string;
  contacto?: string;
  telefono?: string;
  whatsapp?: string;
  email?: string;
  direccion?: string;
  notas?: string;
};

type ProductSpec = {
  codigo: string;
  sku?: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  unidad: string;
  uso?: "sale" | "internal_use" | "both";
  precioVenta: string;
  costoReferencial?: string;
  descuentoMaximo?: string;
  stockMinimo?: number;
  stockContado: number;
  proveedor?: string;
};

type CatalogSpec = {
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  tipo: "service" | "treatment";
  precio: string;
  descuentoMaximo?: string;
  requiereEnfermeria?: boolean;
  sesiones?: number;
};

type MasterData = {
  sucursal?: string;
  conteoFisico: { fecha: string; responsable: string };
  proveedores?: SupplierSpec[];
  productos?: ProductSpec[];
  catalogo?: CatalogSpec[];
};

function moneyToCents(value: string, field: string) {
  const clean = value.trim();
  if (!/^\d+([.,]\d{1,2})?$/.test(clean)) {
    throw new Error(`${field}: "${value}" no es un monto válido (usa 35 o 35.50).`);
  }
  const [whole, decimals = ""] = clean.replace(",", ".").split(".");
  return Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
}

function requireText(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Falta ${field}.`);
  }
  return value.trim();
}

function assertUsableCode(code: string, field: string) {
  const upper = code.toUpperCase();
  for (const prefix of forbiddenCodePrefixes) {
    if (upper.startsWith(prefix)) {
      throw new Error(`${field}: "${code}" usa un prefijo de datos de prueba.`);
    }
  }
  return code;
}

function readMasterData(): MasterData {
  const path = resolve(process.cwd(), process.env.STAGE_ONE_DATA_FILE ?? defaultDataFile);

  try {
    return JSON.parse(readFileSync(path, "utf8")) as MasterData;
  } catch {
    throw new Error(
      `No se pudo leer ${process.env.STAGE_ONE_DATA_FILE ?? defaultDataFile}. ` +
        "Copia docs/operations/plantillas/datos-maestros-etapa-1.example.json, " +
        "complétalo con los datos reales y guárdalo en .data/."
    );
  }
}

function assertConfirmedDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL es obligatorio.");
  const name = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  const confirmed = process.env.STAGE_ONE_CONFIRM?.trim();

  // Cargar datos maestros escribe en la base que se va a usar de verdad. El
  // nombre se escribe a mano para que nadie lo haga en la base equivocada.
  if (confirmed !== name) {
    throw new Error(
      `Confirma la base escribiendo STAGE_ONE_CONFIRM=${name} antes de cargar datos maestros.`
    );
  }

  return name;
}

async function resolveResponsible() {
  const email = process.env.STAGE_ONE_RESPONSIBLE_EMAIL?.trim().toLowerCase();
  if (!email) {
    throw new Error(
      "STAGE_ONE_RESPONSIBLE_EMAIL es obligatorio: el conteo físico lo firma una persona."
    );
  }

  const user = await prisma.internalUser.findUnique({
    where: { email },
    select: { id: true, active: true, role: true }
  });
  if (!user?.active) throw new Error(`No hay un usuario interno activo con ese correo.`);

  return user;
}

async function loadSuppliers(specs: SupplierSpec[], userId: string) {
  let created = 0;
  const byName = new Map<string, string>();

  for (const spec of specs) {
    const name = requireText(spec.nombre, "el nombre del proveedor");
    const existing = await prisma.supplier.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true }
    });

    if (existing) {
      byName.set(name.toLowerCase(), existing.id);
      continue;
    }

    const supplier = await createSupplierRecord({
      name,
      contactName: spec.contacto,
      phone: spec.telefono,
      whatsapp: spec.whatsapp,
      email: spec.email,
      address: spec.direccion,
      notes: spec.notas,
      userId
    });
    byName.set(name.toLowerCase(), supplier.id);
    created += 1;
  }

  return { created, byName };
}

async function loadProducts(
  specs: ProductSpec[],
  suppliers: Map<string, string>,
  responsibleId: string,
  count: MasterData["conteoFisico"],
  branchCode: string
) {
  let created = 0;
  let skipped = 0;
  let stockEntries = 0;

  for (const spec of specs) {
    const code = assertUsableCode(
      requireText(spec.codigo, "el código del producto"),
      "código del producto"
    );
    const name = requireText(spec.nombre, `el nombre del producto ${code}`);

    const existing = await prisma.inventoryItem.findUnique({
      where: { internalCode: code },
      select: { id: true }
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    if (typeof spec.stockContado !== "number" || spec.stockContado < 0) {
      throw new Error(`${code}: falta el stock contado (usa 0 si no hay existencias).`);
    }

    const item = await createInventoryItemRecord({
      internalCode: code,
      sku: spec.sku,
      name,
      description: spec.descripcion,
      category: requireText(spec.categoria, `la categoría de ${code}`),
      unit: requireText(spec.unidad, `la unidad de ${code}`),
      usage: spec.uso ?? "sale",
      salePriceCents: moneyToCents(requireText(spec.precioVenta, `el precio de ${code}`), code),
      referenceCostCents: spec.costoReferencial
        ? moneyToCents(spec.costoReferencial, `${code} costo`)
        : 0,
      minimumStock: spec.stockMinimo ?? 0,
      // El stock entra como movimiento aparte, con la fecha y el responsable
      // del conteo: así queda auditable y no se duplica al reintentar.
      initialStock: 0,
      userId: responsibleId,
      branchCode
    });
    created += 1;

    if (spec.descuentoMaximo) {
      await updateInventoryItemMaxDiscountRecord({
        itemId: item.id,
        expectedRevision: item.revision,
        maxDiscountCents: moneyToCents(spec.descuentoMaximo, `${code} descuento`),
        changeReason: "Umbral definido en la carga inicial de la Etapa 1",
        userId: responsibleId
      });
    }

    if (spec.proveedor) {
      const supplierId = suppliers.get(spec.proveedor.trim().toLowerCase());
      if (!supplierId) throw new Error(`${code}: el proveedor "${spec.proveedor}" no está en la lista.`);
      const current = await prisma.inventoryItem.findUniqueOrThrow({
        where: { id: item.id },
        select: { revision: true }
      });
      await updateInventoryItemSuppliersRecord({
        itemId: item.id,
        expectedRevision: current.revision,
        supplierIds: [supplierId],
        preferredSupplierId: supplierId,
        changeReason: "Proveedor asignado en la carga inicial de la Etapa 1",
        userId: responsibleId
      });
    }

    if (spec.stockContado > 0) {
      await addInventoryEntryRecord({
        idempotencyKey: `stage-one:${code}`,
        itemId: item.id,
        userId: responsibleId,
        branchCode,
        quantity: spec.stockContado,
        reason: `Conteo físico inicial ${count.fecha} — ${count.responsable}`
      });
      stockEntries += 1;
    }
  }

  return { created, skipped, stockEntries };
}

async function loadCatalog(specs: CatalogSpec[], userId: string) {
  let created = 0;
  let skipped = 0;

  for (const spec of specs) {
    const code = assertUsableCode(
      requireText(spec.codigo, "el código de la oferta"),
      "código del catálogo"
    );
    const existing = await prisma.serviceCatalogItem.findUnique({
      where: { code },
      select: { id: true }
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    await createServiceCatalogItemRecord({
      code,
      name: requireText(spec.nombre, `el nombre de ${code}`),
      description: spec.descripcion,
      category: requireText(spec.categoria, `la categoría de ${code}`),
      kind: spec.tipo,
      basePriceCents: moneyToCents(requireText(spec.precio, `el precio de ${code}`), code),
      ownMaxDiscountCents: spec.descuentoMaximo
        ? moneyToCents(spec.descuentoMaximo, `${code} descuento`)
        : 0,
      requiresNursing: spec.requiereEnfermeria ?? false,
      supportsSessions: (spec.sesiones ?? 0) > 1,
      sessionCount: spec.sesiones,
      userId
    });
    created += 1;
  }

  return { created, skipped };
}

async function main() {
  const database = assertConfirmedDatabase();
  const data = readMasterData();
  const responsible = await resolveResponsible();
  const branchCode = data.sucursal?.trim() || "el-alto";

  requireText(data.conteoFisico?.fecha, "la fecha del conteo físico");
  requireText(data.conteoFisico?.responsable, "el responsable del conteo físico");

  const suppliers = await loadSuppliers(data.proveedores ?? [], responsible.id);
  const products = await loadProducts(
    data.productos ?? [],
    suppliers.byName,
    responsible.id,
    data.conteoFisico,
    branchCode
  );
  const catalog = await loadCatalog(data.catalogo ?? [], responsible.id);

  console.log(`Datos maestros cargados en ${database} (${branchCode}).`);
  console.log(`  Proveedores nuevos: ${suppliers.created}`);
  console.log(
    `  Productos nuevos: ${products.created} | ya existían: ${products.skipped} | ` +
      `entradas de stock: ${products.stockEntries}`
  );
  console.log(`  Ofertas del catálogo nuevas: ${catalog.created} | ya existían: ${catalog.skipped}`);
  console.log("Revisa el resultado con: pnpm stage-one:check");
}

main()
  .catch((error) => {
    // El mensaje de un error de datos dice qué falta y no expone credenciales.
    if (error instanceof Error && !/DATABASE_URL=|password/i.test(error.message)) {
      console.error(error.message);
    } else {
      reportScriptError("stage-one:load", error);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
