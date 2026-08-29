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
  description: "Sistema interno de gestion clinica y operativa.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true
  }
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
      {/*
        Las extensiones del navegador (Grammarly, por ejemplo) escriben
        atributos en el `body` antes de que React hidrate, y esa diferencia
        se reportaba como error de hidratación en cada pantalla. Se silencia
        solo en este nodo: los hijos siguen avisando si de verdad no cuadran.
      */}
      <body suppressHydrationWarning>
        <StagingEnvironmentChrome enabled={isStagingEnvironment()} />
        {children}
      </body>
    </html>
  );
}
