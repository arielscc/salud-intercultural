/**
 * Seed de catálogo ficticio para pruebas: 30 productos de inventario (con todos
 * los campos), proveedores, y servicios/tratamientos/estudios del catálogo.
 *
 * SOLO corre en `local` y `staging`. Nunca en `production` ni `test`.
 * Es idempotente: se puede volver a ejecutar sin duplicar (salta por código).
 *
 * Local:    pnpm seed:demo
 * Staging:  pnpm staging:seed:demo   (usa .env.staging)
 */
import type { InventoryItemUsage } from "../src/generated/prisma/client";
import { prisma } from "../src/modules/database";
import { resolveDeploymentEnvironment } from "../src/lib/deployment-environment";
import {
  createInventoryItemRecord,
  createSupplierRecord,
  updateInventoryItemSuppliersRecord
} from "../src/modules/database/queries/inventory";
import { createServiceCatalogItemRecord } from "../src/modules/database/queries/service-catalog";
import { reportScriptError } from "./safe-error";

type ProductSpec = {
  internalCode: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  usage: InventoryItemUsage;
  salePriceCents: number;
  referenceCostCents: number;
  maxDiscountCents: number;
  minimumStock: number;
  initialStock: number;
  supplier: number; // índice en DEMO_SUPPLIERS
};

const DEMO_SUPPLIERS = [
  {
    name: "Distribuidora Farmacéutica Andina",
    contactName: "Rosa Mamani",
    phone: "22450011",
    whatsapp: "71200011",
    email: "ventas@farmaandina.demo",
    address: "Av. Buenos Aires 1200, El Alto",
    notes: "Proveedor ficticio de demostración."
  },
  {
    name: "Insumos Médicos La Paz",
    contactName: "Jorge Quispe",
    phone: "22450022",
    whatsapp: "71200022",
    email: "contacto@insumoslapaz.demo",
    address: "Calle Comercio 340, La Paz",
    notes: "Proveedor ficticio de demostración."
  },
  {
    name: "Laboratorios Bolivia",
    contactName: "María Flores",
    phone: "22450033",
    whatsapp: "71200033",
    email: "pedidos@labbolivia.demo",
    address: "Av. 6 de Agosto 890, La Paz",
    notes: "Proveedor ficticio de demostración."
  }
];

