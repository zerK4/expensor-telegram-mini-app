"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLaunchParams, backButton, init } from "@telegram-apps/sdk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addReceipt } from "@/app/receipts/add/actions";
import { getFilterOptions } from "@/app/receipts/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Receipt, Save, ArrowLeft } from "lucide-react";

interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function AddReceiptPage() {
  const router = useRouter();
  const { tgWebAppData } = useLaunchParams();
  const queryClient = useQueryClient();

  const [user, setUser] = useState<any>(undefined);
  const [formData, setFormData] = useState({
    companyName: "",
    categoryId: "",
    date: new Date().toISOString().split("T")[0],
    total: "",
    currency: "EUR",
    paidCash: "",
    paidCard: "",
  });
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (tgWebAppData) {
      setUser(tgWebAppData.user);
    }
  }, [tgWebAppData]);

  // Setup Telegram back button
  useEffect(() => {
    init();
    backButton.mount();
    backButton.show();
    backButton.onClick(() => {
      window.history.back();
    });

    return () => {
      backButton.hide();
    };
  }, []);

  // Get categories and companies for dropdowns
  const { data: filterOptions, isLoading: isLoadingOptions } = useQuery({
    queryKey: ["filter-options", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User not found");
      return getFilterOptions(user.id);
    },
    enabled: !!user?.id,
  });

  // Mutation for adding receipt
  const { mutate: saveReceipt, isPending } = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not found");

      const receiptData = {
        telegramUserId: user.id,
        companyName: formData.companyName,
        categoryId: formData.categoryId
          ? parseInt(formData.categoryId)
          : undefined,
        date: formData.date,
        total: parseFloat(formData.total),
        currency: formData.currency,
        paidCash: formData.paidCash ? parseFloat(formData.paidCash) : null,
        paidCard: formData.paidCard ? parseFloat(formData.paidCard) : null,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          currency: formData.currency,
        })),
      };

      return addReceipt(receiptData);
    },
    onSuccess: () => {
      // Invalidate receipts queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: ["receipts-analytics"] });
      router.push("/");
    },
    onError: (error) => {
      console.error("Error saving receipt:", error);
      setErrors({ submit: "Failed to save receipt. Please try again." });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const addItem = () => {
    const newItem: ReceiptItem = {
      id: Date.now().toString(),
      name: "",
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (
    id: string,
    field: keyof ReceiptItem,
    value: string | number,
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Auto-calculate total when quantity or unit price changes
          if (field === "quantity" || field === "unitPrice") {
            updated.total = updated.quantity * updated.unitPrice;
          }
          return updated;
        }
        return item;
      }),
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = "Store name is required";
    }

    if (!formData.total || parseFloat(formData.total) <= 0) {
      newErrors.total = "Total amount must be greater than 0";
    }

    if (!formData.date) {
      newErrors.date = "Date is required";
    }

    // Validate payment amounts
    const total = parseFloat(formData.total) || 0;
    const cash = parseFloat(formData.paidCash) || 0;
    const card = parseFloat(formData.paidCard) || 0;

    if (cash + card > 0 && Math.abs(cash + card - total) > 0.01) {
      newErrors.payment = "Cash + Card amounts must equal the total";
    }

    // Validate items
    items.forEach((item, index) => {
      if (item.name && (!item.quantity || item.quantity <= 0)) {
        newErrors[`item_${index}_quantity`] = "Quantity must be greater than 0";
      }
      if (item.name && (!item.unitPrice || item.unitPrice <= 0)) {
        newErrors[`item_${index}_unitPrice`] =
          "Unit price must be greater than 0";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      saveReceipt();
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome to Receipt Tracker</CardTitle>
            <CardDescription>
              Please open this app from Telegram to continue
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 py-4 max-w-2xl">
      {/* Header with back button for non-Telegram environments */}
      <div className="flex items-center mb-6">
        <h1 className="text-2xl font-bold">Add Receipt</h1>
        <p className="text-gray-600 text-sm">
          Manually enter your expense details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Receipt Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Store Name */}
            <div>
              <Label htmlFor="companyName">Store Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) =>
                  handleInputChange("companyName", e.target.value)
                }
                placeholder="Enter store name"
                className={errors.companyName ? "border-red-500" : ""}
              />
              {errors.companyName && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.companyName}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) =>
                  handleInputChange("categoryId", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No category</SelectItem>
                  {filterOptions?.categories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id!.toString()}
                    >
                      <div className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                className={errors.date ? "border-red-500" : ""}
              />
              {errors.date && (
                <p className="text-red-500 text-xs mt-1">{errors.date}</p>
              )}
            </div>

            {/* Total Amount */}
            <div>
              <Label htmlFor="total">Total Amount *</Label>
              <div className="flex gap-2">
                <Input
                  id="total"
                  type="number"
                  step="0.01"
                  value={formData.total}
                  onChange={(e) => handleInputChange("total", e.target.value)}
                  placeholder="0.00"
                  className={`flex-1 ${errors.total ? "border-red-500" : ""}`}
                />
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    handleInputChange("currency", value)
                  }
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {errors.total && (
                <p className="text-red-500 text-xs mt-1">{errors.total}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Method</CardTitle>
            <CardDescription>Optional: Specify how you paid</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paidCash">Paid with Cash</Label>
                <Input
                  id="paidCash"
                  type="number"
                  step="0.01"
                  value={formData.paidCash}
                  onChange={(e) =>
                    handleInputChange("paidCash", e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="paidCard">Paid with Card</Label>
                <Input
                  id="paidCard"
                  type="number"
                  step="0.01"
                  value={formData.paidCard}
                  onChange={(e) =>
                    handleInputChange("paidCard", e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
            {errors.payment && (
              <p className="text-red-500 text-xs">{errors.payment}</p>
            )}
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Items</CardTitle>
                <CardDescription>
                  Optional: Add individual items
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No items added yet
              </p>
            ) : (
              items.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Item {index + 1}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div>
                    <Label htmlFor={`item_${index}_name`}>Item Name</Label>
                    <Input
                      id={`item_${index}_name`}
                      value={item.name}
                      onChange={(e) =>
                        updateItem(item.id, "name", e.target.value)
                      }
                      placeholder="Enter item name"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor={`item_${index}_quantity`}>Qty</Label>
                      <Input
                        id={`item_${index}_quantity`}
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "quantity",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className={
                          errors[`item_${index}_quantity`]
                            ? "border-red-500"
                            : ""
                        }
                      />
                      {errors[`item_${index}_quantity`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors[`item_${index}_quantity`]}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`item_${index}_unitPrice`}>
                        Unit Price
                      </Label>
                      <Input
                        id={`item_${index}_unitPrice`}
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "unitPrice",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className={
                          errors[`item_${index}_unitPrice`]
                            ? "border-red-500"
                            : ""
                        }
                      />
                      {errors[`item_${index}_unitPrice`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors[`item_${index}_unitPrice`]}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`item_${index}_total`}>Total</Label>
                      <Input
                        id={`item_${index}_total`}
                        type="number"
                        step="0.01"
                        value={item.total.toFixed(2)}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="space-y-4">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Saving Receipt...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Receipt
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
