import { createHash, randomBytes } from "node:crypto";

export function createFeedbackAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function hashFeedbackAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

