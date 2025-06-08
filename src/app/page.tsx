import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const DynamicHomePage = dynamic(() => import("./client.home.page"), {
  ssr: false,
  loading: () => <Skeleton className="h-screen w-screen" />,
});

export default function HomePage() {
  return <DynamicHomePage />;
}
