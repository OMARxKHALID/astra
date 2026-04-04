"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export default function SessionProvider({ children }) {
  return (
    <NextAuthSessionProvider
      basePath="/api/auth"
    >
      {children}
    </NextAuthSessionProvider>
  );
}
