import "./globals.css";
import { Outfit, Geist_Mono } from "next/font/google";
import PwaUpdateToast from "@/components/PwaUpdateToast";
import PwaOnboarding from "@/components/PwaOnboarding";
import SessionProvider from "@/providers/SessionProvider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: {
    template: "%s | Astra",
    default: "Astra | Stream Movies, TV Shows & Anime",
  },
  description:
    "Explore a massive library of movies, TV shows, and anime. Stream content in high quality with a premium, social viewing experience.",
  applicationName: "Astra",
  appleWebApp: {
    title: "Astra",
    statusBarStyle: "black-translucent",
    capable: true,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://astra-sync.vercel.app",
  ),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Astra — Premium Streaming & Content Discovery",
    description:
      "A feature-rich portal to browse and stream movies, series, and anime with global real-time synchronization.",
    url: "https://astra-sync.vercel.app",
    siteName: "Astra",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Astra Premium Streaming Portal",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Astra | Premium Streaming & Content Discovery",
    description:
      "A feature-rich portal to browse and stream movies, series, and anime with global real-time synchronization.",
    images: ["/og-image.png"],
  },
};

export const viewport = { themeColor: "#f59e0b" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} ${geistMono.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://img.youtube.com" />
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://player.vimeo.com" />

      </head>
      <body>
        <SessionProvider>
          {children}
          <PwaUpdateToast />
          <PwaOnboarding />
        </SessionProvider>
      </body>
    </html>
  );
}
