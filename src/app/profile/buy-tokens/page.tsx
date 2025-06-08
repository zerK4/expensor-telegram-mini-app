import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const ClientBuyTokens = dynamic(() => import("./client.buy-tokens.page"), {
  ssr: false,
  loading: () => <Skeleton className="h-screen w-screen" />,
});

export default function BuyTokensPage() {
  return <ClientBuyTokens />;
}