const DEMO_PRODUCTS: ProductSpec[] = [
  { internalCode: "DEMO-P001", sku: "DEMO-SKU-001", name: "Suero fisiológico 0.9% 1L", description: "Solución salina estéril para hidratación.", category: "Sueros", unit: "bolsa", usage: "both", salePriceCents: 3500, referenceCostCents: 1800, maxDiscountCents: 500, minimumStock: 10, initialStock: 40, supplier: 1 },
  { internalCode: "DEMO-P002", sku: "DEMO-SKU-002", name: "Suero glucosado 5% 1L", description: "Solución glucosada para hidratación.", category: "Sueros", unit: "bolsa", usage: "both", salePriceCents: 3800, referenceCostCents: 2000, maxDiscountCents: 500, minimumStock: 10, initialStock: 35, supplier: 1 },
  { internalCode: "DEMO-P003", sku: "DEMO-SKU-003", name: "Ringer lactato 1L", description: "Solución electrolítica balanceada.", category: "Sueros", unit: "bolsa", usage: "both", salePriceCents: 4200, referenceCostCents: 2300, maxDiscountCents: 500, minimumStock: 8, initialStock: 30, supplier: 1 },
  { internalCode: "DEMO-P004", sku: "DEMO-SKU-004", name: "Complejo B inyectable", description: "Vitaminas del complejo B, ampolla.", category: "Inyectables", unit: "ampolla", usage: "both", salePriceCents: 1500, referenceCostCents: 700, maxDiscountCents: 200, minimumStock: 20, initialStock: 60, supplier: 0 },
  { internalCode: "DEMO-P005", sku: "DEMO-SKU-005", name: "Vitamina C 1g inyectable", description: "Ácido ascórbico inyectable.", category: "Inyectables", unit: "ampolla", usage: "both", salePriceCents: 1800, referenceCostCents: 900, maxDiscountCents: 300, minimumStock: 20, initialStock: 50, supplier: 0 },
  { internalCode: "DEMO-P006", sku: "DEMO-SKU-006", name: "Dexametasona 4mg/ml", description: "Corticoide inyectable.", category: "Inyectables", unit: "ampolla", usage: "both", salePriceCents: 1200, referenceCostCents: 500, maxDiscountCents: 200, minimumStock: 15, initialStock: 45, supplier: 0 },
  { internalCode: "DEMO-P007", sku: "DEMO-SKU-007", name: "Ketorolaco 30mg/ml", description: "Analgésico antiinflamatorio inyectable.", category: "Inyectables", unit: "ampolla", usage: "both", salePriceCents: 1600, referenceCostCents: 800, maxDiscountCents: 200, minimumStock: 15, initialStock: 40, supplier: 0 },
  { internalCode: "DEMO-P008", sku: "DEMO-SKU-008", name: "Metamizol 1g/2ml", description: "Analgésico y antipirético inyectable.", category: "Inyectables", unit: "ampolla", usage: "both", salePriceCents: 1400, referenceCostCents: 600, maxDiscountCents: 200, minimumStock: 15, initialStock: 40, supplier: 0 },
  { internalCode: "DEMO-P009", sku: "DEMO-SKU-009", name: "Ondansetrón 4mg/2ml", description: "Antiemético inyectable.", category: "Inyectables", unit: "ampolla", usage: "both", salePriceCents: 2200, referenceCostCents: 1100, maxDiscountCents: 300, minimumStock: 10, initialStock: 30, supplier: 0 },
  { internalCode: "DEMO-P010", sku: "DEMO-SKU-010", name: "Ranitidina 50mg/2ml", description: "Antiácido inyectable.", category: "Inyectables", unit: "ampolla", usage: "both", salePriceCents: 1300, referenceCostCents: 600, maxDiscountCents: 200, minimumStock: 10, initialStock: 30, supplier: 0 },
  { internalCode: "DEMO-P011", sku: "DEMO-SKU-011", name: "Paracetamol 500mg (caja 20)", description: "Analgésico y antipirético oral.", category: "Analgésicos", unit: "caja", usage: "sale", salePriceCents: 2500, referenceCostCents: 1200, maxDiscountCents: 300, minimumStock: 8, initialStock: 25, supplier: 0 },
  { internalCode: "DEMO-P012", sku: "DEMO-SKU-012", name: "Ibuprofeno 400mg (caja 20)", description: "Antiinflamatorio no esteroideo oral.", category: "Antiinflamatorios", unit: "caja", usage: "sale", salePriceCents: 2800, referenceCostCents: 1300, maxDiscountCents: 300, minimumStock: 8, initialStock: 25, supplier: 0 },
  { internalCode: "DEMO-P013", sku: "DEMO-SKU-013", name: "Amoxicilina 500mg (caja 15)", description: "Antibiótico oral.", category: "Antibióticos", unit: "caja", usage: "sale", salePriceCents: 3500, referenceCostCents: 1800, maxDiscountCents: 400, minimumStock: 6, initialStock: 20, supplier: 2 },
  { internalCode: "DEMO-P014", sku: "DEMO-SKU-014", name: "Azitromicina 500mg (caja 3)", description: "Antibiótico oral.", category: "Antibióticos", unit: "caja", usage: "sale", salePriceCents: 4500, referenceCostCents: 2400, maxDiscountCents: 500, minimumStock: 5, initialStock: 15, supplier: 2 },
  { internalCode: "DEMO-P015", sku: "DEMO-SKU-015", name: "Omeprazol 20mg (caja 14)", description: "Inhibidor de bomba de protones.", category: "Gastro", unit: "caja", usage: "sale", salePriceCents: 3000, referenceCostCents: 1500, maxDiscountCents: 300, minimumStock: 6, initialStock: 20, supplier: 2 },
  { internalCode: "DEMO-P016", sku: "DEMO-SKU-016", name: "Loratadina 10mg (caja 10)", description: "Antihistamínico oral.", category: "Antialérgicos", unit: "caja", usage: "sale", salePriceCents: 2000, referenceCostCents: 900, maxDiscountCents: 200, minimumStock: 8, initialStock: 25, supplier: 2 },
  { internalCode: "DEMO-P017", sku: "DEMO-SKU-017", name: "Vitamina D3 2000UI (frasco)", description: "Suplemento de vitamina D.", category: "Vitaminas", unit: "frasco", usage: "sale", salePriceCents: 6000, referenceCostCents: 3200, maxDiscountCents: 800, minimumStock: 5, initialStock: 15, supplier: 2 },
  { internalCode: "DEMO-P018", sku: "DEMO-SKU-018", name: "Multivitamínico jarabe", description: "Suplemento multivitamínico pediátrico.", category: "Vitaminas", unit: "frasco", usage: "sale", salePriceCents: 4800, referenceCostCents: 2500, maxDiscountCents: 600, minimumStock: 5, initialStock: 18, supplier: 2 },
  { internalCode: "DEMO-P019", sku: "DEMO-SKU-019", name: "Guantes de nitrilo (caja 100)", description: "Guantes descartables de nitrilo.", category: "Descartables", unit: "caja", usage: "internal_use", salePriceCents: 6500, referenceCostCents: 4000, maxDiscountCents: 0, minimumStock: 4, initialStock: 12, supplier: 1 },
  { internalCode: "DEMO-P020", sku: "DEMO-SKU-020", name: "Jeringa 5ml (caja 100)", description: "Jeringas descartables 5ml.", category: "Descartables", unit: "caja", usage: "internal_use", salePriceCents: 5500, referenceCostCents: 3500, maxDiscountCents: 0, minimumStock: 5, initialStock: 15, supplier: 1 },
  { internalCode: "DEMO-P021", sku: "DEMO-SKU-021", name: "Jeringa 10ml (caja 100)", description: "Jeringas descartables 10ml.", category: "Descartables", unit: "caja", usage: "internal_use", salePriceCents: 6000, referenceCostCents: 3800, maxDiscountCents: 0, minimumStock: 5, initialStock: 15, supplier: 1 },
  { internalCode: "DEMO-P022", sku: "DEMO-SKU-022", name: "Catéter IV 22G", description: "Catéter intravenoso periférico.", category: "Descartables", unit: "unidad", usage: "internal_use", salePriceCents: 350, referenceCostCents: 180, maxDiscountCents: 0, minimumStock: 30, initialStock: 120, supplier: 1 },
  { internalCode: "DEMO-P023", sku: "DEMO-SKU-023", name: "Equipo de venoclisis", description: "Set de infusión intravenosa.", category: "Descartables", unit: "unidad", usage: "both", salePriceCents: 900, referenceCostCents: 450, maxDiscountCents: 100, minimumStock: 20, initialStock: 60, supplier: 1 },
  { internalCode: "DEMO-P024", sku: "DEMO-SKU-024", name: "Gasa estéril (paquete)", description: "Gasas estériles para curación.", category: "Insumos", unit: "paquete", usage: "both", salePriceCents: 500, referenceCostCents: 220, maxDiscountCents: 0, minimumStock: 20, initialStock: 80, supplier: 1 },
  { internalCode: "DEMO-P025", sku: "DEMO-SKU-025", name: "Alcohol en gel 500ml", description: "Antiséptico de manos.", category: "Insumos", unit: "frasco", usage: "both", salePriceCents: 2200, referenceCostCents: 1100, maxDiscountCents: 200, minimumStock: 10, initialStock: 30, supplier: 1 },
  { internalCode: "DEMO-P026", sku: "DEMO-SKU-026", name: "Alcohol medicinal 1L", description: "Alcohol etílico 70%.", category: "Insumos", unit: "frasco", usage: "both", salePriceCents: 1800, referenceCostCents: 900, maxDiscountCents: 200, minimumStock: 10, initialStock: 30, supplier: 1 },
  { internalCode: "DEMO-P027", sku: "DEMO-SKU-027", name: "Algodón hidrófilo 500g", description: "Algodón para uso clínico.", category: "Insumos", unit: "paquete", usage: "both", salePriceCents: 2600, referenceCostCents: 1300, maxDiscountCents: 200, minimumStock: 8, initialStock: 24, supplier: 1 },
  { internalCode: "DEMO-P028", sku: "DEMO-SKU-028", name: "Povidona yodada 120ml", description: "Antiséptico tópico.", category: "Dermatología", unit: "frasco", usage: "both", salePriceCents: 2400, referenceCostCents: 1200, maxDiscountCents: 200, minimumStock: 8, initialStock: 24, supplier: 2 },
  { internalCode: "DEMO-P029", sku: "DEMO-SKU-029", name: "Termómetro digital", description: "Termómetro clínico digital.", category: "Insumos", unit: "unidad", usage: "sale", salePriceCents: 4500, referenceCostCents: 2600, maxDiscountCents: 500, minimumStock: 5, initialStock: 12, supplier: 1 },
  { internalCode: "DEMO-P030", sku: "DEMO-SKU-030", name: "Mascarilla para nebulizar", description: "Kit de mascarilla para nebulización.", category: "Descartables", unit: "unidad", usage: "sale", salePriceCents: 3500, referenceCostCents: 1900, maxDiscountCents: 300, minimumStock: 6, initialStock: 18, supplier: 1 }
];

