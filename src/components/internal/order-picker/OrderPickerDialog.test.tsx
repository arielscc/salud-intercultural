import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  OrderPickerDialog,
  type OrderPickerItem
} from "@/components/internal/order-picker/OrderPickerDialog";

/**
 * Los cortes de existencias del catálogo del modal.
 *
 * Se fijan acá porque son una regla de negocio, no una decisión de estilo: quien
 * cobra tiene que ver antes de elegir que del producto quedan tres. Si alguien
 * mueve 5 o 15, esta prueba lo dice.
 */
const items: OrderPickerItem[] = [
  { key: "sin", label: "Sin existencias", group: "Productos", unitPriceCents: 1000, stock: 0 },
  { key: "rojo", label: "Rojo justo", group: "Productos", unitPriceCents: 1000, stock: 4 },
  { key: "ambar-borde", label: "Ámbar en el borde", group: "Productos", unitPriceCents: 1000, stock: 5 },
  { key: "ambar", label: "Ámbar medio", group: "Productos", unitPriceCents: 1000, stock: 12 },
  { key: "normal-borde", label: "Corte de quince", group: "Productos", unitPriceCents: 1000, stock: 15 },
  { key: "normal", label: "Bien surtido", group: "Productos", unitPriceCents: 1000, stock: 40 },
  { key: "servicio", label: "Consulta general", group: "Servicios", unitPriceCents: 5000 }
];

async function openCatalog() {
  render(
    <OrderPickerDialog
      action={async () => {}}
      items={items}
      lineFields={() => null}
      totalFieldName="total"
      discountFieldName="discount"
      notesFieldName="notes"
      notesLabel="Notas"
      title="Asignar cobro"
      description="Selecciona lo que se cobra."
      emptyMessage="Sin ítems."
      triggerLabel="Asignar cobro"
      triggerIcon={null}
      submitLabel="Crear cobro"
    />
  );
  await userEvent.click(screen.getByRole("button", { name: "Asignar cobro" }));
}

/** El nodo de la fila del catálogo cuyo ítem se llama `label`. */
function row(label: string) {
  return screen.getByRole("checkbox", { name: new RegExp(`^${label}`) });
}

/**
 * La etiqueta de stock de una fila, o `null` si no muestra ninguna.
 *
 * Se lee del nodo propio del aviso y no del texto de la fila: ahí el precio
 * queda pegado al número ("Stock 15" + "10.00 Bs" da "Stock 1510").
 */
function stockNote(label: string) {
  const note = within(row(label)).queryByText(/^(Sin stock|Stock \d+)/);
  return note?.textContent ?? null;
}

describe("OrderPickerDialog · existencias", () => {
  it("avisa el stock con los cortes en 5 y 15, y calla donde no hay stock que mostrar", async () => {
    await openCatalog();

    expect(stockNote("Sin existencias")).toBe("Sin stock");
    expect(stockNote("Rojo justo")).toBe("Stock 4 · casi agotado");
    expect(stockNote("Ámbar en el borde")).toBe("Stock 5 · casi agotado");
    expect(stockNote("Ámbar medio")).toBe("Stock 12 · casi agotado");
    // 15 ya no es "casi agotado": es el primer valor que se muestra sin aviso.
    expect(stockNote("Corte de quince")).toBe("Stock 15");
    expect(stockNote("Bien surtido")).toBe("Stock 40");
    // Un servicio no tiene existencias; inventarle un "Stock 0" sería mentir.
    expect(stockNote("Consulta general")).toBeNull();
  });

  it("tiñe la fila de rojo bajo 5, de ámbar bajo 15, y deja la normal sin tinte", async () => {
    await openCatalog();

    const tint = (label: string) => row(label).parentElement?.className ?? "";

    expect(tint("Rojo justo")).toContain("bg-error/5");
    expect(tint("Ámbar medio")).toContain("bg-warning/5");
    expect(tint("Bien surtido")).not.toContain("bg-error/5");
    expect(tint("Bien surtido")).not.toContain("bg-warning/5");
  });

  it("deja que el tinte de selección gane al de stock", async () => {
    await openCatalog();

    const checkbox = row("Rojo justo");
    await userEvent.click(checkbox);

    const className = checkbox.parentElement?.className ?? "";
    expect(className).toContain("bg-primary/5");
    expect(className).not.toContain("bg-error/5");
    // El aviso no se pierde al elegirlo: sigue en la etiqueta.
    expect(stockNote("Rojo justo")).toBe("Stock 4 · casi agotado");
  });
});
