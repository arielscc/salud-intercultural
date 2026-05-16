import {
  Activity,
  Apple,
  Brain,
  CalendarCheck,
  Droplets,
  HandHeart,
  HeartPulse,
  Leaf,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users
} from "lucide-react";
import type { IconMap, IconName } from "@/types/landing";

const icons: IconMap = {
  heartPulse: HeartPulse,
  activity: Activity,
  droplets: Droplets,
  leaf: Leaf,
  sparkles: Sparkles,
  stethoscope: Stethoscope,
  shieldCheck: ShieldCheck,
  mapPin: MapPin,
  messageCircle: MessageCircle,
  phone: Phone,
  users: Users,
  calendarCheck: CalendarCheck,
  handHeart: HandHeart,
  brain: Brain,
  apple: Apple
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const LucideIcon = icons[name];
  return <LucideIcon className={className} aria-hidden="true" />;
}
