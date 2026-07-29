"use client";

import { useEffect, useState } from "react";

const blockedProtocols = new Set(["mailto:", "tel:", "sms:"]);
const blockedHosts = new Set(["wa.me", "api.whatsapp.com", "web.whatsapp.com"]);

function isCommunicationLink(anchor: HTMLAnchorElement) {
  if (anchor.hash === "#staging-contact-blocked") return true;

  try {
    const url = new URL(anchor.href, window.location.href);
    return blockedProtocols.has(url.protocol) || blockedHosts.has(url.hostname);
  } catch {
    return false;
  }
}

export function StagingEnvironmentChrome({ enabled }: { enabled: boolean }) {
  const [blockedNotice, setBlockedNotice] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;

    function blockRealContact(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement) || !isCommunicationLink(anchor)) return;

      event.preventDefault();
      event.stopPropagation();
      setBlockedNotice(true);
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setBlockedNotice(false), 4000);
    }

    document.addEventListener("click", blockRealContact, true);
    document.addEventListener("auxclick", blockRealContact, true);
    document.addEventListener("contextmenu", blockRealContact, true);

    return () => {
      document.removeEventListener("click", blockRealContact, true);
      document.removeEventListener("auxclick", blockRealContact, true);
      document.removeEventListener("contextmenu", blockRealContact, true);
      if (timeout) clearTimeout(timeout);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      aria-live="polite"
      data-testid="staging-environment-banner"
      style={{
        alignItems: "center",
        background: "#9a3412",
        border: "2px solid #fed7aa",
        borderRadius: "999px",
        boxShadow: "0 8px 24px rgba(22, 38, 44, 0.24)",
        color: "#fff7ed",
        display: "flex",
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        fontWeight: 800,
        gap: "6px",
        left: "50%",
        letterSpacing: "0.04em",
        maxWidth: "calc(100vw - 24px)",
        padding: "7px 12px",
        position: "fixed",
        textAlign: "center",
        top: "calc(8px + env(safe-area-inset-top))",
        transform: "translateX(-50%)",
        zIndex: 2147483647
      }}
    >
      <span aria-hidden="true">●</span>
      {blockedNotice
        ? "CONTACTO REAL BLOQUEADO"
        : "STAGING · DATOS SINTÉTICOS · CONTACTOS BLOQUEADOS"}
    </div>
  );
}
