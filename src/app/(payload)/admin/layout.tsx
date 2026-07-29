import config from "@payload-config";
import "@payloadcms/next/css";
import { RootLayout } from "@payloadcms/next/layouts";
import type { ReactNode } from "react";
import { StagingEnvironmentChrome } from "@/components/environment/StagingEnvironmentChrome";
import { isStagingEnvironment } from "@/lib/deployment-environment";
import "./custom.css";
import { importMap } from "./importMap";
import { serverFunction } from "./serverFunction";

export default function PayloadAdminLayout({ children }: { children: ReactNode }) {
  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      <StagingEnvironmentChrome enabled={isStagingEnvironment()} />
      {children}
    </RootLayout>
  );
}
