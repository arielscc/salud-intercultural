import type { Access } from "payload";

type UserWithRole = {
  role?: "admin" | "editor";
  payloadBranch?: string | null;
};

export const isAuthenticated: Access = ({ req }) => Boolean(req.user);

export const isAdmin: Access = ({ req }) => (req.user as UserWithRole | null)?.role === "admin";

export const adminOrEditor: Access = ({ req }) => {
  const role = (req.user as UserWithRole | null)?.role;
  return role === "admin" || role === "editor";
};

export const branchScopedAccess: Access = ({ req }) => {
  const user = req.user as UserWithRole | null;
  if (user?.role === "admin") return true;
  if (user?.role !== "editor" || !user.payloadBranch) return false;
  return { branchCode: { equals: user.payloadBranch } };
};

export const publicOrAuthenticatedActiveRead: Access = ({ req }) => {
  if (req.user) {
    return true;
  }

  return {
    active: {
      equals: true
    }
  };
};
