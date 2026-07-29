import type { Metadata } from "next";
import { IBM_Plex_Sans, Inter, Sora } from "next/font/google";
import "@/app/globals.css";
import "./sigeco.css";
import { StagingEnvironmentChrome } from "@/components/environment/StagingEnvironmentChrome";
import { isStagingEnvironment } from "@/lib/deployment-environment";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap"
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Sigeco | Salud Intercultural",
  description: "Sistema interno de gestion clinica y operativa."
};

export default function SigecoRootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`sigeco-app ${inter.variable} ${sora.variable} ${plexSans.variable}`}
      data-theme="light"
      data-scroll-behavior="smooth"
    >
      <body>
        <StagingEnvironmentChrome enabled={isStagingEnvironment()} />
        {children}
      </body>
    </html>
  );
}
