"use client";

import { useEffect, useState } from "react";
import { retrieveLaunchParams } from "@tma.js/sdk";
import { getUserReceipts } from "@/app/receipts/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Building2, Tag, CreditCard, Banknote, Receipt, AlertCircle } from "lucide-react";

type Receipt = {
  id: number;
  date: string;
  total: number;
  currency: string;
  paidCash: number | null;
  paidCard: number | null;
  createdAt: string | null;
  company: {
    id: number | null;
    name: string | null;
  } | null;
  category: {
    id: number | null;
    name: string | null;
    icon: string | null;
  } | null;
};

export function ReceiptsList() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function fetchReceipts() {
      try {
        setLoading(true);
        setError(null);

        // Get user data from Telegram
        const { initData: data } = retrieveLaunchParams();
        const telegramUser = data?.user;

        if (!telegramUser) {
          setError("User not found. Please open this app from Telegram.");
          return;
        }

        setUser(telegramUser);

        // Fetch user receipts
        const userReceipts = await getUserReceipts(telegramUser.id);
        setReceipts(userReceipts);
      } catch (err) {
        console.error("Error fetching receipts:", err);
        setError("Failed to load receipts. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchReceipts();
  }, []);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={handleRetry} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <Receipt className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No receipts yet</h3>
        <p className="text-gray-500 mb-4">Your receipts will appear here once you start adding them.</p>
        {user && (
          <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 mt-4">
            <p>Welcome, {user.firstName}!</p>
            <p>User ID: {user.id}</p>
          </div>
        )}
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
      }).format(amount);
    } catch {
      return `${amount} ${currency}`;
    }
  };

  const getPaymentMethodText = (receipt: Receipt) => {
    const methods = [];
    if (receipt.paidCash && receipt.paidCash > 0) {
      methods.push(`Cash: ${formatCurrency(receipt.paidCash, receipt.currency)}`);
    }
    if (receipt.paidCard && receipt.paidCard > 0) {
      methods.push(`Card: ${formatCurrency(receipt.paidCard, receipt.currency)}`);
    }
    return methods;
  };

  return (
    <div className="space-y-4">
      {user && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            Showing receipts for <strong>{user.firstName} {user.lastName}</strong>
          </p>
        </div>
      )}
      
      <div className="text-sm text-gray-600 mb-4">
        {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} found
      </div>

      {receipts.map((receipt) => (
        <Card key={receipt.id} className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg flex items-center gap-2 mb-2">
                  {receipt.category?.icon && (
                    <span className="text-xl flex-shrink-0">{receipt.category.icon}</span>
                  )}
                  <span className="truncate">
                    {receipt.company?.name || "Unknown Store"}
                  </span>
                </CardTitle>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>{formatDate(receipt.date)}</span>
                  </div>
                  {receipt.category?.name && (
                    <div className="flex items-center gap-1">
                      <Tag className="w-4 h-4 flex-shrink-0" />
                      <Badge variant="secondary" className="text-xs">
                        {receipt.category.name}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(receipt.total, receipt.currency)}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {getPaymentMethodText(receipt).length > 0 && (
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
                {receipt.paidCash !== null && receipt.paidCash > 0 && (
                  <div className="flex items-center gap-1">
                    <Banknote className="w-4 h-4 flex-shrink-0" />
                    <span>Cash: {formatCurrency(receipt.paidCash, receipt.currency)}</span>
                  </div>
                )}
                {receipt.paidCard !== null && receipt.paidCard > 0 && (
                  <div className="flex items-center gap-1">
                    <CreditCard className="w-4 h-4 flex-shrink-0" />
                    <span>Card: {formatCurrency(receipt.paidCard, receipt.currency)}</span>
                  </div>
                )}
              </div>
            )}
            {receipt.createdAt && (
              <div className="text-xs text-gray-400">
                Added on {formatDate(receipt.createdAt)}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}