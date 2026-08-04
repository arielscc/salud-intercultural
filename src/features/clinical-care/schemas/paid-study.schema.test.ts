import { describe, expect, it } from "vitest";
import {
  paidStudyOrderSchema,
  parsePaidStudyForm
} from "@/features/clinical-care/schemas/paid-study.schema";

describe("paid study order schema", () => {
  it("accepts one or more selected studies with editable prices", () => {
    const result = paidStudyOrderSchema.parse({
      visitId: "visit_1",
      discount: "10.00",
      studies: [
        { catalogItemId: "study_hemogram", price: "50.00" },
        { catalogItemId: "study_resonance", price: "120.00" }
      ]
    });
    expect(result.studies).toEqual([
      { catalogItemId: "study_hemogram", price: "50.00", quantity: 1 },
      { catalogItemId: "study_resonance", price: "120.00", quantity: 1 }
    ]);
  });

  it("accepts inventory product lines", () => {
    const result = paidStudyOrderSchema.parse({
      visitId: "visit_1",
      discount: "0.00",
      studies: [{ inventoryItemId: "prod_syringe", price: "30.00", quantity: 2 }]
    });
    expect(result.studies).toEqual([
      { inventoryItemId: "prod_syringe", price: "30.00", quantity: 2 }
    ]);
  });

  it("rejects a line that is neither catalog nor inventory", () => {
    expect(() =>
      paidStudyOrderSchema.parse({
        visitId: "visit_1",
        discount: "0.00",
        studies: [{ price: "50.00" }]
      })
    ).toThrow();
  });

  it("rejects a line that is both catalog and inventory", () => {
    expect(() =>
      paidStudyOrderSchema.parse({
        visitId: "visit_1",
        discount: "0.00",
        studies: [{ catalogItemId: "study_hemogram", inventoryItemId: "prod_x", price: "50.00" }]
      })
    ).toThrow();
  });

  it("requires at least one study", () => {
    expect(() =>
      paidStudyOrderSchema.parse({ visitId: "visit_1", discount: "0.00", studies: [] })
    ).toThrow();
  });

  it("rejects duplicate catalog studies", () => {
    expect(() =>
      paidStudyOrderSchema.parse({
        visitId: "visit_1",
        discount: "0.00",
        studies: [
          { catalogItemId: "study_hemogram", price: "50.00" },
          { catalogItemId: "study_hemogram", price: "50.00" }
        ]
      })
    ).toThrow();
  });

  it("parses the parallel study fields sent by the dialog (catalog + product)", () => {
    const formData = new FormData();
    formData.set("visitId", "visit_1");
    formData.set("discount", "5.00");
    formData.append("studyRef", "catalog:study_hemogram");
    formData.append("studyPrice", "50.00");
    formData.append("studyQuantity", "1");
    formData.append("studyRef", "product:prod_syringe");
    formData.append("studyPrice", "30.00");
    formData.append("studyQuantity", "2");

    expect(parsePaidStudyForm(formData)).toEqual({
      visitId: "visit_1",
      details: "",
      discount: "5.00",
      total: "",
      studies: [
        { catalogItemId: "study_hemogram", inventoryItemId: undefined, price: "50.00", quantity: "1" },
        { catalogItemId: undefined, inventoryItemId: "prod_syringe", price: "30.00", quantity: "2" }
      ]
    });
  });
});
