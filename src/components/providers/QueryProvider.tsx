"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { backButton, init } from "@telegram-apps/sdk-react";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

export const QueryProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    init();
    backButton.mount();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
