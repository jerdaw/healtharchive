import type { NextConfig } from "next";

const csp = [
  "default-src 'self';",
  "script-src 'self';",
  "style-src 'self' 'unsafe-inline';",
  "img-src 'self' data: https:;",
  "font-src 'self' data:;",
  "connect-src 'self' https://api.healtharchive.ca;",
  "frame-src 'self' https://api.healtharchive.ca https://replay.healtharchive.ca;",
  "frame-ancestors 'self';",
  "base-uri 'self';",
  "form-action 'self';",
].join(" ");

const securityHeaders = [
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), microphone=(), camera=()",
  },
  {
    // Start in report-only mode so we can tune the policy safely
    // without breaking users if we missed an allowed origin.
    key: "Content-Security-Policy-Report-Only",
    value: csp,
  },
];

const nextConfig: NextConfig = {
  // CDN bandwidth optimization for Next Image responses.
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
