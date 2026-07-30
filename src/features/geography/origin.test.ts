import { describe, expect, it } from "vitest";
import {
  geographicOriginsMatch,
  isCompleteGeographicOrigin,
  normalizeGeographicOrigin
} from "@/features/geography/origin";

describe("geographic origin", () => {
  it("normalizes frequent cities with their correct department and country", () => {
    expect(
      normalizeGeographicOrigin({
        city: "cbba",
        department: "La Paz",
        country: "bol"
      })
    ).toEqual({
      city: "Cochabamba",
      department: "Cochabamba",
      country: "Bolivia"
    });
  });

  it("requires a department for Bolivian origins", () => {
    expect(
      isCompleteGeographicOrigin({
        city: "Tiquipaya",
        department: "",
        country: "Bolivia"
      })
    ).toBe(false);
    expect(
      isCompleteGeographicOrigin({
        city: "Tiquipaya",
        department: "Cochabamba",
        country: "Bolivia"
      })
    ).toBe(true);
  });

  it("allows an international origin without state or department", () => {
    expect(
      isCompleteGeographicOrigin({
        city: "Lima",
        department: "",
        country: "Perú"
      })
    ).toBe(true);
  });

  it("compares normalized geographic origins", () => {
    expect(
      geographicOriginsMatch(
        { city: "Santa Cruz", department: "Santa Cruz", country: "Bolivia" },
        {
          city: "Santa Cruz de la Sierra",
          department: "Santa Cruz",
          country: "Bolivia"
        }
      )
    ).toBe(true);
  });
});
