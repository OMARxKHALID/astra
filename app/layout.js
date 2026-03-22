import "./globals.css";
import { DM_Sans, DM_Mono } from "next/font/google";

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
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/favicon.svg",
  },
};

export const viewport = { themeColor: "#07090d" };

export default function RootLayout({ children }) {
  return (
    // data-theme="dark" is the SSR default — matches what the browser starts with.
    // The inline script below overrides it to "light" before first paint if the
    // user has stored that preference. This way server and client always agree on
    // the initial value ("dark"), preventing the hydration mismatch.
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${dmSans.variable} ${dmMono.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {/*
          Theme initialisation script — runs synchronously before React hydrates.
          Only fires when stored theme is "light" (non-default), so the DOM stays
          "dark" (already matching SSR) unless the user explicitly chose light.
          React sees the final DOM value which matches whatever the script set,
          so there is no second mismatch after this point.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('wt_theme')==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}`,
          }}
        />
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
      <body>{children}</body>
    </html>
  );
}
