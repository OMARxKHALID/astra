"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({ children }) {
  return (
    <NextAuthSessionProvider
      basePath="/api/auth"
    >
      {children}
    </NextAuthSessionProvider>
  );
}
