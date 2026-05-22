import { faqs } from "@/data/faqs";
import { homeContent } from "@/data/home";
import { services } from "@/data/services";
import { siteConfig } from "@/config/site";
import { testimonials } from "@/data/testimonials";

export const publicHomeFixture = {
  data: homeContent,
  source: "fallback" as const
};

export const publicServicesFixture = {
  data: services,
  source: "fallback" as const
};

export const publicTestimonialsFixture = {
  data: testimonials,
  source: "fallback" as const
};

export const publicFaqsFixture = {
  data: faqs,
  source: "fallback" as const
};

export const siteSettingsFixture = {
  data: siteConfig,
  source: "fallback" as const
};
