import { describe, expect, it } from "vitest";
import { patientSearchWhere } from "@/modules/database/queries/patient-search";

describe("patientSearchWhere", () => {
  it("creates one required match group per search term", () => {
    const where = patientSearchWhere("  ariel   chura ");
    expect(where.AND).toHaveLength(2);
    expect(where.AND).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ OR: expect.arrayContaining([expect.objectContaining({ fullName: { contains: "ariel", mode: "insensitive" } })]) }),
        expect.objectContaining({ OR: expect.arrayContaining([expect.objectContaining({ fullName: { contains: "chura", mode: "insensitive" } })]) })
      ])
    );
  });

  it("returns no filter for an empty query", () => {
    expect(patientSearchWhere("   ")).toEqual({});
  });
});

