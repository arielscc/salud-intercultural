import { beforeEach, describe, expect, it } from "vitest";
import {
  clearSigecoBrowserStorage,
  clearSigecoSessionKey,
  isSigecoStorageKey,
  PURCHASE_SAFE_DRAFT_KEY
} from "@/features/mobile-resilience/storage";

describe("mobile resilience storage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("recognizes only SIGECO-owned keys", () => {
    expect(isSigecoStorageKey(PURCHASE_SAFE_DRAFT_KEY)).toBe(true);
    expect(isSigecoStorageKey("payload.preference")).toBe(false);
  });

  it("clears SIGECO data on logout without touching unrelated browser data", () => {
    localStorage.setItem("sigeco.local", "1");
    sessionStorage.setItem("sigeco.session", "1");
    localStorage.setItem("unrelated", "keep");

    clearSigecoBrowserStorage();

    expect(localStorage.getItem("sigeco.local")).toBeNull();
    expect(sessionStorage.getItem("sigeco.session")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });

  it("clears one approved session draft", () => {
    sessionStorage.setItem(PURCHASE_SAFE_DRAFT_KEY, "draft");
    clearSigecoSessionKey(PURCHASE_SAFE_DRAFT_KEY);
    expect(sessionStorage.getItem(PURCHASE_SAFE_DRAFT_KEY)).toBeNull();
  });
});
