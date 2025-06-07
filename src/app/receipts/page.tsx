"use client";

import { ReceiptsList } from "@/components/receipts-list";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

// Create QueryClient outside component to prevent recreation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function ReceiptsPage() {
  const t = useTranslations();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t("receipts.title")}
          </h1>
          <p className="text-gray-600">{t("receipts.description")}</p>
        </div>
        <ReceiptsList />
      </div>
    </QueryClientProvider>
  );
}
