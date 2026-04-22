"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { AuthProvider } from "@/context/auth-context";
import { ToastProvider } from "@/context/toast-context";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="cacumator"
      themes={["sunrise", "ocean", "forest", "graphite", "cacumator", "databricks"]}
      enableSystem={false}
    >
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
