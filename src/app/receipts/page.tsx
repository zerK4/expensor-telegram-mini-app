import { ReceiptsList } from "@/components/receipts-list";

export default function ReceiptsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Receipts</h1>
          <p className="text-gray-600 mt-1">Track all your expenses</p>
        </div>
        <ReceiptsList />
      </div>
    </div>
  );
}