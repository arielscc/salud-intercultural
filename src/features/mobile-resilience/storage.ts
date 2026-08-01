export const SIGECO_BROWSER_STORAGE_PREFIX = "sigeco.";
export const PURCHASE_SAFE_DRAFT_KEY = "sigeco.safe-draft.purchase.v1";

export function isSigecoStorageKey(key: string) {
  return key.startsWith(SIGECO_BROWSER_STORAGE_PREFIX);
}

function clearMatchingStorage(storage: Storage) {
  const keys = Array.from({ length: storage.length }, (_, index) =>
    storage.key(index)
  ).filter((key): key is string => Boolean(key && isSigecoStorageKey(key)));

  keys.forEach((key) => storage.removeItem(key));
}

export function clearSigecoBrowserStorage() {
  if (typeof window === "undefined") return;
  clearMatchingStorage(window.localStorage);
  clearMatchingStorage(window.sessionStorage);
}

export function clearSigecoSessionKey(key: string) {
  if (typeof window === "undefined" || !isSigecoStorageKey(key)) return;
  window.sessionStorage.removeItem(key);
}
