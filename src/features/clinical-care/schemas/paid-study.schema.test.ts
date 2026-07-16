import { describe, expect, it } from "vitest";
import { paidStudyOrderSchema } from "@/features/clinical-care/schemas/paid-study.schema";

const prices = {
  discount: "0.00",
  hemogramPrice: "50.00",
  hemogramResonancePrice: "200.00",
  resonancePrice: "120.00",
  urinePrice: "100.00"
};

describe("paid study order schema", () => {
  it("accepts one or more selected studies with editable prices", () => {
    const result = paidStudyOrderSchema.parse({
      visitId: "visit_1",
      hemogram: "on",
      hemogramResonance: "on",
      ...prices
    });
    expect(result).toMatchObject({ hemogram: true, hemogramResonance: true, urine: false });
  });

  it("requires at least one study", () => {
    expect(() => paidStudyOrderSchema.parse({ visitId: "visit_1", ...prices })).toThrow();
  });
});
