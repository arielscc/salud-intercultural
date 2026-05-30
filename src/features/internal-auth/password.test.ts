import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/features/internal-auth/password";

describe("internal password hashing", () => {
  it("hashes and verifies a password without storing the raw value", async () => {
    const hash = await hashPassword("clave-segura-123");

    expect(hash).not.toContain("clave-segura-123");
    expect(await verifyPassword("clave-segura-123", hash)).toBe(true);
    expect(await verifyPassword("otra-clave", hash)).toBe(false);
  });
});
