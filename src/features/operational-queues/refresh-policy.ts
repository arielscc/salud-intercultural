export const DESKTOP_QUEUE_REFRESH_INTERVAL_MS = 30_000;
export const MOBILE_QUEUE_REFRESH_INTERVAL_MS = 60_000;
export const QUEUE_REFRESH_REQUEST_TIMEOUT_MS = 20_000;

const ignoredInputTypes = new Set([
  "button",
  "hidden",
  "image",
  "reset",
  "submit"
]);

export function queueRefreshInterval(isMobile: boolean) {
  return isMobile
    ? MOBILE_QUEUE_REFRESH_INTERVAL_MS
    : DESKTOP_QUEUE_REFRESH_INTERVAL_MS;
}

export function isQueueRefreshDue(
  lastUpdatedAt: number,
  now: number,
  intervalMs: number
) {
  return now - lastUpdatedAt >= intervalMs;
}

export function isQueueRefreshStale(
  lastUpdatedAt: number,
  now: number,
  intervalMs: number
) {
  return now - lastUpdatedAt >= intervalMs * 2;
}

function inputIsDirty(input: HTMLInputElement) {
  if (ignoredInputTypes.has(input.type)) return false;
  if (input.type === "checkbox" || input.type === "radio") {
    return input.checked !== input.defaultChecked;
  }
  if (input.type === "file") return Boolean(input.files?.length);
  return input.value !== input.defaultValue;
}

function selectIsDirty(select: HTMLSelectElement) {
  return Array.from(select.options).some(
    (option) => option.selected !== option.defaultSelected
  );
}

export function isFormDirty(form: HTMLFormElement) {
  return Array.from(form.elements).some((element) => {
    if (element instanceof HTMLInputElement) return inputIsDirty(element);
    if (element instanceof HTMLTextAreaElement) {
      return element.value !== element.defaultValue;
    }
    if (element instanceof HTMLSelectElement) return selectIsDirty(element);
    return false;
  });
}

export function hasUnsavedQueueInput(root: ParentNode = document) {
  if (root.querySelector('[data-queue-refresh-dirty="true"]')) return true;
  return Array.from(root.querySelectorAll("form")).some((form) =>
    isFormDirty(form)
  );
}

export type QueueRefreshMetric =
  | "automaticStarted"
  | "manualStarted"
  | "completed"
  | "failed"
  | "blockedDirty"
  | "pausedOffline"
  | "pausedHidden";

type StoredQueueRefreshMetrics = Partial<
  Record<QueueRefreshMetric, number>
> & {
  totalDurationMs: number;
  lastDurationMs: number;
};

export function recordQueueRefreshMetric(
  queueKey: string,
  metric: QueueRefreshMetric,
  durationMs?: number
) {
  try {
    const storageKey = `sigeco.queue-refresh.v1.${queueKey}`;
    const current = JSON.parse(
      window.sessionStorage.getItem(storageKey) ?? "{}"
    ) as Partial<StoredQueueRefreshMetrics>;
    const next = {
      ...current,
      [metric]: (current[metric] ?? 0) + 1,
      totalDurationMs:
        (current.totalDurationMs ?? 0) + (durationMs ?? 0),
      lastDurationMs: durationMs ?? current.lastDurationMs ?? 0
    } satisfies StoredQueueRefreshMetrics;
    window.sessionStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // La medición local nunca debe impedir que la bandeja se actualice.
  }
}
