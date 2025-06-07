"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useLaunchParams, backButton, init } from "@telegram-apps/sdk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { updateReceipt, getReceiptById } from "./actions";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Minus, Save, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface ReceiptItem {
  id?: number;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function EditReceiptPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const { tgWebAppData } = useLaunchParams();
  const queryClient = useQueryClient();

  const receiptId = Number.parseInt(params.id as string);
  const [user, setUser] = useState<any>(undefined);
  const [formData, setFormData] = useState({
    companyName: "",
    categoryId: "",
    date: "",
    total: "",
    currency: "EUR",
    paidCash: "",
    paidCard: "",
  });
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFormReady, setIsFormReady] = useState(false);

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

  // Get receipt data
  const {
    data: receiptData,
    isLoading: isLoadingReceipt,
    error: receiptError,
  } = useQuery({
    queryKey: ["receipt", receiptId, user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User not found");
      return getReceiptById(receiptId, user.id);
    },
    enabled: !!user?.id && !!receiptId,
  });

  // Get categories and companies for dropdowns
  const { data: filterOptions } = useQuery({
    queryKey: ["filter-options", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User not found");
      return getFilterOptions(user.id);
    },
    enabled: !!user?.id,
  });

  // Populate form when receipt data is loaded
  useEffect(() => {
    if (receiptData && !isFormReady) {
      const receipt = receiptData.receipt;
      setFormData({
        companyName: receipt.company?.name || "",
        categoryId: receipt.categoryId?.toString() || "0", // Updated default value to be a non-empty string
        date: receipt.date,
        total: receipt.total.toString(),
        currency: receipt.currency,
        paidCash: receipt.paidCash?.toString() || "",
        paidCard: receipt.paidCard?.toString() || "",
      });

      setItems(
        receiptData.items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      );

      setIsFormReady(true);
    }
  }, [receiptData, isFormReady]);

  // Mutation for updating receipt
  const { mutate: saveReceipt, isPending } = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not found");

      const receiptData = {
        receiptId,
        telegramUserId: user.id,
        companyName: formData.companyName,
        categoryId: formData.categoryId
          ? Number.parseInt(formData.categoryId)
          : undefined,
        date: formData.date,
        total: Number.parseFloat(formData.total),
        currency: formData.currency,
        paidCash: formData.paidCash
          ? Number.parseFloat(formData.paidCash)
          : null,
        paidCard: formData.paidCard
          ? Number.parseFloat(formData.paidCard)
          : null,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          currency: formData.currency,
        })),
      };

      return updateReceipt(receiptData);
    },
    onSuccess: () => {
      // Invalidate receipts queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: ["receipts-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["receipt", receiptId] });
      router.push("/receipts");
    },
    onError: (error) => {
      console.error("Error updating receipt:", error);
      setErrors({ submit: t("receipt.updateError") });
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
      name: "",
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof ReceiptItem,
    value: string | number,
  ) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
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
      newErrors.companyName = t("receipt.storeNameRequired");
    }

    if (!formData.total || Number.parseFloat(formData.total) <= 0) {
      newErrors.total = t("receipt.totalRequired");
    }

    if (!formData.date) {
      newErrors.date = t("receipt.dateRequired");
    }

    // Validate payment amounts
    const total = Number.parseFloat(formData.total) || 0;
    const cash = Number.parseFloat(formData.paidCash) || 0;
    const card = Number.parseFloat(formData.paidCard) || 0;

    if (cash + card > 0 && Math.abs(cash + card - total) > 0.01) {
      newErrors.payment = t("receipt.paymentError");
    }

    // Validate items
    items.forEach((item, index) => {
      if (item.name && (!item.quantity || item.quantity <= 0)) {
        newErrors[`item_${index}_quantity`] = t("receipt.quantityError");
      }
      if (item.name && (!item.unitPrice || item.unitPrice <= 0)) {
        newErrors[`item_${index}_unitPrice`] = t("receipt.unitPriceError");
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
          <CardHeader className="pb-2">
            <CardTitle>{t("common.welcomeTitle")}</CardTitle>
            <CardDescription>{t("common.telegramRequired")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoadingReceipt) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex flex-col mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="rounded-xl">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (receiptError) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t("common.receiptNotFound")}
          </h3>
          <p className="text-red-600 mb-4">
            {t("common.receiptNotFoundDescription")}
          </p>
          <Button onClick={() => router.push("/receipts")} variant="outline">
            {t("common.backToReceipts")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Header */}
      <div className="flex flex-col mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("receipt.editTitle")}</h1>
        <p className="text-gray-600">{t("receipt.editDescription")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t("receipt.details")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 px-5 pb-5">
            {/* Store Name */}
            <div>
              <Label className="text-base mb-1.5 block" htmlFor="companyName">
                {t("receipt.storeName")} *
              </Label>
              <Input
                className={cn(
                  "h-12 rounded-lg text-base",
                  errors.companyName ? "border-red-500" : "",
                )}
                id="companyName"
                value={formData.companyName}
                onChange={(e) =>
                  handleInputChange("companyName", e.target.value)
                }
                placeholder={t("receipt.storePlaceholder")}
              />
              {errors.companyName && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.companyName}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <Label className="text-base mb-1.5 block" htmlFor="category">
                {t("receipt.category")}
              </Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) =>
                  handleInputChange("categoryId", value)
                }
              >
                <SelectTrigger className="h-12 rounded-lg text-base">
                  <SelectValue placeholder={t("receipt.categoryPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t("receipt.noCategory")}</SelectItem>{" "}
                  {/* Updated default value to be a non-empty string */}
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
              <Label className="text-base mb-1.5 block" htmlFor="date">
                {t("receipt.date")} *
              </Label>
              <Input
                className={cn(
                  "h-12 rounded-lg text-base",
                  errors.date ? "border-red-500" : "",
                )}
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
              />
              {errors.date && (
                <p className="text-red-500 text-xs mt-1">{errors.date}</p>
              )}
            </div>

            {/* Total Amount */}
            <div>
              <Label className="text-base mb-1.5 block" htmlFor="total">
                {t("receipt.totalAmount")} *
              </Label>
              <div className="flex gap-2">
                <Input
                  className={cn(
                    "h-12 rounded-lg text-base",
                    `flex-1 ${errors.total ? "border-red-500" : ""}`,
                  )}
                  id="total"
                  type="number"
                  step="0.01"
                  value={formData.total}
                  onChange={(e) => handleInputChange("total", e.target.value)}
                  placeholder="0.00"
                />
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    handleInputChange("currency", value)
                  }
                >
                  <SelectTrigger className="h-12 rounded-lg text-base w-20">
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
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {t("receipt.paymentMethod")}
            </CardTitle>
            <CardDescription>{t("receipt.paymentDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-5 pb-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-base mb-1.5 block" htmlFor="paidCash">
                  {t("receipt.paidCash")}
                </Label>
                <Input
                  className="h-12 rounded-lg text-base"
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
                <Label className="text-base mb-1.5 block" htmlFor="paidCard">
                  {t("receipt.paidCard")}
                </Label>
                <Input
                  className="h-12 rounded-lg text-base"
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
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t("receipt.items")}</CardTitle>
                <CardDescription>
                  {t("receipt.itemsDescription")}
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                className="rounded-lg h-10"
              >
                <Plus className="w-5 h-5 mr-2" />
                {t("receipt.addItem")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-5 pb-5">
            {items.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                {t("receipt.noItems")}
              </p>
            ) : (
              items.map((item, index) => (
                <div
                  key={index}
                  className="border rounded-xl p-4 space-y-4 bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="px-3 py-1 text-sm">
                      {t("labels.item", { number: index + 1 })}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="h-10 w-10 rounded-full"
                    >
                      <Minus className="w-5 h-5" />
                    </Button>
                  </div>

                  <div>
                    <Label
                      className="text-base mb-1.5 block"
                      htmlFor={`item_${index}_name`}
                    >
                      {t("receipt.itemName")}
                    </Label>
                    <Input
                      className="h-12 rounded-lg text-base"
                      id={`item_${index}_name`}
                      value={item.name}
                      onChange={(e) =>
                        updateItem(index, "name", e.target.value)
                      }
                      placeholder={t("receipt.itemNamePlaceholder")}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label
                        className="text-base mb-1.5 block"
                        htmlFor={`item_${index}_quantity`}
                      >
                        {t("receipt.quantity")}
                      </Label>
                      <Input
                        className={cn(
                          "h-12 rounded-lg text-base",
                          errors[`item_${index}_quantity`]
                            ? "border-red-500"
                            : "",
                        )}
                        id={`item_${index}_quantity`}
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "quantity",
                            Number.parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                      {errors[`item_${index}_quantity`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors[`item_${index}_quantity`]}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label
                        className="text-base mb-1.5 block"
                        htmlFor={`item_${index}_unitPrice`}
                      >
                        {t("receipt.unitPrice")}
                      </Label>
                      <Input
                        className={cn(
                          "h-12 rounded-lg text-base",
                          errors[`item_${index}_unitPrice`]
                            ? "border-red-500"
                            : "",
                        )}
                        id={`item_${index}_unitPrice`}
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "unitPrice",
                            Number.parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                      {errors[`item_${index}_unitPrice`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors[`item_${index}_unitPrice`]}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label
                        className="text-base mb-1.5 block"
                        htmlFor={`item_${index}_total`}
                      >
                        {t("receipt.total")}
                      </Label>
                      <Input
                        className="h-12 rounded-lg text-base bg-gray-50"
                        id={`item_${index}_total`}
                        type="number"
                        step="0.01"
                        value={item.total.toFixed(2)}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="space-y-4 pb-20">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-600">{errors.submit}</p>
            </div>
          )}

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-10">
            <div className="container mx-auto max-w-2xl">
              <Button
                type="submit"
                className="w-full h-14 text-lg font-medium rounded-xl"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    {t("receipt.updating")}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-3" />
                    {t("receipt.update")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
