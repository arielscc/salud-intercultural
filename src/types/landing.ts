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
  id: string;
  question: string;
  answer: string;
  category: "appointments" | "location" | "contact" | "treatments" | "pricing";
  active: boolean;
  featured: boolean;
  order: number;
};

export type Testimonial = {
  id: string;
  quote: string;
  author: string;
  treatmentType: string;
  rating?: number;
  date?: string;
  active: boolean;
  featured: boolean;
  order: number;
  privacyNotice?: string;
};

export type TeamMember = {
  id: string;
  name: string;
  slug: string;
  photo: string;
  photoAlt: string;
  role: string;
  specialty: string;
  description: string;
  credentials: string[];
  focusAreas: string[];
  active: boolean;
  featured: boolean;
  order: number;
};

export type IconMap = Record<IconName, LucideIcon>;
