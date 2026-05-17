import type { GlobalConfig } from "payload";
import { HomeContent } from "./HomeContent.ts";
import { SiteSettings } from "./SiteSettings.ts";

export const globals: GlobalConfig[] = [SiteSettings, HomeContent];
