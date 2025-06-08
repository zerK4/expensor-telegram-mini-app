"use client";

import { Plus } from "lucide-react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";

export const AddReceiptButton = () => {
  const router = useRouter();

  const handleAddReceipt = () => {
    router.push("/receipts/add");
  };

  return (
    <Button
      size="icon"
      onClick={handleAddReceipt}
      className="fixed bottom-20 right-4 z-40 size-14 rounded-full shadow-lg"
    >
      <Plus size={32} />
    </Button>
  );
};
