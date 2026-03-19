import "./globals.css";

export const metadata = {
  title:       "WatchTogether",
  description: "Watch videos in perfect sync with friends.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
