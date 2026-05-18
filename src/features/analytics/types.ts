export type AnalyticsProvider = "dataLayer" | "ga4" | "meta";

export type AnalyticsEventName =
  | "call_click"
  | "cta_click"
  | "form_submit"
  | "page_view"
  | "whatsapp_click";

export type AnalyticsEvent = {
  event: AnalyticsEventName;
  event_category?: "conversion" | "engagement" | "lead" | "navigation";
  event_label?: string;
  page_path?: string;
  source?: string;
  form_origin?: string;
  link_url?: string;
};
