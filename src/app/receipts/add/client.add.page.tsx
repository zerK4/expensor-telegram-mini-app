"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Save, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { backButton, init } from "@telegram-apps/sdk-react";
import { NewCategoryModal } from "@/components/newCategoryModal";

interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function AddReceiptClientPage() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [mounted, setMounted] = useState(false);
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

  const { telegramUser: user, isLoading: isLoadingUser } = useUser();

  useEffect(() => {
    setMounted(true);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
        (window as any).Telegram.WebApp.BackButton.hide();
      }
    };
  }, []);

  // Get categories and companies for dropdowns
  const { data: filterOptions, isLoading: isLoadingOptions } = useQuery({
    queryKey: ["filter-options", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User not found");
      return getFilterOptions(user.id);
    },
    enabled: !!user?.id && mounted,
  });

  // Mutation for adding receipt
  const { mutate: saveReceipt, isPending } = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not found");

      const receiptData = {
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
      setErrors({ submit: t("receipt.saveError") });
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

  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-12 bg-muted rounded mb-4"></div>
                <div className="h-12 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!user && !isLoadingUser) {
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

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Header with back button for non-Telegram environments */}
      <div className="flex flex-col mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("receipt.addTitle")}</h1>
        <p className="text-muted-foreground">{t("receipt.addDescription")}</p>
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
                  errors.companyName ? "border-destructive" : "",
                )}
                id="companyName"
                value={formData.companyName}
                onChange={(e) =>
                  handleInputChange("companyName", e.target.value)
                }
                placeholder={t("receipt.storePlaceholder")}
              />
              {errors.companyName && (
                <p className="text-destructive text-xs mt-1">
                  {errors.companyName}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <Label className="text-base mb-1.5 block" htmlFor="category">
                {t("receipt.category")}
              </Label>
              <div className="flex items-center gap-2 w-full">
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    handleInputChange("categoryId", value)
                  }
                >
                  <SelectTrigger className="h-12 rounded-lg text-base">
                    <SelectValue
                      placeholder={t("receipt.categoryPlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{t("receipt.noCategory")}</SelectItem>
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
                <NewCategoryModal />
              </div>
            </div>

            {/* Date */}
            <div>
              <Label className="text-base mb-1.5 block" htmlFor="date">
                {t("receipt.date")} *
              </Label>
              <Input
                className={cn(
                  "h-12 rounded-lg text-base",
                  errors.date ? "border-destructive" : "",
                )}
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
              />
              {errors.date && (
                <p className="text-destructive text-xs mt-1">{errors.date}</p>
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
                    `flex-1 ${errors.total ? "border-destructive" : ""}`,
                  )}
                  id="total"
                  type="number"
                  step="0.01"
                  value={formData.total}
                  onChange={(e) => handleInputChange("total", e.target.value)}
                  placeholder={t("receipt.totalPlaceholder")}
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
                    <SelectItem value="EUR">{t("currency.eur")}</SelectItem>
                    <SelectItem value="USD">{t("currency.usd")}</SelectItem>
                    <SelectItem value="GBP">{t("currency.gbp")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {errors.total && (
                <p className="text-destructive text-xs mt-1">{errors.total}</p>
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
                  placeholder={t("receipt.totalPlaceholder")}
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
                  placeholder={t("receipt.totalPlaceholder")}
                />
              </div>
            </div>
            {errors.payment && (
              <p className="text-destructive text-xs">{errors.payment}</p>
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
              <p className="text-muted-foreground text-sm text-center py-4">
                {t("receipt.noItems")}
              </p>
            ) : (
              items.map((item, index) => (
                <div
                  key={item.id}
                  className="border rounded-xl p-4 space-y-4 bg-muted"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="px-3 py-1 text-sm">
                      {t("labels.item", { number: index + 1 })}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
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
                        updateItem(item.id, "name", e.target.value)
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
                            ? "border-destructive"
                            : "",
                        )}
                        id={`item_${index}_quantity`}
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "quantity",
                            Number.parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                      {errors[`item_${index}_quantity`] && (
                        <p className="text-destructive text-xs mt-1">
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
                            ? "border-destructive"
                            : "",
                        )}
                        id={`item_${index}_unitPrice`}
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "unitPrice",
                            Number.parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                      {errors[`item_${index}_unitPrice`] && (
                        <p className="text-destructive text-xs mt-1">
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
                        className="h-12 rounded-lg text-base bg-muted"
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
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
              <p className="text-destructive">{errors.submit}</p>
            </div>
          )}

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-10">
            <div className="container mx-auto max-w-2xl">
              <Button
                type="submit"
                className="w-full h-14 text-lg font-medium rounded-xl"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    {t("receipt.saving")}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-3" />
                    {t("receipt.save")}
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