async function seedSuppliers(userId?: string) {
  const ids: string[] = [];
  for (const supplier of DEMO_SUPPLIERS) {
    const existing = await prisma.supplier.findFirst({
      where: { name: { equals: supplier.name, mode: "insensitive" } },
      select: { id: true }
    });
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const created = await createSupplierRecord({ ...supplier, userId });
    ids.push(created.id);
  }
  return ids;
}

async function seedProducts(supplierIds: string[], branchCode: string, userId?: string) {
  let created = 0;
  let skipped = 0;
  for (const product of DEMO_PRODUCTS) {
    const existing = await prisma.inventoryItem.findFirst({
      where: { internalCode: { equals: product.internalCode, mode: "insensitive" } },
      select: { id: true }
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    const item = await createInventoryItemRecord({
      sku: product.sku,
      internalCode: product.internalCode,
      name: product.name,
      description: product.description,
      category: product.category,
      unit: product.unit,
      usage: product.usage,
      salePriceCents: product.salePriceCents,
      referenceCostCents: product.referenceCostCents,
      minimumStock: product.minimumStock,
      initialStock: product.initialStock,
      userId,
      branchCode
    });

    // Umbral de descuento por producto (campo de Dirección/Super admin).
    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { maxDiscountCents: product.maxDiscountCents }
    });

    const supplierId = supplierIds[product.supplier];
    if (supplierId) {
      await updateInventoryItemSuppliersRecord({
        itemId: item.id,
        expectedRevision: item.revision,
        supplierIds: [supplierId],
        preferredSupplierId: supplierId,
        changeReason: "Alta de proveedor (datos de demostración)",
        userId
      });
    }
    created += 1;
  }
  return { created, skipped };
}

