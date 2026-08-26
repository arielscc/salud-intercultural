"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Wifi, WifiOff } from "lucide-react";
import {
  resolveConnectionQuality,
  type ConnectionQuality
} from "@/features/mobile-resilience/connection";

type NetworkInformation = {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

function networkInformation() {
  return (navigator as Navigator & { connection?: NetworkInformation })
    .connection;
}

export function ConnectivityGuard() {
  const [quality, setQuality] = useState<ConnectionQuality>("online");
  const [recovered, setRecovered] = useState(false);
  const [blockedSubmit, setBlockedSubmit] = useState(false);

  useEffect(() => {
    let previous: ConnectionQuality = navigator.onLine ? "online" : "offline";

    const update = () => {
      const connection = networkInformation();
      const next = resolveConnectionQuality({
        online: navigator.onLine,
        effectiveType: connection?.effectiveType,
        saveData: connection?.saveData
      });
      if (previous === "offline" && next !== "offline") {
        setRecovered(true);
        window.setTimeout(() => setRecovered(false), 8_000);
      }
      previous = next;
      setQuality(next);
      if (next !== "offline") setBlockedSubmit(false);
    };

    const blockOfflineSubmit = (event: SubmitEvent) => {
      if (navigator.onLine) return;
      event.preventDefault();
      event.stopPropagation();
      setBlockedSubmit(true);
    };

    const connection = networkInformation();
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    connection?.addEventListener?.("change", update);
    document.addEventListener("submit", blockOfflineSubmit, true);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      connection?.removeEventListener?.("change", update);
      document.removeEventListener("submit", blockOfflineSubmit, true);
    };
  }, []);

  if (quality === "online" && !recovered) {
    return (
      <p
        className="print-hidden flex min-h-6 w-fit items-center gap-1.5 text-xs font-medium text-muted"
        role="status"
        aria-live="polite"
      >
        <Wifi className="h-3.5 w-3.5 text-success" aria-hidden="true" />
        En línea
      </p>
    );
  }

  const offline = quality === "offline";
  const Icon = offline
    ? WifiOff
    : quality === "slow"
      ? AlertTriangle
      : CheckCircle2;
  const tone = offline
    ? "border-error/30 bg-error/10 text-error"
    : quality === "slow"
      ? "border-warning/30 bg-warning/10 text-warning"
      : "border-success/30 bg-success/10 text-success";
  const title = offline
    ? "Sin conexión"
    : quality === "slow"
      ? "Conexión lenta"
      : "Conexión recuperada";
  const detail = offline
    ? blockedSubmit
      ? "No se envió el formulario. Lo escrito sigue en esta pantalla; inténtalo nuevamente al recuperar conexión."
      : "SIGECO no enviará formularios hasta recuperar conexión. No cierres esta pantalla."
    : quality === "slow"
      ? "Una confirmación puede tardar. Presiona una sola vez y espera el resultado."
      : "Revisa lo escrito y guarda nuevamente. SIGECO no reintenta cobros o stock automáticamente.";

  return (
    <aside
      className={`print-hidden flex flex-col gap-2 rounded-[9px] border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${tone}`}
      role={offline ? "alert" : "status"}
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          <strong>{title}.</strong> {detail}
        </p>
      </div>
      <Link
        href="/sigeco/contingencia"
        className="focus-ring inline-flex min-h-11 shrink-0 items-center font-semibold underline underline-offset-4"
      >
        Ver ficha de contingencia
      </Link>
    </aside>
  );
}
