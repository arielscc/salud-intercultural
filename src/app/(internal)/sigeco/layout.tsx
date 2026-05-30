import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "@/app/globals.css";

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
  title: "Sigeco | Salud Intercultural",
  description: "Sistema interno de gestion clinica y operativa."
};

export default function SigecoRootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${sora.variable}`} data-theme="light">
      <body style={{ paddingBottom: 0 }}>{children}</body>
    </html>
  );
}
