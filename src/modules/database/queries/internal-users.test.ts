import { describe, expect, it } from "vitest";
import { assertInternalUserAccessChange } from "@/modules/database/queries/internal-users";

describe("internal user access rules", () => {
  it("prevents changing the actor's own role", () => {
    expect(() =>
      assertInternalUserAccessChange({
        actorId: "admin-1",
        targetId: "admin-1",
        currentRole: "super_admin",
        currentActive: true,
        nextRole: "direccion",
        nextActive: true,
        activeSuperAdmins: 2
      })
    ).toThrowError(expect.objectContaining({ code: "SELF_ROLE_CHANGE" }));
  });

  it("prevents deactivating the actor's own account", () => {
    expect(() =>
      assertInternalUserAccessChange({
        actorId: "admin-1",
        targetId: "admin-1",
        currentRole: "super_admin",
        currentActive: true,
        nextRole: "super_admin",
        nextActive: false,
        activeSuperAdmins: 2
      })
    ).toThrowError(expect.objectContaining({ code: "SELF_DEACTIVATE" }));
  });

  it("protects the last active super administrator", () => {
    expect(() =>
      assertInternalUserAccessChange({
        actorId: "admin-2",
        targetId: "admin-1",
        currentRole: "super_admin",
        currentActive: true,
        nextRole: "direccion",
        nextActive: true,
        activeSuperAdmins: 1
      })
    ).toThrowError(expect.objectContaining({ code: "LAST_SUPER_ADMIN" }));
  });

  it("allows removing one super administrator when another remains", () => {
    expect(() =>
      assertInternalUserAccessChange({
        actorId: "admin-2",
        targetId: "admin-1",
        currentRole: "super_admin",
        currentActive: true,
        nextRole: "direccion",
        nextActive: true,
        activeSuperAdmins: 2
      })
    ).not.toThrow();
  });
});
