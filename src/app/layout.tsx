import "./globals.css";
import { Inter, Playfair_Display, Montserrat, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { PwaInstallHint } from "@/components/pwa/PwaInstallHint";
import { LunaWidgetShell } from "@/components/landing/LunaWidgetShell";
import type { Metadata } from "next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["100", "200", "300", "400", "500", "600"],
  display: "swap",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SmartStartPM - AI Agentic Property Management Software",
  description: "Enterprise-grade property management software powered by autonomous AI and machine learning. Unified platform for owners, managers, tenants, and maintenance teams. Features: intelligent messaging, automated forms, real-time collaboration, full AI autonomy, continuous learning. Perfect for residential, dorm, student housing, and educational institutions with flexible discounts.",
  keywords: "property management software, AI property management, agentic AI, property manager, tenant management, maintenance management, messaging platform, residential management, dorm management, student housing, real estate management, automated forms, machine learning, smart property, autonomous management, property software",
  applicationName: "SmartStartPM",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: [
      { url: "/icons/icon-180x180.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SmartStartPM",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover" as const,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

const devOverlaySuppressor = process.env.NODE_ENV === "development"
  ? `(function(){if(typeof window==='undefined')return;function isEmptyErr(el){if(!el)return false;var t=el.textContent||'';return t.indexOf('Critical Application Error')!==-1&&(t.indexOf('{}')!==-1||t.indexOf(': {}')!==-1);}var obs=new MutationObserver(function(muts){for(var i=0;i<muts.length;i++){for(var j=0;j<muts[i].addedNodes.length;j++){var nd=muts[i].addedNodes[j];if(nd.tagName&&nd.tagName.toLowerCase()==='nextjs-portal'){nd.style.display='none';setTimeout(function(p){if(isEmptyErr(p)){p.remove();}else{p.style.display='';}},120,nd);}}}});obs.observe(document.documentElement,{childList:true,subtree:true});})();`
  : "";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {devOverlaySuppressor && (
          <script dangerouslySetInnerHTML={{ __html: devOverlaySuppressor }} />
        )}
      </head>
      <body className={`${inter.variable} ${inter.className} ${playfair.variable} ${montserrat.variable} ${plusJakarta.variable} font-light`} suppressHydrationWarning>
        <Providers>
          {children}
          <LunaWidgetShell />
          <Toaster />
          <ServiceWorkerRegistration />
          <PwaInstallHint variant="dark" />
        </Providers>
      </body>
    </html>
  );
}
