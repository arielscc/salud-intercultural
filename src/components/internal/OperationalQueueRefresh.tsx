"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Loader2,
  RefreshCw,
  WifiOff
} from "lucide-react";
import { Button } from "@/components/internal/ui/Button";
import {
  QUEUE_REFRESH_REQUEST_TIMEOUT_MS,
  hasUnsavedQueueInput,
  isQueueRefreshStale,
  queueRefreshInterval,
  recordQueueRefreshMetric
} from "@/features/operational-queues/refresh-policy";
import { cn } from "@/lib/cn";

type OperationalQueueKey =
  | "reception"
  | "consultations"
  | "nursing"
  | "administration";

type RefreshFeedback = "dirty" | "failed" | null;

function relativeUpdateLabel(lastUpdatedAt: number, now: number) {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - lastUpdatedAt) / 1_000)
  );
  if (elapsedSeconds < 10) return "Actualizada ahora";
  if (elapsedSeconds < 60) {
    return `Actualizada hace ${elapsedSeconds} s`;
  }
  return `Actualizada hace ${Math.floor(elapsedSeconds / 60)} min`;
}

export function OperationalQueueRefresh({
  queueKey,
  serverUpdatedAt
}: {
  queueKey: OperationalQueueKey;
  serverUpdatedAt: string;
}) {
  const router = useRouter();
  const initialUpdatedAt = Date.parse(serverUpdatedAt);
  const [now, setNow] = useState(initialUpdatedAt);
  const [isMobile, setIsMobile] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<RefreshFeedback>(null);
  const [lastAttemptAt, setLastAttemptAt] = useState(initialUpdatedAt);
  const inFlightRef = useRef(false);
  const refreshStartedAtRef = useRef<number | null>(null);
  const previousServerUpdateRef = useRef(serverUpdatedAt);
  const requestTimeoutRef = useRef<number | null>(null);
  const intervalMs = queueRefreshInterval(isMobile);
  const parsedServerUpdate = Date.parse(serverUpdatedAt);
  const lastUpdatedAt = Number.isNaN(parsedServerUpdate)
    ? now
    : parsedServerUpdate;
  const stale = isQueueRefreshStale(lastUpdatedAt, now, intervalMs);

  const refreshQueue = useCallback(
    (origin: "automatic" | "manual") => {
      const dirty = hasUnsavedQueueInput();
      setIsDirty(dirty);
      if (dirty) {
        setFeedback("dirty");
        recordQueueRefreshMetric(queueKey, "blockedDirty");
        return;
      }
      if (!navigator.onLine) {
        setIsOnline(false);
        recordQueueRefreshMetric(queueKey, "pausedOffline");
        return;
      }
      if (document.visibilityState === "hidden" || inFlightRef.current) {
        if (document.visibilityState === "hidden") {
          recordQueueRefreshMetric(queueKey, "pausedHidden");
        }
        return;
      }

      const startedAt = Date.now();
      inFlightRef.current = true;
      refreshStartedAtRef.current = startedAt;
      setLastAttemptAt(startedAt);
      setFeedback(null);
      setIsRefreshing(true);
      recordQueueRefreshMetric(
        queueKey,
        origin === "automatic" ? "automaticStarted" : "manualStarted"
      );
      router.refresh();

      if (requestTimeoutRef.current) {
        window.clearTimeout(requestTimeoutRef.current);
      }
      requestTimeoutRef.current = window.setTimeout(() => {
        if (!inFlightRef.current) return;
        inFlightRef.current = false;
        refreshStartedAtRef.current = null;
        setIsRefreshing(false);
        setFeedback("failed");
        recordQueueRefreshMetric(queueKey, "failed");
      }, QUEUE_REFRESH_REQUEST_TIMEOUT_MS);
    },
    [queueKey, router]
  );

  useEffect(() => {
    if (
      previousServerUpdateRef.current === serverUpdatedAt ||
      !inFlightRef.current
    ) {
      previousServerUpdateRef.current = serverUpdatedAt;
      return;
    }

    previousServerUpdateRef.current = serverUpdatedAt;
    const completionTimer = window.setTimeout(() => {
      const durationMs = refreshStartedAtRef.current
        ? Date.now() - refreshStartedAtRef.current
        : undefined;
      inFlightRef.current = false;
      refreshStartedAtRef.current = null;
      setIsRefreshing(false);
      setFeedback(null);
      setNow(Date.now());
      if (requestTimeoutRef.current) {
        window.clearTimeout(requestTimeoutRef.current);
        requestTimeoutRef.current = null;
      }
      recordQueueRefreshMetric(queueKey, "completed", durationMs);
    }, 0);

    return () => {
      window.clearTimeout(completionTimer);
    };
  }, [queueKey, serverUpdatedAt]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const updateMedia = () => setIsMobile(media.matches);
    updateMedia();
    media.addEventListener("change", updateMedia);
    return () => media.removeEventListener("change", updateMedia);
  }, []);

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);
    const updateVisibility = () =>
      setIsVisible(document.visibilityState !== "hidden");
    updateConnection();
    updateVisibility();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    const updateDirtyState = () => {
      window.setTimeout(() => {
        const dirty = hasUnsavedQueueInput();
        setIsDirty(dirty);
        if (!dirty) setFeedback(null);
      }, 0);
    };
    updateDirtyState();
    document.addEventListener("input", updateDirtyState, true);
    document.addEventListener("change", updateDirtyState, true);
    document.addEventListener("reset", updateDirtyState, true);
    return () => {
      document.removeEventListener("input", updateDirtyState, true);
      document.removeEventListener("change", updateDirtyState, true);
      document.removeEventListener("reset", updateDirtyState, true);
    };
  }, [serverUpdatedAt]);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    if (!isOnline || !isVisible || isDirty || isRefreshing) return;
    const elapsed = Date.now() - Math.max(lastUpdatedAt, lastAttemptAt);
    const delay = Math.max(1_000, intervalMs - elapsed);
    const timer = window.setTimeout(
      () => refreshQueue("automatic"),
      delay
    );
    return () => window.clearTimeout(timer);
  }, [
    intervalMs,
    isDirty,
    isOnline,
    isRefreshing,
    isVisible,
    lastAttemptAt,
    lastUpdatedAt,
    refreshQueue
  ]);

  useEffect(
    () => () => {
      if (requestTimeoutRef.current) {
        window.clearTimeout(requestTimeoutRef.current);
      }
    },
    []
  );

  let statusText = relativeUpdateLabel(lastUpdatedAt, now);
  let statusIcon = <Check className="h-4 w-4" aria-hidden="true" />;
  let toneClass = "text-muted";

  if (!isOnline) {
    statusText = "Sin conexión · actualización pausada";
    statusIcon = <WifiOff className="h-4 w-4" aria-hidden="true" />;
    toneClass = "text-warning";
  } else if (isDirty || feedback === "dirty") {
    statusText = "Hay cambios sin aplicar · actualización pausada";
    statusIcon = <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
    toneClass = "text-warning";
  } else if (!isVisible) {
    statusText = "Actualización pausada en segundo plano";
  } else if (isRefreshing) {
    statusText = "Actualizando bandeja…";
    statusIcon = (
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
    );
    toneClass = "text-primary-dark";
  } else if (feedback === "failed") {
    statusText = "No se pudo actualizar · intenta nuevamente";
    statusIcon = <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
    toneClass = "text-error";
  } else if (stale) {
    statusText = "La bandeja puede estar desactualizada";
    statusIcon = <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
    toneClass = "text-warning";
  }

  return (
    <section
      className="flex min-h-11 items-center justify-between gap-3 rounded-[9px] border border-border bg-surface px-3 py-2"
      aria-label="Actualización de la bandeja"
    >
      <p
        className={cn(
          "flex min-w-0 items-center gap-2 text-xs font-medium tabular-nums",
          toneClass
        )}
        aria-live="polite"
      >
        <span className="shrink-0">{statusIcon}</span>
        <span className="truncate">{statusText}</span>
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        disabled={isRefreshing || !isOnline}
        onClick={() => refreshQueue("manual")}
      >
        <RefreshCw
          className={cn("h-4 w-4", isRefreshing && "animate-spin")}
          aria-hidden="true"
        />
        <span className="hidden sm:inline">Actualizar ahora</span>
        <span className="sm:hidden">Actualizar</span>
      </Button>
    </section>
  );
}
