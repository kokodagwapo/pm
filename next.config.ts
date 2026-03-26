import type { NextConfig } from "next";
import webpack from "webpack";

const r2PublicUrl =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL;
const r2Hostname = r2PublicUrl ? new URL(r2PublicUrl).hostname : null;

/** Replit sets REPL_ID; REPLIT_DEV_DOMAIN is not always present during dev. */
const isReplitRuntime =
  Boolean(process.env.REPLIT_DEV_DOMAIN) || Boolean(process.env.REPL_ID);

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

/**
 * Baked into the client bundle for next-auth/react.
 * In dev, do NOT default to localhost: NextAuth's reqWithEnvURL() rewrites the incoming
 * request to this origin; if the browser uses http://127.0.0.1:3000 but this is localhost,
 * redirects become wrong (often just "/") and "/" redirects back to sign-in → "can't log in".
 * Leave unset unless you explicitly need it (custom port, tunnel, etc.).
 */
const isNonProd = process.env.NODE_ENV !== "production";
const port = process.env.PORT;
const explicitAuthUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
const authUrlForClient =
  explicitAuthUrl ||
  (isNonProd ? "" : port ? `http://localhost:${port}` : "");

const nextConfig: NextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: replitDevOrigins,

  // Only inject when we know the URL. A wrong default like :3000 breaks sign-in when dev runs on :3101, :3020, etc.
  // If unset, Auth.js uses the current origin for client-side auth requests.
  env: {
    ...(authUrlForClient ? { NEXTAUTH_URL: authUrlForClient } : {}),
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

  // Long-lived caching for static assets (production only). Applying `immutable` to
  // `/_next/static` in development breaks dev CSS routes (e.g. app/layout.css) and
  // encourages browsers to cache stale or missing chunks after hot reloads.
  async headers() {
    if (process.env.NODE_ENV !== "production") {
      return [];
    }
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
    // Replit’s synced FS fires bogus watch events → endless recompiles / OOM / crashed dev server.
    if (dev && isReplitRuntime) {
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
