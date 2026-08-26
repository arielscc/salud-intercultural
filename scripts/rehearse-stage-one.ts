import { randomUUID } from "node:crypto";
import { hashPassword } from "../src/features/internal-auth/password";
import { resolveModuleAccess } from "../src/features/modules/access";
import { todayDatabaseDate } from "../src/lib/dates";
import { prisma } from "../src/modules/database";
import {
  approveCashSessionClose,
  calculateCashExpected,
  createStaffCashExpense,
  getCashSessionCloseReport,
  openCashSession,
  requestCashSessionClose
} from "../src/modules/database/queries/cash";
import { createInventoryItemRecord, createSupplierRecord } from "../src/modules/database/queries/inventory";
import {
  getModuleAccessState,
  setModuleActivation
} from "../src/modules/database/queries/modules";
import { createPatientRecord } from "../src/modules/database/queries/patients";
import {
  confirmPurchaseRecord,
  createPurchaseDraftRecord,
  createPurchaseReceiptRecord
} from "../src/modules/database/queries/purchases";
import { createPaymentRecord, createSaleOrderRecord } from "../src/modules/database/queries/sales";
import { generateInternalReceiptDocument } from "../src/modules/generated-documents/service";
import { reportScriptError } from "./safe-error";

/*
 * Ensayo de la Etapa 1: recorre de punta a punta lo que Administración va a
 * hacer el primer día real —alta de cliente, venta, cobro, recibo, egreso,
 * compra, recepción, stock y cierre de Caja— y de paso suspende y reactiva un
 * módulo para comprobar el modo solo lectura.
 *
 * Escribe datos reales, así que solo corre contra una base de ensayo. Todo lo
 * que crea lleva el prefijo ENSAYO para poder reconocerlo después.
 *
 *   REHEARSAL_CONFIRM=<nombre de la base> pnpm stage-one:rehearse
 */

const branchCode = "el-alto";
const tag = `ENSAYO-${new Date().toISOString().slice(0, 10)}`;
const steps: Array<{ paso: string; resultado: string }> = [];

