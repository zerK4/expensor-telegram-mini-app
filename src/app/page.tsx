"use client";

import React, { useEffect } from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLaunchParams } from "@telegram-apps/sdk-react";
import {
  getUserReceiptsPaginated,
  getFilterOptions,
} from "@/app/receipts/actions";
import { getUserProfile } from "@/app/profile/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  ReceiptIcon,
  ListIcon,
  CreditCard,
  Coins,
  TrendingUp,
  Tag,
  Plus,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState<any>(undefined);
  const { tgWebAppData } = useLaunchParams();

  useEffect(() => {
    if (tgWebAppData) {
      setUser(tgWebAppData.user);
    }
  }, [tgWebAppData]);

  // Get user profile data
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User not found");
      return getUserProfile(user.id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get receipt data for charts
  const { data: receiptData, isLoading: isLoadingReceipts } = useQuery({
    queryKey: ["receipts-analytics", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not found");
      const data = await getUserReceiptsPaginated({
        telegramId: user.id,
        limit: 100, // Get more receipts for better analytics
        sort: { field: "date", direction: "desc" },
      });
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get categories for charts
  const { data: filterOptions } = useQuery({
    queryKey: ["filter-options", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User not found");
      return getFilterOptions(user.id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Prepare chart data
  const categoryData = React.useMemo(() => {
    if (!receiptData?.receipts || !filterOptions?.categories) return [];

    // Create a map to store total spending by category
    const categoryMap = new Map();

    // Initialize with all categories
    filterOptions.categories.forEach((category) => {
      categoryMap.set(category.id, {
        name: category.name,
        icon: category.icon,
        value: 0,
      });
    });

    // Sum up spending by category
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

    // Convert map to array and sort by value
    return Array.from(categoryMap.values())
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [receiptData?.receipts, filterOptions?.categories]);

  // Monthly spending data
  const monthlyData = React.useMemo(() => {
    if (!receiptData?.receipts) return [];

    const monthMap = new Map();

    // Get last 6 months
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
      const monthName = month.toLocaleDateString("en-US", { month: "short" });
      monthMap.set(monthKey, { name: monthName, total: 0 });
    }

    // Sum up spending by month
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

    // Convert map to array
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

  // COLORS for pie chart
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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  // Navigate to receipts list
  const handleViewAllReceipts = () => {
    router.push("/receipts");
  };

  // Navigate to add receipt
  const handleAddReceipt = () => {
    router.push("/receipts/add");
  };

  // Navigate to buy tokens page
  const handleBuyTokens = () => {
    router.push("/profile/buy-tokens");
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
      <Tabs
        defaultValue="dashboard"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <div className="flex gap-2">
              <Button
                size="icon"
                onClick={handleAddReceipt}
                className="fixed bottom-4 right-4 z-50 size-14 rounded-full"
              >
                <Plus size={32} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleViewAllReceipts}
              >
                <ListIcon className="w-4 h-4 mr-2" />
                View All
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3">
              <CardContent className="p-0">
                <div className="text-xs text-gray-500 mb-1">Total Spending</div>
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
                <div className="text-xs text-gray-500 mb-1">Receipts</div>
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
                <div className="text-xs text-gray-500 mb-1">Average Amount</div>
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
                <div className="text-xs text-gray-500 mb-1">Categories</div>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Tag className="w-4 h-4 mr-2" />
                Spending by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {isLoadingReceipts ? (
                <div className="h-[250px] flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
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
                              <div className="bg-white p-2 border rounded shadow-lg text-xs">
                                <div className="flex items-center gap-1">
                                  <span>{data.icon}</span>
                                  <span className="font-medium">
                                    {data.name}
                                  </span>
                                </div>
                                <div className="text-blue-600 font-bold">
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
                <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">
                  No category data available
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
                    <div className="text-xs text-gray-500 text-center mt-1">
                      +{categoryData.length - 5} more categories
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Spending Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <TrendingUp className="w-4 h-4 mr-2" />
                Monthly Spending
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {isLoadingReceipts ? (
                <div className="h-[250px] flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              ) : monthlyData.length > 0 ? (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
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
                              <div className="bg-white p-2 border rounded shadow-lg text-xs">
                                <div className="font-medium">{label}</div>
                                <div className="text-blue-600 font-bold">
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
                        fill="#3b82f6"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">
                  No monthly data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <h1 className="text-2xl font-bold">Profile</h1>

          {/* User Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback>{user.firstName?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>
                    {user.firstName} {user.lastName}
                  </CardTitle>
                  <CardDescription>@{user.username || "user"}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingProfile ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">User ID</span>
                    <span>{user.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Language</span>
                    <span>{profile?.language || "en"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      Preferred Currency
                    </span>
                    <span>{profile?.preferredCurrency || "EUR"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Last Login</span>
                    <span>
                      {profile?.lastLoginAt
                        ? new Date(profile.lastLoginAt).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tokens Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Coins className="w-5 h-5 mr-2" />
                Your Tokens
              </CardTitle>
              <CardDescription>
                Use tokens to process receipts and access premium features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingProfile ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div className="flex items-center justify-between bg-gray-100 p-4 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-500">
                      Available Balance
                    </div>
                    <div className="text-3xl font-bold">
                      {profile?.tokens || 0}
                    </div>
                  </div>
                  {profile && profile.tokens ? (
                    <Badge
                      variant={profile?.tokens > 10 ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {profile?.tokens > 10 ? "Good Balance" : "Low Balance"}
                    </Badge>
                  ) : null}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleBuyTokens} className="w-full">
                <CreditCard className="w-4 h-4 mr-2" />
                Buy More Tokens
              </Button>
            </CardFooter>
          </Card>

          {/* Receipt Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ReceiptIcon className="w-5 h-5 mr-2" />
                Receipt Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingReceipts ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      Total Receipts
                    </span>
                    <span>{receiptData?.totalCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Total Spent</span>
                    <span>{formatCurrency(totalSpending)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      Average Receipt
                    </span>
                    <span>{formatCurrency(averageAmount)}</span>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                onClick={handleViewAllReceipts}
                className="w-full"
              >
                <ListIcon className="w-4 h-4 mr-2" />
                View All Receipts
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
