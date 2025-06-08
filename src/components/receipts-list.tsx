"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getUserReceiptsPaginated,
  getFilterOptions,
  type ReceiptsFilters,
  type ReceiptsSortOptions,
} from "@/app/receipts/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Calendar,
  Tag,
  CreditCard,
  Banknote,
  ReceiptIcon,
  AlertCircle,
  Filter,
  Search,
  SortAsc,
  SortDesc,
  X,
  Edit,
} from "lucide-react";
import { useInView } from "react-intersection-observer";
import { useDebounce } from "@/hooks/use-debounce";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useUser } from "@/hooks/use-user";

export default function ReceiptsList() {
  const t = useTranslations();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [filters, setFilters] = useState<ReceiptsFilters>({});
  const [sort, setSort] = useState<ReceiptsSortOptions>({
    field: "date",
    direction: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [profile, setProfile] = useState<{ language: string } | null>(null);

  const { telegramUser: user, isLoading: isLoadingUser } = useUser();

  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    setMounted(true);
    setTimeout(() => {
      setProfile({ language: "en" });
    }, 500);
  }, []);

  // Stable query key that doesn't change with filters
  const baseQueryKey = useMemo(() => ["receipts", user?.id], [user?.id]);

  // Create a stable filters object to prevent unnecessary re-renders
  const stableFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch],
  );

  // Infinite query for receipts with stable key
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: baseQueryKey,
    queryFn: ({ pageParam = 1 }) => {
      if (!user?.id) throw new Error("User not found");
      return getUserReceiptsPaginated({
        telegramId: user.id,
        page: pageParam,
        limit: 30,
        filters: stableFilters,
        sort,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!user?.id && mounted,
    staleTime: 0, // Always refetch when filters change
    refetchOnWindowFocus: false,
  });

  // Effect to refetch when filters or sort change
  useEffect(() => {
    if (user?.id && mounted) {
      refetch();
    }
  }, [stableFilters, sort, user?.id, mounted, refetch]);

  // Query for filter options
  const { data: filterOptions } = useQuery({
    queryKey: ["filter-options", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User not found");
      return getFilterOptions(user.id);
    },
    enabled: !!user?.id && mounted,
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Intersection observer for infinite scroll
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  });

  // Fetch next page when in view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && !isRefetching) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, isRefetching, fetchNextPage]);

  // Flatten all receipts from pages
  const allReceipts = useMemo(() => {
    return data?.pages.flatMap((page) => page.receipts) ?? [];
  }, [data]);

  const totalCount = data?.pages[0]?.totalCount ?? 0;

  const handleFilterChange = useCallback(
    (key: keyof ReceiptsFilters, value: any) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value === "" ? undefined : value,
      }));
    },
    [],
  );

  const handleSortChange = useCallback(
    (field: ReceiptsSortOptions["field"]) => {
      setSort((prev) => ({
        field,
        direction:
          prev.field === field && prev.direction === "desc" ? "asc" : "desc",
      }));
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchTerm("");
  }, []);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const hasActiveFilters = useMemo(() => {
    return (
      Object.values(filters).some((value) => value !== undefined) ||
      searchTerm !== ""
    );
  }, [filters, searchTerm]);

  const handleEditReceipt = (receiptId: number) => {
    router.push(`/receipts/${receiptId}/edit`);
  };

  const formatDate = (dateString: string) => {
    try {
      const locale = profile?.language === "ro" ? "ro-RO" : "en-US";
      return new Date(dateString).toLocaleDateString(locale, {
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
      const locale = profile?.language === "ro" ? "ro-RO" : "en-US";
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
      }).format(amount);
    } catch {
      return `${amount} ${currency}`;
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-4">
        {/* Search and filter skeleton */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 h-10 bg-muted rounded animate-pulse"></div>
          <div className="w-20 h-10 bg-muted rounded animate-pulse"></div>
        </div>
        {/* Receipt cards skeleton */}
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!user && !isLoadingUser) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">{t("common.userNotFound")}</h3>
        <p className="text-destructive">{t("common.telegramRequired")}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Search and filter skeleton */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 h-10 bg-muted rounded animate-pulse"></div>
          <div className="w-20 h-10 bg-muted rounded animate-pulse"></div>
        </div>
        {/* Receipt cards skeleton */}
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-destructive/20 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="text-lg font-medium mb-2">
          {t("common.somethingWentWrong")}
        </h3>
        <p className="text-destructive mb-4">
          {error?.message || "Failed to load receipts"}
        </p>
        <Button onClick={handleRetry} variant="outline">
          {t("common.tryAgain")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Search and Filter Bar */}
      <div className="sticky top-0 bg-background z-10 pb-4 border-b">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t("receipts.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Filter className="w-4 h-4" />
                {hasActiveFilters && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></div>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] overflow-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  {t("receipts.filtersSort")}
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="w-4 h-4 mr-1" />
                      {t("receipts.clearFilters")}
                    </Button>
                  )}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                {/* Sort Options */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("receipts.sortBy")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { field: "date" as const, label: t("receipts.sortDate") },
                      {
                        field: "total" as const,
                        label: t("receipts.sortAmount"),
                      },
                      {
                        field: "company" as const,
                        label: t("receipts.sortStore"),
                      },
                      {
                        field: "category" as const,
                        label: t("receipts.sortCategory"),
                      },
                    ].map(({ field, label }) => (
                      <Button
                        key={field}
                        variant={sort.field === field ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSortChange(field)}
                        className="justify-between"
                      >
                        {label}
                        {sort.field === field &&
                          (sort.direction === "desc" ? (
                            <SortDesc className="w-4 h-4" />
                          ) : (
                            <SortAsc className="w-4 h-4" />
                          ))}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("receipts.categoryFilter")}
                  </label>
                  <Select
                    value={filters.categoryId?.toString() || "all"}
                    onValueChange={(value) =>
                      handleFilterChange(
                        "categoryId",
                        value === "all" ? undefined : Number.parseInt(value),
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("receipts.allCategories")}
                      </SelectItem>
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

                {/* Company Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("receipts.storeFilter")}
                  </label>
                  <Select
                    value={filters.companyId?.toString() || "all"}
                    onValueChange={(value) =>
                      handleFilterChange(
                        "companyId",
                        value === "all" ? undefined : Number.parseInt(value),
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All stores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("receipts.allStores")}
                      </SelectItem>
                      {filterOptions?.companies.map((company) => (
                        <SelectItem
                          key={company.id}
                          value={company.id!.toString()}
                        >
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("receipts.paymentMethod")}
                  </label>
                  <Select
                    value={filters.paymentMethod || "all"}
                    onValueChange={(value) =>
                      handleFilterChange(
                        "paymentMethod",
                        value === "all" ? undefined : value,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("receipts.allMethods")}
                      </SelectItem>
                      <SelectItem value="cash">
                        {t("receipts.cashOnly")}
                      </SelectItem>
                      <SelectItem value="card">
                        {t("receipts.cardOnly")}
                      </SelectItem>
                      <SelectItem value="both">
                        {t("receipts.mixedPayment")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount Range */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {t("receipts.minAmount")}
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.minAmount || ""}
                      onChange={(e) =>
                        handleFilterChange(
                          "minAmount",
                          e.target.value
                            ? Number.parseFloat(e.target.value)
                            : undefined,
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {t("receipts.maxAmount")}
                    </label>
                    <Input
                      type="number"
                      placeholder="∞"
                      value={filters.maxAmount || ""}
                      onChange={(e) =>
                        handleFilterChange(
                          "maxAmount",
                          e.target.value
                            ? Number.parseFloat(e.target.value)
                            : undefined,
                        )
                      }
                    />
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {t("receipts.fromDate")}
                    </label>
                    <Input
                      type="date"
                      value={filters.dateFrom || ""}
                      onChange={(e) =>
                        handleFilterChange(
                          "dateFrom",
                          e.target.value || undefined,
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {t("receipts.toDate")}
                    </label>
                    <Input
                      type="date"
                      value={filters.dateTo || ""}
                      onChange={(e) =>
                        handleFilterChange(
                          "dateTo",
                          e.target.value || undefined,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Results count and active filters */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {isRefetching
              ? t("receipts.searching")
              : t("receipts.found", { count: totalCount })}
          </span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-primary"
            >
              {t("receipts.clearFiltersBtn")}
            </Button>
          )}
        </div>
      </div>

      {/* Receipts List */}
      {isRefetching && allReceipts.length === 0 ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : allReceipts.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <ReceiptIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {hasActiveFilters
              ? t("receipts.noMatch")
              : t("receipts.noReceipts")}
          </h3>
          <p className="text-muted-foreground mb-4">
            {hasActiveFilters
              ? t("receipts.adjustFilters")
              : t("receipts.startAdding")}
          </p>
        </div>
      ) : (
        <>
          {allReceipts.map((receipt) => (
            <Card
              key={receipt.id}
              className="hover:shadow-md transition-shadow duration-200"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg flex items-center gap-2 mb-2">
                      {receipt.category?.icon && (
                        <span className="text-xl flex-shrink-0">
                          {receipt.category.icon}
                        </span>
                      )}
                      <span className="truncate">
                        {receipt.company?.name || t("receipts.unknownStore")}
                      </span>
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
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
                  <div className="flex items-start gap-2 flex-shrink-0 ml-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {formatCurrency(receipt.total, receipt.currency)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditReceipt(receipt.id)}
                      className="h-8 w-8 rounded-full"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-2">
                  {receipt.paidCash !== null && receipt.paidCash > 0 && (
                    <div className="flex items-center gap-1">
                      <Banknote className="w-4 h-4 flex-shrink-0" />
                      <span>
                        {t("receipts.cash")}:{" "}
                        {formatCurrency(receipt.paidCash, receipt.currency)}
                      </span>
                    </div>
                  )}
                  {receipt.paidCard !== null && receipt.paidCard > 0 && (
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-4 h-4 flex-shrink-0" />
                      <span>
                        {t("receipts.card")}:{" "}
                        {formatCurrency(receipt.paidCard, receipt.currency)}
                      </span>
                    </div>
                  )}
                </div>
                {receipt.createdAt && (
                  <div className="text-xs text-muted-foreground">
                    {t("receipts.addedOn")} {formatDate(receipt.createdAt)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Infinite scroll trigger */}
          <div ref={ref} className="py-4">
            {isFetchingNextPage && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-muted-foreground border-t-primary rounded-full animate-spin"></div>
                  {t("receipts.loadingMore")}
                </div>
              </div>
            )}
            {!hasNextPage && allReceipts.length > 0 && (
              <div className="text-center text-sm text-muted-foreground">
                {t("receipts.endReached")}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
