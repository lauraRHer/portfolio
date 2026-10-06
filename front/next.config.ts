import type { NextConfig } from "next";

/**
 * Dev server: allow opening the site from other devices on the LAN
 * (e.g. a phone at http://192.168.1.17:3000). Next 16 blocks cross-origin
 * requests to dev resources by default, which leaves the page un-hydrated
 * (invisible animated text, no 3D, no chat). Extra hosts: DEV_ALLOWED_ORIGINS
 * (comma-separated). Has no effect on production builds.
 */
const devOrigins = [
  "192.168.*.*",
  "10.*.*.*",
  "*.local",
  ...(process.env.DEV_ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
  // Standalone output keeps the Docker image small (see front/Dockerfile).
  output: "standalone",
  reactStrictMode: true,
  // Basic security headers. No strict CSP: React Three Fiber and Next's inline
  // scripts would need nonces, which isn't worth it for a static portfolio.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  // next-intl: instead of `createNextIntlPlugin()` we register the alias it would
  // add (`next-intl/config` → our request config) by hand. The plugin eagerly
  // imports `@swc/core`, whose native addon refuses to load when a parent of
  // ~/.cache is group-writable. See docs/adr/0003-next-intl-sin-plugin.md.
  turbopack: {
    resolveAlias: {
      "next-intl/config": "./src/i18n/request.ts",
    },
  },
};

export default nextConfig;
