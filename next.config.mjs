/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,          // gzip/brotli compression
  poweredByHeader: false,  // hide "X-Powered-By: Next.js"
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" }
        ]
      },
      {
        // signed video URLs: allow long media caching on the CDN edge
        source: "/api/video/:jobId",
        headers: [{ key: "Cache-Control", value: "private, max-age=300" }]
      }
    ];
  }
};
export default nextConfig;
