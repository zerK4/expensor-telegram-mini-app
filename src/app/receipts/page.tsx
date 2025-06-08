import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const ReceiptsPage = dynamic(() => import("./receipts.client.page"), {
  ssr: false,
  loading: () => <Skeleton className="h-screen w-screen" />,
});

export default function Page() {
  return <ReceiptsPage />;
}
