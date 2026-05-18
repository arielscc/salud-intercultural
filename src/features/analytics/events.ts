"use client";

import type { AnalyticsEvent, AnalyticsEventName } from "./types";

declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: (
      command: "track" | "trackCustom",
      eventName: string,
      parameters?: Record<string, string>
    ) => void;
    gtag?: (
      command: "config" | "event",
      eventName: string,
      parameters?: Record<string, string | boolean>
    ) => void;
  }
}

function sanitizeUrl(value?: string) {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return value.split("?")[0]?.split("#")[0];
  }
}

function metaEventName(event: AnalyticsEventName) {
  if (event === "page_view") return "PageView";
  if (event === "form_submit") return "Lead";
  if (event === "whatsapp_click" || event === "call_click") return "Contact";
  return "CTA";
}

export function trackAnalyticsEvent(payload: AnalyticsEvent) {
  const event = {
    ...payload,
    link_url: sanitizeUrl(payload.link_url)
  };

  window.dataLayer ??= [];
  window.dataLayer.push(event);

  if (event.event === "page_view") {
    window.gtag?.("event", "page_view", {
      page_path: event.page_path ?? "/"
    });
    window.fbq?.("track", "PageView");
    return;
  }

  window.gtag?.("event", event.event, {
    event_category: event.event_category ?? "engagement",
    event_label: event.event_label ?? event.event,
    page_path: event.page_path ?? "/",
    source: event.source ?? "",
    form_origin: event.form_origin ?? "",
    link_url: event.link_url ?? ""
  });

  window.fbq?.("trackCustom", metaEventName(event.event), {
    event_label: event.event_label ?? event.event,
    page_path: event.page_path ?? "/",
    source: event.source ?? ""
  });
}

export function trackPageView(pagePath: string) {
  trackAnalyticsEvent({
    event: "page_view",
    event_category: "navigation",
    page_path: pagePath
  });
}

export function trackLeadFormSubmit(input: {
  formOrigin: string;
  pagePath: string;
  source: string;
}) {
  trackAnalyticsEvent({
    event: "form_submit",
    event_category: "lead",
    event_label: "lead_form_submit",
    form_origin: input.formOrigin,
    page_path: input.pagePath,
    source: input.source
  });
}

export function trackConversionClick(input: {
  event: "call_click" | "cta_click" | "whatsapp_click";
  href?: string;
  label: string;
  pagePath: string;
  source?: string;
}) {
  trackAnalyticsEvent({
    event: input.event,
    event_category: "conversion",
    event_label: input.label,
    link_url: input.href,
    page_path: input.pagePath,
    source: input.source
  });
}
