"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserProfile, updateUserProfile } from "@/app/profile/actions";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Coins,
  CreditCard,
  Globe,
  DollarSign,
  User,
  Settings,
  Check,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import { useTheme } from "next-themes";

interface ProfileSheetProps {
  user?: any;
  isOpen: boolean;
  onClose: () => void;
}

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ro", name: "Română", flag: "🇷🇴" },
];

const SUPPORTED_CURRENCIES = [
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "RON", name: "Romanian Leu", symbol: "lei" },
];

export function ProfileSheet({ user, isOpen, onClose }: ProfileSheetProps) {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  // Get user profile data
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User not found");
      return getUserProfile(user.id);
    },
    enabled: !!user?.id && isOpen,
    staleTime: 1000 * 60 * 5,
  });

  // Update profile mutation
  const { mutate: updateProfile, isPending: isUpdating } = useMutation({
    mutationFn: async (data: { language?: string; currency?: string }) => {
      if (!user?.id) throw new Error("User not found");
      return updateUserProfile(user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
      setPendingLanguage(null);
      setPendingCurrency(null);
      // Refresh the page to apply language changes
      if (pendingLanguage) {
        window.location.reload();
      }
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      setPendingLanguage(null);
      setPendingCurrency(null);
    },
  });

  const handleLanguageChange = (language: string) => {
    setPendingLanguage(language);
    updateProfile({ language });
  };

  const handleCurrencyChange = (currency: string) => {
    setPendingCurrency(currency);
    updateProfile({ currency });
  };

  const currentLanguage = pendingLanguage || profile?.language || "en";
  const currentCurrency =
    pendingCurrency || profile?.preferredCurrency || "EUR";

  const getLanguageName = (code: string) => {
    return SUPPORTED_LANGUAGES.find((lang) => lang.code === code)?.name || code;
  };

  const getCurrencyName = (code: string) => {
    return (
      SUPPORTED_CURRENCIES.find((curr) => curr.code === code)?.name || code
    );
  };

  if (!user) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={user.photo_url || "/placeholder.svg"}
                alt={user.firstName || "User"}
              />
              <AvatarFallback>
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="font-semibold text-lg">
              {user.firstName} {user.lastName}
            </div>
          </SheetTitle>
          {/* <SheetDescription>{t("profile.title")}</SheetDescription> */}
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Tokens Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <Coins className="w-5 h-5 mr-2 text-primary" />
                {t("profile.tokens")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingProfile ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex items-center justify-between bg-accent p-4 rounded-lg border">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {t("profile.availableBalance")}
                    </div>
                    <div className="text-2xl font-bold">
                      {t("labels.tokens", { count: profile?.tokens || 0 })}
                    </div>
                  </div>
                  {profile && profile.tokens && profile.tokens > 10 ? (
                    <Badge variant="default" className="text-xs">
                      {t("profile.goodBalance")}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      {t("profile.lowBalance")}
                    </Badge>
                  )}
                </div>
              )}
              <div className="w-full flex items-center justify-center mt-2">
                <span className="text-muted-foreground flex items-center gap-2 text-sm">
                  <CreditCard className="w-4 h-4" />
                  {t("profile.buyTokens")}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Settings Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <Settings className="w-5 h-5 mr-2 text-primary" />
                {t("profile.settings")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Language Setting */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      {t("profile.language")}
                    </span>
                  </div>
                  {isUpdating && pendingLanguage && (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                <Select
                  value={currentLanguage}
                  onValueChange={handleLanguageChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((language) => (
                      <SelectItem key={language.code} value={language.code}>
                        <div className="flex items-center gap-2">
                          <span>{language.flag}</span>
                          <span>{language.name}</span>
                          {currentLanguage === language.code && (
                            <Check className="w-4 h-4 text-primary ml-auto" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Currency Setting */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      {t("profile.currency")}
                    </span>
                  </div>
                  {isUpdating && pendingCurrency && (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                <Select
                  value={currentCurrency}
                  onValueChange={handleCurrencyChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {currency.symbol}
                          </span>
                          <span>{currency.name}</span>
                          <span className="text-muted-foreground text-sm">
                            ({currency.code})
                          </span>
                          {currentCurrency === currency.code && (
                            <Check className="w-4 h-4 text-primary ml-auto" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Theme Setting */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    {t("profile.theme")}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("light")}
                    className="flex items-center gap-2"
                  >
                    <Sun className="w-4 h-4" />
                    <span className="text-xs">{t("profile.lightMode")}</span>
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                    className="flex items-center gap-2"
                  >
                    <Moon className="w-4 h-4" />
                    <span className="text-xs">{t("profile.darkMode")}</span>
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("system")}
                    className="flex items-center gap-2"
                  >
                    <Monitor className="w-4 h-4" />
                    <span className="text-xs">{t("profile.systemMode")}</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Info Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <User className="w-5 h-5 mr-2 text-primary" />
                {t("profile.accountInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingProfile ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">
                      {t("profile.userId")}
                    </span>
                    <span className="text-sm font-mono">{user.id}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">
                      {t("profile.currentLanguage")}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {
                          SUPPORTED_LANGUAGES.find(
                            (lang) => lang.code === currentLanguage,
                          )?.flag
                        }
                      </span>
                      <span className="text-sm">
                        {getLanguageName(currentLanguage)}
                      </span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">
                      {t("profile.currentCurrency")}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">
                        {
                          SUPPORTED_CURRENCIES.find(
                            (curr) => curr.code === currentCurrency,
                          )?.symbol
                        }
                      </span>
                      <span className="text-sm">
                        {getCurrencyName(currentCurrency)}
                      </span>
                    </div>
                  </div>
                  {profile?.lastLoginAt && (
                    <>
                      <Separator />
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">
                          {t("profile.lastLogin")}
                        </span>
                        <span className="text-sm">
                          {new Date(profile.lastLoginAt).toLocaleDateString()}
                        </span>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          <div className="h-4" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
