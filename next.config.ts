import type { NextConfig } from "next";
import webpack from "webpack";

const r2PublicUrl =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL;
const r2Hostname = r2PublicUrl ? new URL(r2PublicUrl).hostname : null;

const replitDevOrigins: string[] = [
  ...(process.env.REPLIT_DEV_DOMAIN ? [process.env.REPLIT_DEV_DOMAIN, `https://${process.env.REPLIT_DEV_DOMAIN}`] : []),
  ...(process.env.REPLIT_DOMAINS
    ? process.env.REPLIT_DOMAINS.split(",").flatMap((d) => [d.trim(), `https://${d.trim()}`])
    : []),
  "*.spock.replit.dev",
  "*.replit.dev",
  "localhost",
  "127.0.0.1",
];

const nextConfig: NextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: replitDevOrigins,

  // Inline for client bundles (next-auth/react). Must match the origin you use in the browser during dev.
  env: {
    NEXTAUTH_URL:
      process.env.NEXTAUTH_URL ||
      process.env.AUTH_URL ||
      "http://localhost:3000",
  },

  serverExternalPackages: ["mongodb"],

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Performance optimizations
  experimental: {
    optimizeCss: false,
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "date-fns",
      "recharts",
      "@fullcalendar/react",
      "@fullcalendar/daygrid",
      "@fullcalendar/timegrid",
      "@fullcalendar/list",
      "@fullcalendar/interaction",
    ],
  },

  // Enable compression
  compress: true,

  // Power by header removal for security
  poweredByHeader: false,

  images: {
    unoptimized: true,
  },

  transpilePackages: ["@radix-ui/react-label", "@radix-ui/react-primitive"],

  // Headers for caching static assets
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },

  skipTrailingSlashRedirect: true,

  webpack: (config, { dev, isServer }) => {
    if (dev && process.env.REPLIT_DEV_DOMAIN) {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    if (dev && !isServer) {
      config.plugins.push(
        new webpack.BannerPlugin({
          raw: true,
          entryOnly: false,
          include: /webpack|main-app|app-pages/,
          banner: `(function(){if(typeof window==='undefined'||window.__wpErrGuard)return;window.__wpErrGuard=true;function isWpErr(e){if(!e)return false;var m=String(e.message||'');var s=String(e.stack||'');return s.indexOf('options.factory')!==-1||s.indexOf('webpack_require')!==-1||(m.indexOf("reading 'call'")!==-1&&s.indexOf('webpack')!==-1);}var _re=window.reportError;if(_re){window.reportError=function(e){if(!isWpErr(e))return _re.call(window,e);};}var c=globalThis.console,_ce=c.error.bind(c);Object.defineProperty(c,'error',{configurable:true,writable:true,value:function(){var a0=arguments[0];if(typeof a0==='string'&&(a0==='Critical Application Error:'||a0.indexOf('Invalid hook call')!==-1))return;for(var i=0;i<arguments.length;i++){var a=arguments[i];if(a&&typeof a==='object'&&isWpErr(a))return;}return _ce.apply(c,arguments);}});window.addEventListener('error',function(e){if(isWpErr(e)||isWpErr(e&&e.error)){e.preventDefault();e.stopImmediatePropagation();return false;}},true);window.addEventListener('unhandledrejection',function(e){if(isWpErr(e&&e.reason)){e.preventDefault();}});})();`,
        })
      );
    }
    return config;
  },
};

export default nextConfig;
