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
} from "lucide-react";
import { useInView } from "react-intersection-observer";
import { useDebounce } from "@/hooks/use-debounce";
import { backButton, init, useLaunchParams } from "@telegram-apps/sdk-react";

export function ReceiptsList() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [filters, setFilters] = useState<ReceiptsFilters>({});
  const [sort, setSort] = useState<ReceiptsSortOptions>({
    field: "date",
    direction: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const { tgWebAppData } = useLaunchParams();

  useEffect(() => {
    init();
    backButton.mount();

    if (tgWebAppData) {
      setUser(tgWebAppData.user);
    }

    backButton.show();
    backButton.onClick(() => {
      window.history.back();
    });
    return () => {
      backButton.hide();
    };
  }, [tgWebAppData]);

  // Stable query key - doesn't change with filters
  const receiptsQueryKey = useMemo(() => ["receipts", user?.id], [user?.id]);

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
    queryKey: receiptsQueryKey,
    queryFn: ({ pageParam = 1 }) => {
      if (!user?.id) throw new Error("User not found");
      return getUserReceiptsPaginated({
        telegramId: user.id,
        page: pageParam,
        limit: 30,
        filters: { ...filters, search: debouncedSearch },
        sort,
      });
    },
    initialPageParam: 1, // Add this line to fix the error
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Query for filter options
  const { data: filterOptions } = useQuery({
    queryKey: ["filter-options", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User not found");
      return getFilterOptions(user.id);
    },
    enabled: !!user?.id,
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

  // Refetch when filters or sort change
  useEffect(() => {
    if (user?.id) {
      // Reset and refetch the query when filters change
      queryClient.resetQueries({ queryKey: receiptsQueryKey });
      refetch();
    }
  }, [
    filters,
    sort,
    debouncedSearch,
    user?.id,
    queryClient,
    receiptsQueryKey,
    refetch,
  ]);

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

  if (!user) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          User not found
        </h3>
        <p className="text-red-600">Please open this app from Telegram.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Search and filter skeleton */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-20 h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
        {/* Receipt cards skeleton */}
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

  if (isError) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Something went wrong
        </h3>
        <p className="text-red-600 mb-4">
          {error?.message || "Failed to load receipts"}
        </p>
        <Button onClick={handleRetry} variant="outline">
          Try Again
        </Button>
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

  return (
    <div className="space-y-4 pb-20">
      {/* Search and Filter Bar */}
      <div className="sticky top-0 bg-white z-10 pb-4 border-b">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search receipts..."
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
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  Filters & Sort
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                {/* Sort Options */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Sort by
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { field: "date" as const, label: "Date" },
                      { field: "total" as const, label: "Amount" },
                      { field: "company" as const, label: "Store" },
                      { field: "category" as const, label: "Category" },
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
                    Category
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
                      <SelectItem value="all">All categories</SelectItem>
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
                    Store
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
                      <SelectItem value="all">All stores</SelectItem>
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
                    Payment Method
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
                      <SelectItem value="all">All methods</SelectItem>
                      <SelectItem value="cash">Cash only</SelectItem>
                      <SelectItem value="card">Card only</SelectItem>
                      <SelectItem value="both">Mixed payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount Range */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Min Amount
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
                      Max Amount
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
                      From Date
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
                      To Date
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
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {isRefetching
              ? "Searching..."
              : `${totalCount} receipt${totalCount !== 1 ? "s" : ""} found`}
          </span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-blue-600"
            >
              Clear filters
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
      ) : allReceipts.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <ReceiptIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {hasActiveFilters
              ? "No receipts match your filters"
              : "No receipts yet"}
          </h3>
          <p className="text-gray-500 mb-4">
            {hasActiveFilters
              ? "Try adjusting your search criteria or clearing filters."
              : "Your receipts will appear here once you start adding them."}
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
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
                  {receipt.paidCash !== null && receipt.paidCash > 0 && (
                    <div className="flex items-center gap-1">
                      <Banknote className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Cash:{" "}
                        {formatCurrency(receipt.paidCash, receipt.currency)}
                      </span>
                    </div>
                  )}
                  {receipt.paidCard !== null && receipt.paidCard > 0 && (
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Card:{" "}
                        {formatCurrency(receipt.paidCard, receipt.currency)}
                      </span>
                    </div>
                  )}
                </div>
                {receipt.createdAt && (
                  <div className="text-xs text-gray-400">
                    Added on {formatDate(receipt.createdAt)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Infinite scroll trigger */}
          <div ref={ref} className="py-4">
            {isFetchingNextPage && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  Loading more receipts...
                </div>
              </div>
            )}
            {!hasNextPage && allReceipts.length > 0 && (
              <div className="text-center text-sm text-gray-500">
                You&apos;ve reached the end of your receipts
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
