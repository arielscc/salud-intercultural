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
      { catalogItemId: "study_hemogram", price: "50.00" },
      { catalogItemId: "study_resonance", price: "120.00" }
    ]);
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

  it("parses the parallel study fields sent by the dialog", () => {
    const formData = new FormData();
    formData.set("visitId", "visit_1");
    formData.set("discount", "5.00");
    formData.append("studyCatalogItemId", "study_hemogram");
    formData.append("studyPrice", "50.00");
    formData.append("studyCatalogItemId", "study_resonance");
    formData.append("studyPrice", "120.00");

    expect(parsePaidStudyForm(formData)).toEqual({
      visitId: "visit_1",
      details: "",
      discount: "5.00",
      studies: [
        { catalogItemId: "study_hemogram", price: "50.00" },
        { catalogItemId: "study_resonance", price: "120.00" }
      ]
    });
  });
});