function record(paso: string, resultado: string) {
  steps.push({ paso, resultado });
  console.log(`  ${paso.padEnd(38)} ${resultado}`);
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Ensayo fallido: ${message}`);
}

function assertRehearsalDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL es obligatorio.");
  const name = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));

  // El ensayo escribe ventas, pagos y stock. Nunca contra una base productiva.
  if (!/staging|test|dev/.test(name)) {
    throw new Error(
      `"${name}" no parece una base de ensayo. Solo se permite staging, test o dev.`
    );
  }
  if (process.env.REHEARSAL_CONFIRM?.trim() !== name) {
    throw new Error(`Confirma la base escribiendo REHEARSAL_CONFIRM=${name}.`);
  }

  return name;
}

async function ensureUser(email: string, role: "administracion" | "direccion" | "super_admin") {
  const existing = await prisma.internalUser.findUnique({ where: { email } });
  if (existing) return existing;

  return prisma.internalUser.create({
    data: {
      email,
      name: `${tag} ${role}`,
      passwordHash: await hashPassword(`ensayo-${randomUUID().slice(0, 12)}`),
      role
    }
  });
}

async function ensureBranch() {
  await prisma.clinicBranch.upsert({
    where: { code: branchCode },
    update: { status: "active" },
    create: {
      code: branchCode,
      name: "El Alto",
      city: "El Alto",
      department: "La Paz",
      status: "active"
    }
  });
}

async function activateStageOne() {
  for (const code of ["inventario", "catalogo", "compras", "administracion"] as const) {
    await setModuleActivation({ code, active: true });
  }
  const state = await getModuleAccessState();
  assert(state.active.includes("administracion"), "Administración quedó apagada");
  assert(!state.active.includes("consulta"), "Consulta no debería estar encendida en la Etapa 1");
  record("Etapa 1 encendida", state.active.join(", "));
}

async function main() {
  const database = assertRehearsalDatabase();
  console.log(`Ensayo de la Etapa 1 contra ${database}\n`);

  const admin = await ensureUser(`${tag.toLowerCase()}-admin@ensayo.local`, "administracion");
  const direction = await ensureUser(`${tag.toLowerCase()}-direccion@ensayo.local`, "direccion");
  await ensureBranch();
  await activateStageOne();

  // --- Datos maestros mínimos ---
  const supplier =
    (await prisma.supplier.findFirst({ where: { name: `${tag} Proveedor` } })) ??
    (await createSupplierRecord({
      name: `${tag} Proveedor`,
      phone: "22000000",
      userId: admin.id
    }));
  const existingProduct = await prisma.inventoryItem.findUnique({
    where: { internalCode: `${tag}-P1` }
  });
  const product = existingProduct ?? (await createInventoryItemRecord({
    internalCode: `${tag}-P1`,
    name: `${tag} Producto`,
    category: "Ensayo",
    unit: "caja",
    usage: "sale",
    salePriceCents: 5000,
    referenceCostCents: 2500,
    minimumStock: 2,
    initialStock: 10,
    userId: admin.id,
    branchCode
  }));
  record("Producto con stock inicial", `${product.internalCode}, stock ${product.currentStock}`);

  // --- Caja abierta ---
  const session = await openCashSession({
    branchCode,
    registerName: "Caja principal",
    businessDate: todayDatabaseDate(),
    shift: "full_day",
    responsibleId: admin.id,
    openedById: admin.id,
    openingCashCents: 10_000,
    idempotencyKey: `${tag}-caja`
  });
  record("Caja abierta", `apertura ${session.openingCashCents / 100} Bs`);

  // --- Alta de cliente de mostrador ---
  const client = await createPatientRecord({
    fullName: `${tag} Cliente`,
    phone: "70000123",
    generalObservations: "Cliente creado por el ensayo"
  });
  const visitCount = await prisma.visit.count({ where: { patientId: client.id } });
  assert(visitCount === 0, "el alta mínima no debe abrir visita");
  record("Cliente registrado sin visita", `${client.internalCode}, visitas ${visitCount}`);

  // --- Venta de mostrador ---
  const sale = await createSaleOrderRecord({
    idempotencyKey: `${tag}-venta`,
    patientId: client.id,
    createdById: admin.id,
    branchCode,
    subtotalCents: 10_000,
    discountCents: 1_000,
    lines: [
      {
        itemType: "product",
        inventoryItemId: product.id,
        description: `${tag} Producto`,
        quantity: 2,
        unitPriceCents: 5_000
      }
    ]
  });
  assert(sale.visitId === null, "la venta de mostrador no debe tener visita");
  const afterSale = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: product.id } });
  assert(afterSale.currentStock === 8, `el stock debió bajar a 8 y quedó en ${afterSale.currentStock}`);
  record("Venta creada y stock descontado", `total ${sale.totalCents / 100} Bs, stock ${afterSale.currentStock}`);

  // --- Cobro ---
  await createPaymentRecord({
    idempotencyKey: `${tag}-pago`,
    saleId: sale.id,
    amountCents: sale.totalCents,
    paymentMethodCode: "cash",
    receivedById: admin.id
  });
  const paid = await prisma.sale.findUniqueOrThrow({ where: { id: sale.id } });
  const movement = await prisma.cashMovement.findFirst({ where: { saleId: sale.id } });
  assert(paid.status === "paid" && paid.balanceCents === 0, "la venta debió quedar pagada");
  assert(movement !== null, "el cobro debió dejar movimiento de Caja");
  record("Cobro registrado en Caja", `${(movement?.amountCents ?? 0) / 100} Bs, saldo ${paid.balanceCents}`);

  // --- Recibo ---
  const receipt = await generateInternalReceiptDocument({
    saleId: sale.id,
    generatedById: admin.id
  });
  record("Recibo emitido", `${receipt.documentNumber} v${receipt.version}`);

  // --- Egreso ---
  const expense = await createStaffCashExpense({
    cashSessionId: session.id,
    category: "transport",
    beneficiaries: [{ employeeId: admin.id, amountCents: 3_000 }],
    receivedById: admin.id,
    deliveredById: admin.id,
    registeredById: admin.id,
    authorizedById: direction.id,
    idempotencyKey: `${tag}-egreso`
  });
  record("Egreso autorizado", `${expense.totalCents / 100} Bs a ${admin.name}`);

  // --- Compra, pago y recepción ---
  const purchase = await createPurchaseDraftRecord({
    supplierId: supplier.id,
    branchCode,
    purchaseDate: new Date(),
    currency: "BOB",
    intendedPaymentMethod: "cash",
    idempotencyKey: `${tag}-compra`,
    createdById: admin.id,
    lines: [{ itemId: product.id, orderedQuantity: 5, unitCostCents: 2_500 }]
  });
  // Una compra en efectivo se paga en el mismo acto de confirmarla, contra la
  // Caja abierta; no lleva un pago aparte.
  const confirmed = await confirmPurchaseRecord({
    purchaseId: purchase.id,
    expectedRevision: purchase.revision,
    confirmedById: admin.id,
    cashSessionId: session.id,
    paymentIdempotencyKey: `${tag}-compra-pago`
  });
  assert(confirmed.status === "confirmed", "la compra debió quedar confirmada");
  const lines = await prisma.purchaseLine.findMany({ where: { purchaseId: purchase.id } });
  await createPurchaseReceiptRecord({
    purchaseId: purchase.id,
    branchCode,
    locationCode: "principal",
    receivedAt: new Date(),
    receivedById: admin.id,
    recordedById: admin.id,
    idempotencyKey: `${tag}-recepcion`,
    lines: [
      {
        purchaseLineId: lines[0].id,
        quantity: 5,
        unitCostCents: 2_500,
        batchNumber: `${tag}-L1`
      }
    ]
  });
  const afterReceipt = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: product.id } });
  assert(afterReceipt.currentStock === 13, `el stock debió subir a 13 y quedó en ${afterReceipt.currentStock}`);
  const lot = await prisma.inventoryLot.findFirst({ where: { itemId: product.id } });
  record("Compra recibida con lote", `stock ${afterReceipt.currentStock}, lote ${lot?.batchNumber ?? "sin lote"}`);

  // --- Suspender y reactivar un módulo ---
  await setModuleActivation({
    code: "compras",
    active: false,
    reason: "Ensayo de suspensión",
    actorId: direction.id,
    actorRole: "direccion"
  });
  const suspended = await getModuleAccessState();
  assert(suspended.suspended.includes("compras"), "Compras debió quedar suspendida");
  assert(
    resolveModuleAccess("direccion", suspended, "purchases_read") === "read_only",
    "Dirección debió conservar la lectura"
  );
  assert(
    resolveModuleAccess("administracion", suspended, "purchases_write") === "blocked",
    "la escritura debió quedar bloqueada"
  );
  await setModuleActivation({ code: "compras", active: true, actorId: direction.id });
  record("Módulo suspendido y reactivado", "lectura para Dirección, escritura bloqueada");

  // --- Cierre de Caja ---
  // Se reporta lo que el sistema espera, como haría un conteo físico correcto:
  // si aparece diferencia, es un defecto del ensayo, no del contador.
  const report = await getCashSessionCloseReport(session.id, branchCode);
  assert(report !== null, "no se encontró la sesión de Caja para cerrar");
  const expected = calculateCashExpected(report!);
  const requested = await requestCashSessionClose({
    cashSessionId: session.id,
    requestedById: admin.id,
    reportedByChannel: { cash: expected.cash, qr: expected.qr }
  });

  // Un conteo que cuadra cierra en el acto; solo una diferencia grande pasa por
  // Dirección. El ensayo recorre el camino que corresponda.
  const closed = requested.requiresApproval
    ? await approveCashSessionClose({
        cashSessionId: session.id,
        approvedById: direction.id,
        observation: "Cierre del ensayo de la Etapa 1"
      })
    : requested.session;
  assert(closed.status === "closed", "la Caja debió quedar cerrada");
  assert(
    (closed.differenceCents ?? 0) === 0,
    `un conteo correcto no debe dejar diferencia y dejó ${(closed.differenceCents ?? 0) / 100} Bs`
  );
  record(
    "Caja cerrada y conciliada",
    `esperado ${expected.cash / 100} Bs, diferencia ${(closed.differenceCents ?? 0) / 100} Bs` +
      (requested.requiresApproval ? ", aprobada por Dirección" : ", cuadró sin aprobación")
  );

  console.log(`\n${steps.length} pasos completados sin defectos.`);
  console.log(`Todo lo creado lleva el prefijo ${tag}.`);
}

main()
  .catch((error) => {
    if (error instanceof Error && !/password|token|credential/i.test(error.message)) {
      console.error(`\n${error.message}`);
    } else {
      reportScriptError("stage-one:rehearse", error);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