async function seedCatalog(userId?: string) {
  const productMap = new Map<string, string>();
  const products = await prisma.inventoryItem.findMany({
    where: { internalCode: { in: DEMO_PRODUCTS.map((product) => product.internalCode) } },
    select: { id: true, internalCode: true }
  });
  for (const product of products) productMap.set(product.internalCode, product.id);

  const component = (internalCode: string, quantity: number) => {
    const inventoryItemId = productMap.get(internalCode);
    return inventoryItemId ? [{ inventoryItemId, quantity }] : [];
  };

  const services = [
    { code: "DEMO-SRV-SUEROTERAPIA", name: "Sueroterapia", category: "Sueroterapia", description: "Terapia de hidratación y vitaminas por vía intravenosa.", basePriceCents: 12000, ownMaxDiscountCents: 15000, requiresNursing: true, supportsSessions: true, sessionCount: 10, packagePriceCents: 90000, sessionPriceCents: 12000 },
    { code: "DEMO-SRV-OZONOTERAPIA", name: "Ozonoterapia", category: "Ozonoterapia", description: "Aplicación de ozono médico por sesiones.", basePriceCents: 20000, ownMaxDiscountCents: 20000, requiresNursing: true, supportsSessions: true, sessionCount: 8, packagePriceCents: 140000, sessionPriceCents: 20000 },
    { code: "DEMO-SRV-NEBULIZACION", name: "Nebulización", category: "Enfermería", description: "Nebulización con medicación indicada.", basePriceCents: 5000, ownMaxDiscountCents: 500, requiresNursing: true, supportsSessions: false },
    { code: "DEMO-SRV-CURACION", name: "Curación simple", category: "Enfermería", description: "Curación y limpieza de herida.", basePriceCents: 4000, ownMaxDiscountCents: 500, requiresNursing: true, supportsSessions: false },
    { code: "DEMO-SRV-INYECTABLE", name: "Aplicación de inyectable", category: "Enfermería", description: "Aplicación de medicación inyectable.", basePriceCents: 2000, ownMaxDiscountCents: 200, requiresNursing: true, supportsSessions: false },
    { code: "DEMO-SRV-CONSULTA", name: "Consulta médica especializada", category: "Consulta", description: "Consulta con especialista.", basePriceCents: 8000, ownMaxDiscountCents: 1000, requiresNursing: false, supportsSessions: false },
    { code: "DEMO-SRV-CONTROL", name: "Consulta de control", category: "Consulta", description: "Consulta de seguimiento.", basePriceCents: 5000, ownMaxDiscountCents: 500, requiresNursing: false, supportsSessions: false }
  ] as const;

  const treatments = [
    { code: "DEMO-TRT-ANTIGRIPAL", name: "Tratamiento antigripal", category: "Tratamientos", description: "Paquete para cuadro gripal.", basePriceCents: 9000, requiresNursing: false, components: [...component("DEMO-P011", 1), ...component("DEMO-P016", 1), ...component("DEMO-P005", 1)] },
    { code: "DEMO-TRT-GASTRO", name: "Tratamiento gástrico", category: "Tratamientos", description: "Paquete para molestias gástricas.", basePriceCents: 8000, requiresNursing: false, components: [...component("DEMO-P015", 1), ...component("DEMO-P010", 1)] },
    { code: "DEMO-TRT-DOLOR", name: "Tratamiento del dolor", category: "Tratamientos", description: "Manejo del dolor con inyectables.", basePriceCents: 7000, requiresNursing: true, components: [...component("DEMO-P007", 1), ...component("DEMO-P008", 1), ...component("DEMO-P006", 1)] },
    { code: "DEMO-TRT-HIDRATACION", name: "Hidratación intravenosa", category: "Tratamientos", description: "Hidratación IV con complejo B.", basePriceCents: 9000, requiresNursing: true, components: [...component("DEMO-P001", 1), ...component("DEMO-P004", 1), ...component("DEMO-P023", 1)] }
  ] as const;

  const studies = [
    { code: "DEMO-EST-GLUCOSA", name: "Glucosa en sangre", category: "Estudios", description: "Medición de glucosa.", basePriceCents: 3000, ownMaxDiscountCents: 0, requiresNursing: true },
    { code: "DEMO-EST-PERFIL-LIPIDICO", name: "Perfil lipídico", category: "Estudios", description: "Colesterol y triglicéridos.", basePriceCents: 8000, ownMaxDiscountCents: 0, requiresNursing: true }
  ] as const;

  let created = 0;
  let skipped = 0;

  async function ensure(code: string, make: () => Promise<unknown>) {
    const existing = await prisma.serviceCatalogItem.findFirst({
      where: { code: { equals: code, mode: "insensitive" } },
      select: { id: true }
    });
    if (existing) {
      skipped += 1;
      return;
    }
    await make();
    created += 1;
  }

  for (const service of services) {
    await ensure(service.code, () =>
      createServiceCatalogItemRecord({ ...service, kind: "service", userId })
    );
  }
  for (const treatment of treatments) {
    await ensure(treatment.code, () =>
      createServiceCatalogItemRecord({ ...treatment, kind: "treatment", userId })
    );
  }
  for (const study of studies) {
    await ensure(study.code, () =>
      createServiceCatalogItemRecord({ ...study, kind: "study", userId })
    );
  }

  return { created, skipped };
}

