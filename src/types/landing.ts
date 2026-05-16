import type { LucideIcon } from "lucide-react";

export type IconName =
  | "heartPulse"
  | "activity"
  | "droplets"
  | "leaf"
  | "sparkles"
  | "stethoscope"
  | "shieldCheck"
  | "mapPin"
  | "messageCircle"
  | "phone"
  | "users"
  | "calendarCheck"
  | "handHeart"
  | "brain"
  | "apple";

export type Problem = {
  title: string;
  headline: string;
  description: string;
  cta: string;
  whatsappMessage: string;
  icon: IconName;
};

export type Service = {
  slug: string;
  image: string;
  imageAlt: string;
  title: string;
  description: string;
  benefits: string[];
  relatedProblems: string[];
  whatsappMessage: string;
  icon: IconName;
  active: boolean;
  featured: boolean;
  seo: {
    title: string;
    description: string;
  };
};

export type FAQ = {
  question: string;
  answer: string;
};

export type Testimonial = {
  quote: string;
  author: string;
};

export type IconMap = Record<IconName, LucideIcon>;
