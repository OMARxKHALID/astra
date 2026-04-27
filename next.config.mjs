// @ts-check
import withPWA from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  reactStrictMode: true,
  poweredByHeader: false,

  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.1.10",
    "192.168.1.10:3000",
  ],

  images: {
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
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^\/api\/.*/,
        handler: "NetworkOnly",
      },
      {
        urlPattern: /^https?.*\/(room\/.*|$)/,
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          expiration: { maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\/_next\/static\/.*/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-assets",
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /^https:\/\/(img\.youtube\.com|i\.ytimg\.com)\/.*/,
        handler: "CacheFirst",
        options: {
          cacheName: "yt-thumbs",
          expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /^https:\/\/image\.tmdb\.org\/.*/,
        handler: "CacheFirst",
        options: {
          cacheName: "tmdb-images",
          expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
    ],
  },
})(nextConfig);
