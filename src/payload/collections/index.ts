import type { CollectionConfig } from "payload";
import { Faqs } from "./Faqs.ts";
import { LeadSubmissions } from "./LeadSubmissions.ts";
import { Media } from "./Media.ts";
import { Pages } from "./Pages.ts";
import { Services } from "./Services.ts";
import { TeamMembers } from "./TeamMembers.ts";
import { Testimonials } from "./Testimonials.ts";
import { TreatmentTopics } from "./TreatmentTopics.ts";
import { Users } from "./Users.ts";

export const collections: CollectionConfig[] = [
  Users,
  Media,
  Services,
  Testimonials,
  TreatmentTopics,
  Faqs,
  TeamMembers,
  Pages,
  LeadSubmissions
];
