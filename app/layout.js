import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://watch-together-ebon.vercel.app"),
  title: {
    default: "WatchTogether — Watch videos in sync",
    template: "%s | WatchTogether",
  },
  description: "Create private rooms to watch videos, movies, and streams with friends in perfect real-time synchronization. No accounts needed.",
  applicationName: "WatchTogether",
  authors: [{ name: "WatchTogether Team" }],
  generator: "Next.js",
  keywords: ["watch together", "sync video", "real-time playback", "watch party", "youtube sync"],
  referrer: "origin-when-cross-origin",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://watch-together-ebon.vercel.app",
    siteName: "WatchTogether",
    title: "WatchTogether — Watch videos in sync",
    description: "Watch any video in perfect real-time sync with friends. Join a room and start your watch party instantly.",
    images: [
      {
        url: "/icon.svg",
        width: 512,
        height: 512,
        alt: "WatchTogether Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WatchTogether — Watch videos in sync",
    description: "Sync your video playback with friends globally.",
    images: ["/icon.svg"],
  },
};

export const viewport = {
  themeColor: "#07090d",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
