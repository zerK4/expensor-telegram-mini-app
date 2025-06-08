"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";

const DynamicReceiptsPage = dynamic(
  () => import("@/components/receipts-list"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-screen w-screen" />,
  },
);

export default function ReceiptsPage() {
  const t = useTranslations();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">{t("receipts.title")}</h1>
          <p className="text-gray-600">{t("receipts.description")}</p>
        </div>
        <DynamicReceiptsPage />
      </div>
    </AppLayout>
  );
}