async function main() {
  const environment = resolveDeploymentEnvironment();
  if (environment !== "local" && environment !== "staging") {
    throw new Error(
      `seed:demo solo corre en local o staging (entorno detectado: ${environment}).`
    );
  }

  const branch =
    (await prisma.clinicBranch.findFirst({
      where: { status: "active" },
      select: { code: true },
      orderBy: { code: "asc" }
    })) ?? (await prisma.clinicBranch.findFirst({ select: { code: true } }));
  if (!branch) throw new Error("No hay ninguna sucursal registrada para asignar el stock.");

  const actor = await prisma.internalUser.findFirst({
    where: { active: true, role: { in: ["super_admin", "administracion", "direccion"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });

  console.log(`Sembrando catálogo ficticio en entorno "${environment}" (sucursal ${branch.code})…`);

  const supplierIds = await seedSuppliers(actor?.id);
  console.log(`Proveedores listos: ${supplierIds.length}`);

  const products = await seedProducts(supplierIds, branch.code, actor?.id);
  console.log(`Productos: ${products.created} creados, ${products.skipped} ya existían.`);

  const catalog = await seedCatalog(actor?.id);
  console.log(`Servicios/tratamientos/estudios: ${catalog.created} creados, ${catalog.skipped} ya existían.`);

  console.log("Listo. Datos de demostración con prefijo DEMO-*.");
}

main()
  .catch((error) => {
    reportScriptError("Demo catalog seed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
