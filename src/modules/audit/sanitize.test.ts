import { describe, expect, it } from "vitest";
import { sanitizeAuditContext } from "@/modules/audit/sanitize";

describe("sanitizeAuditContext", () => {
  it("keeps small operational metadata", () => {
    expect(
      sanitizeAuditContext({
        route: "/sigeco/inventario",
        previousStatus: "pending",
        nextStatus: "completed",
        quantity: 3
      })
    ).toEqual({
      route: "/sigeco/inventario",
      previousStatus: "pending",
      nextStatus: "completed",
      quantity: 3
    });
  });

  it("removes secrets, clinical text and files at every level", () => {
    const context = sanitizeAuditContext({
      password: "never-store-this",
      token: "secret-token",
      apiKey: "private-api-key",
      phone: "70000000",
      email: "patient@example.com",
      clinicalNote: "full private clinical note",
      attachment: { filename: "result.pdf", content: "binary" },
      nested: {
        authorization: "Bearer secret",
        diagnosis: "private diagnosis",
        status: "completed"
      }
    });
    const serialized = JSON.stringify(context);

    expect(serialized).not.toContain("never-store-this");
    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("private-api-key");
    expect(serialized).not.toContain("70000000");
    expect(serialized).not.toContain("patient@example.com");
    expect(serialized).not.toContain("private");
    expect(serialized).not.toContain("result.pdf");
    expect(context).toEqual({ nested: { status: "completed" } });
  });

  it("limits large strings and collections", () => {
    const context = sanitizeAuditContext({
      route: "x".repeat(500),
      ids: Array.from({ length: 50 }, (_, index) => index)
    });

    expect(String(context?.route)).toHaveLength(160);
    expect(context?.ids).toHaveLength(30);
  });
});
