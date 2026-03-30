import "./globals.css";
import { DM_Sans, DM_Mono } from "next/font/google";
import PwaUpdateToast from "@/components/PwaUpdateToast";
import SessionProvider from "@/providers/SessionProvider";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
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
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://img.youtube.com" />
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://player.vimeo.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SessionProvider>
          {children}
          <PwaUpdateToast />
        </SessionProvider>
      </body>
    </html>
  );
}
