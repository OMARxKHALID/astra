import "./globals.css";
import { Outfit, Geist_Mono } from "next/font/google";
import PwaUpdateToast from "@/components/PwaUpdateToast";
import PwaOnboarding from "@/components/PwaOnboarding";
import SessionProvider from "@/providers/SessionProvider";
import { NEXT_PUBLIC_SITE_URL } from "@/constants/config";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: {
    template: "%s | Astra",
    default: "Astra | Watch Parties with Friends",
  },
  description:
    "Astra is a real-time video synchronization platform for watch parties. Stream movies, TV shows, and anime with friends while keeping everyone in perfect sync.",
  applicationName: "Astra",
  appleWebApp: {
    title: "Astra",
    statusBarStyle: "black-translucent",
    capable: true,
  },
  metadataBase: new URL(NEXT_PUBLIC_SITE_URL),
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
    title: "Astra | Watch Parties with Friends",
    description:
      "Astra is a real-time video synchronization platform for watch parties. Stream movies, TV shows, and anime with friends while keeping everyone in perfect sync.",
    url: NEXT_PUBLIC_SITE_URL,
    siteName: "Astra",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Astra - Watch Parties with Friends",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Astra | Watch Parties with Friends",
    description:
      "Astra is a real-time video synchronization platform for watch parties. Stream movies, TV shows, and anime with friends while keeping everyone in perfect sync.",
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
