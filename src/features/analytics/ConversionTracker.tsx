"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackConversionClick } from "./events";

type ConversionAction = "call_click" | "cta_click" | "whatsapp_click";

function getConversionAction(anchor: HTMLAnchorElement): ConversionAction | null {
  const configuredAction = anchor.dataset.conversionAction;

  if (
    configuredAction === "whatsapp_click" ||
    configuredAction === "call_click" ||
    configuredAction === "cta_click"
  ) {
    return configuredAction;
  }

  if (anchor.href.includes("wa.me") || anchor.href.includes("api.whatsapp.com")) {
    return "whatsapp_click";
  }

  if (anchor.href.startsWith("tel:")) {
    return "call_click";
  }

  if (anchor.dataset.conversionLabel) {
    return "cta_click";
  }

  return null;
}

function getSource(anchor: HTMLAnchorElement) {
  return anchor.dataset.conversionSource ?? anchor.dataset.leadOrigin ?? undefined;
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

      trackConversionClick({
        event: action,
        href: anchor.href,
        label: anchor.dataset.conversionLabel ?? anchor.textContent?.trim() ?? action,
        pagePath: pathname || "/",
        source: getSource(anchor)
      });
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname]);

  return null;
}
