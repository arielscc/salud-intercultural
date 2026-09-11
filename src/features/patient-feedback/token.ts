import { createHash, randomBytes } from "node:crypto";

const branchCodePattern = /^[a-z0-9-]{2,80}$/;
const secretPattern = /^[A-Za-z0-9_-]{43}$/;

export function createFeedbackAccessToken(branchCode: string) {
  if (!branchCodePattern.test(branchCode)) {
    throw new Error("INVALID_FEEDBACK_TOKEN_BRANCH");
  }
  return `${branchCode}.${randomBytes(32).toString("base64url")}`;
}

export function parseFeedbackAccessToken(token: string) {
  const separator = token.indexOf(".");
  if (separator < 0 || token.indexOf(".", separator + 1) >= 0) return null;
  const branchCode = token.slice(0, separator);
  const secret = token.slice(separator + 1);
  if (!branchCodePattern.test(branchCode) || !secretPattern.test(secret)) {
    return null;
  }
  return { branchCode };
}

export function hashFeedbackAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
