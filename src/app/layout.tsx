import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "@/app/globals.css";
import { seo, siteUrl } from "@/lib/seo";

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
  metadataBase: new URL(siteUrl),
  title: seo.title,
  description: seo.description,
  keywords: seo.keywords,
  openGraph: {
    title: seo.title,
    description: seo.description,
    url: siteUrl,
    siteName: "Salud Intercultural",
    images: [{ url: seo.image, width: 1200, height: 630 }],
    locale: "es_BO",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
    images: [seo.image]
  },
  alternates: {
    canonical: siteUrl
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${sora.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark');document.documentElement.dataset.theme='dark'}else{document.documentElement.dataset.theme='light'}}catch(e){}"
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
