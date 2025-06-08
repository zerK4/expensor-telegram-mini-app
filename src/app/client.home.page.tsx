"use client";

import React, { useEffect } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  getUserReceiptsPaginated,
  getFilterOptions,
} from "@/app/receipts/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartTooltip } from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ListIcon, TrendingUp, Tag, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getUserProfile } from "@/app/profile/actions";
import { AppLayout } from "@/components/layout/app-layout";
import { useUser } from "@/hooks/use-user";

export default function ClientHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(undefined);
  const [mounted, setMounted] = useState(false);
  const { telegramUser } = useUser();

  // Translations
  const t = useTranslations();

  useEffect(() => {
    setMounted(true);

    setUser(telegramUser);
    // const webApp = (window as any).Telegram.WebApp;
    // if (webApp.initDataUnsafe?.user) {
    //   setUser(webApp.initDataUnsafe.user);
    // }
  }, [telegramUser]);

  // Get user profile data
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User not found");
      return getUserProfile(user.id);
    },
    enabled: !!user?.id && mounted,
    staleTime: 1000 * 60 * 5,
  });

  // Get receipt data for charts
  const { data: receiptData, isLoading: isLoadingReceipts } = useQuery({
    queryKey: ["receipts-analytics", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not found");
      const data = await getUserReceiptsPaginated({
        telegramId: user.id,
        limit: 100,
        sort: { field: "date", direction: "desc" },
      });
      return data;
    },
    enabled: !!user?.id && mounted,
    staleTime: 1000 * 60 * 5,
  });

  // Get categories for charts
  const { data: filterOptions } = useQuery({
    queryKey: ["filter-options", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User not found");
      return getFilterOptions(user.id);
    },
    enabled: !!user?.id && mounted,
    staleTime: 1000 * 60 * 10,
  });

  // Prepare chart data
  const categoryData = React.useMemo(() => {
    if (!receiptData?.receipts || !filterOptions?.categories) return [];

    const categoryMap = new Map();

    filterOptions.categories.forEach((category) => {
      categoryMap.set(category.id, {
        name: category.name,
        icon: category.icon,
        value: 0,
      });
    });

    receiptData.receipts.forEach((receipt) => {
      if (receipt.category?.id) {
        const current = categoryMap.get(receipt.category.id);
        if (current) {
          categoryMap.set(receipt.category.id, {
            ...current,
            value: current.value + receipt.total,
          });
        }
      }
    });

    return Array.from(categoryMap.values())
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [receiptData?.receipts, filterOptions?.categories]);

  // Monthly spending data
  const monthlyData = React.useMemo(() => {
    if (!receiptData?.receipts) return [];

    const monthMap = new Map();
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
      const monthName = month.toLocaleDateString("en-US", { month: "short" });
      monthMap.set(monthKey, { name: monthName, total: 0 });
    }

    receiptData.receipts.forEach((receipt) => {
      const date = new Date(receipt.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (monthMap.has(monthKey)) {
        const current = monthMap.get(monthKey);
        monthMap.set(monthKey, {
          ...current,
          total: current.total + receipt.total,
        });
      }
    });

    return Array.from(monthMap.values());
  }, [receiptData?.receipts]);

  // Calculate total spending
  const totalSpending = React.useMemo(() => {
    if (!receiptData?.receipts) return 0;
    return receiptData.receipts.reduce(
      (sum, receipt) => sum + receipt.total,
      0,
    );
  }, [receiptData?.receipts]);

  // Calculate average receipt amount
  const averageAmount = React.useMemo(() => {
    if (!receiptData?.receipts || receiptData.receipts.length === 0) return 0;
    return totalSpending / receiptData.receipts.length;
  }, [receiptData?.receipts, totalSpending]);

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#8dd1e1",
  ];

  // Format currency
  const formatCurrency = (amount: number) => {
    const currency = profile?.preferredCurrency || "EUR";
    const locale = profile?.language === "ro" ? "ro-RO" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const handleViewAllReceipts = () => {
    router.push("/receipts");
  };

  const handleAddReceipt = () => {
    router.push("/receipts/add");
  };

  if (!mounted) {
    return (
      <AppLayout>
        <div className="container mx-auto px-3 py-4 max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{t("common.welcomeTitle")}</CardTitle>
              <CardDescription>{t("common.telegramRequired")}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-3 py-4 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="p-3">
            <CardContent className="p-0">
              <div className="text-xs text-muted-foreground mb-1">
                {t("dashboard.totalSpending")}
              </div>
              {isLoadingReceipts ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <div className="text-lg font-bold truncate">
                  {formatCurrency(totalSpending)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="p-3">
            <CardContent className="p-0">
              <div className="text-xs text-muted-foreground mb-1">
                {t("dashboard.receiptsCount")}
              </div>
              {isLoadingReceipts ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <div className="text-lg font-bold">
                  {receiptData?.totalCount || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="p-3">
            <CardContent className="p-0">
              <div className="text-xs text-muted-foreground mb-1">
                {t("dashboard.averageAmount")}
              </div>
              {isLoadingReceipts ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <div className="text-lg font-bold truncate">
                  {formatCurrency(averageAmount)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="p-3">
            <CardContent className="p-0">
              <div className="text-xs text-muted-foreground mb-1">
                {t("dashboard.categories")}
              </div>
              {isLoadingReceipts ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <div className="text-lg font-bold">
                  {filterOptions?.categories.length || 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Spending by Category Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Tag className="w-4 h-4 mr-2" />
              {t("dashboard.spendingByCategory")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {isLoadingReceipts ? (
              <div className="h-[250px] flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-mute border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : categoryData.length > 0 ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background p-2 border rounded shadow-lg text-xs">
                              <div className="flex items-center gap-1">
                                <span>{data.icon}</span>
                                <span className="font-medium">{data.name}</span>
                              </div>
                              <div className="text-primary font-bold">
                                {formatCurrency(data.value)}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                {t("dashboard.noCategoryData")}
              </div>
            )}

            {/* Mobile-friendly legend */}
            {categoryData.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-2">
                {categoryData.slice(0, 5).map((entry, index) => (
                  <div
                    key={entry.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                      <span className="flex items-center gap-1">
                        <span>{entry.icon}</span>
                        <span>{entry.name}</span>
                      </span>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(entry.value)}
                    </span>
                  </div>
                ))}
                {categoryData.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center mt-1">
                    {t("dashboard.moreCategories", {
                      count: categoryData.length - 5,
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Spending Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <TrendingUp className="w-4 h-4 mr-2" />
              {t("dashboard.monthlySpending")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {isLoadingReceipts ? (
              <div className="h-[250px] flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : monthlyData.length > 0 ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--muted))"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => {
                        if (value >= 1000)
                          return `${(value / 1000).toFixed(0)}k`;
                        return value.toString();
                      }}
                    />
                    <ChartTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background p-2 border rounded shadow-lg text-xs">
                              <div className="font-medium">{label}</div>
                              <div className="text-primary font-bold">
                                {formatCurrency(payload[0]?.value as number)}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill="hsl(var(--primary))"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                {t("dashboard.noMonthlyData")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("dashboard.quickActions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleViewAllReceipts}
              variant="outline"
              className="w-full justify-start"
            >
              <ListIcon className="w-4 h-4 mr-2" />
              {t("profile.viewAllReceipts")}
            </Button>
            <Button
              onClick={handleAddReceipt}
              variant="outline"
              className="w-full justify-start"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("receipt.addTitle")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
