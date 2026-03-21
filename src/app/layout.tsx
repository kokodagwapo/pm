import "./globals.css";
import { Inter, Playfair_Display, Montserrat, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
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
  title: "SmartStart Property Management",
  description: "Property Management Software",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SmartStartPM" />
        {process.env.NODE_ENV === 'development' && (
          <script dangerouslySetInnerHTML={{ __html: `
            (function(){
              window.addEventListener('error',function(e){
                var s=(e&&e.message)||'';var t=(e&&e.error&&e.error.stack)||'';
                if(t.indexOf('options.factory')!==-1||t.indexOf('webpack_require')!==-1||(s.indexOf("reading 'call'")!==-1&&t.indexOf('webpack')!==-1)){
                  e.preventDefault();e.stopImmediatePropagation();return false;
                }
              },true);
              window.addEventListener('unhandledrejection',function(e){
                var t=(e&&e.reason&&e.reason.stack)||'';
                if(t.indexOf('options.factory')!==-1||t.indexOf('webpack_require')!==-1){
                  e.preventDefault();
                }
              });
            })();
          `}} />
        )}
      </head>
      <body className={`${inter.variable} ${inter.className} ${playfair.variable} ${montserrat.variable} ${plusJakarta.variable} font-light`} suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster />
          <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  );
}
