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
          banner: `(function(){if(typeof window==='undefined'||window.__wpErrGuard)return;window.__wpErrGuard=true;window.addEventListener('error',function(e){var err=e&&e.error;if(err){var s=String(err.stack||'');if(s.indexOf('options.factory')!==-1||s.indexOf('webpack_require')!==-1){e.preventDefault();e.stopImmediatePropagation();return false;}}},true);window.addEventListener('unhandledrejection',function(e){var r=e&&e.reason;if(r){var s=String(r.stack||'');if(s.indexOf('options.factory')!==-1||s.indexOf('webpack_require')!==-1){e.preventDefault();}}});})();`,
        })
      );
    }
    return config;
  },
};

export default nextConfig;
