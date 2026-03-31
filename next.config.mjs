import withPWA from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  
  // Suppress dev cross-origin warning for network access
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.1.14", "192.168.1.14:3000"],

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "i.vimeocdn.com" },
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "cdn.discordapp.com" },
    ],
  },

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
        ],
      },
    ];
  },
};

export default withPWA({
  dest: "public", // SW + workbox files go in /public
  cacheOnFrontEndNav: true, // Cache pages visited client-side
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true, // Reload when connection comes back
  disable: process.env.NODE_ENV === "development", // No SW in dev
  workboxOptions: {
    disableDevLogs: true,
    // Don't cache anything from the Socket.IO server or video streams
    runtimeCaching: [
      {
        // App pages — network first, fall back to cache
        urlPattern: /^https?.*\/(room\/.*|$)/,
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          expiration: { maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      {
        // Static assets (JS, CSS) — stale while revalidate
        urlPattern: /\/_next\/static\/.*/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-assets",
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        // Google Fonts — cache for 1 year
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        // YouTube thumbnails
        urlPattern: /^https:\/\/(img\.youtube\.com|i\.ytimg\.com)\/.*/,
        handler: "CacheFirst",
        options: {
          cacheName: "yt-thumbs",
          expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
    ],
  },
})(nextConfig);
