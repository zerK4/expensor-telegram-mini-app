"use client";

import { ReceiptsList } from "@/components/receipts-list";

export default function ReceiptsPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Receipts</h1>
        <p className="text-gray-600">Track and manage your expenses</p>
      </div>
      <ReceiptsList />
    </div>
  );
}
