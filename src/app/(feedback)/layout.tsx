import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "@/app/globals.css";
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

export const metadata: Metadata = {
  title: "Encuesta privada | Salud Intercultural",
  description: "Formulario privado sobre la atención recibida.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true
  }
};

export default function FeedbackRootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${sora.variable}`}
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
