import type { Access } from "payload";

type UserWithRole = {
  role?: "admin" | "editor";
};

export const isAuthenticated: Access = ({ req }) => Boolean(req.user);

export const isAdmin: Access = ({ req }) => (req.user as UserWithRole | null)?.role === "admin";

export const adminOrEditor: Access = ({ req }) => {
  const role = (req.user as UserWithRole | null)?.role;
  return role === "admin" || role === "editor";
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
