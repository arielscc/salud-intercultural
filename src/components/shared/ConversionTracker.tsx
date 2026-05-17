"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

type ConversionAction = "whatsapp_click" | "call_click";

type ConversionPayload = {
  event: "conversion_click";
  conversion_action: ConversionAction;
  conversion_label: string;
  conversion_href: string;
  page_path: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (
      command: "event",
      eventName: string,
      parameters: Record<string, string>
    ) => void;
  }
}

function getConversionAction(anchor: HTMLAnchorElement): ConversionAction | null {
  const configuredAction = anchor.dataset.conversionAction;

  if (configuredAction === "whatsapp_click" || configuredAction === "call_click") {
    return configuredAction;
  }

  if (anchor.href.includes("wa.me") || anchor.href.includes("api.whatsapp.com")) {
    return "whatsapp_click";
  }

  if (anchor.href.startsWith("tel:")) {
    return "call_click";
  }

  return null;
}

function emitConversion(payload: ConversionPayload) {
  window.dataLayer?.push(payload);
  window.gtag?.("event", payload.conversion_action, {
    event_category: "conversion",
    event_label: payload.conversion_label,
    link_url: payload.conversion_href,
    page_path: payload.page_path
  });
}

export function ConversionTracker() {
  const pathname = usePathname();

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a");

      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      const action = getConversionAction(anchor);

      if (!action) {
        return;
      }

      emitConversion({
        event: "conversion_click",
        conversion_action: action,
        conversion_label:
          anchor.dataset.conversionLabel ?? anchor.textContent?.trim() ?? action,
        conversion_href: anchor.href,
        page_path: pathname
      });
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname]);

  return null;
}
