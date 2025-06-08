import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const AddReceiptClientPage = dynamic(() => import("./client.add.page"), {
  ssr: false,
  loading: () => <Skeleton className="h-screen w-screen" />,
});

export default function AddReceiptPage() {
  return <AddReceiptClientPage />;
}
