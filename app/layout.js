import "./globals.css";
import { DM_Sans, DM_Mono } from "next/font/google";
import PwaUpdateToast from "@/components/client/PwaUpdateToast";

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
  title: "WatchTogether — Watch videos in sync",
  description:
    "Create a private room, share the link, and watch any video with friends — all in real time.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://watch-together.vercel.app",
  ),
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "WatchTogether — Watch videos in sync",
    description:
      "Watch videos together with friends in perfect real-time sync.",
    url: "https://watch-together.vercel.app",
    siteName: "WatchTogether",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "WatchTogether Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WatchTogether — Watch videos in sync",
    description:
      "Watch videos together with friends in perfect real-time sync.",
    images: ["/og-image.png"],
  },
};

export const viewport = { themeColor: "#f59e0b" };

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${dmSans.variable} ${dmMono.variable}`}
    >
      <head>
        {/* Theme: apply stored preference before first paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('wt_theme')==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}`,
          }}
        />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="WatchTogether" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="WatchTogether" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Preconnects */}
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
        {children}
        <PwaUpdateToast />
      </body>
    </html>
  );
}
