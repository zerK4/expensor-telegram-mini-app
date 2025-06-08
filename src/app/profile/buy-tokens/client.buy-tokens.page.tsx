"use client";

import { CardFooter } from "@/components/ui/card";

import { useEffect, useState } from "react";
import { redirect, useRouter } from "next/navigation";
import { useLaunchParams } from "@telegram-apps/sdk-react";
import { getUserProfile } from "@/app/profile/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Coins, ArrowLeft, CreditCard, ExternalLink } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { createCheckoutSession } from "@/lib/stripe";
import { TOKEN_PACKAGES } from "@/lib/packages";

export default function ClientBuyTokensPage() {
  const t = useTranslations();
  const router = useRouter();
  const { tgWebAppData } = useLaunchParams();
  const [selectedPackage, setSelectedPackage] = useState("tokens_50");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const [user, setUser] = useState<any>(undefined);

  useEffect(() => {
    setUser(tgWebAppData?.user);
  }, [tgWebAppData]);

  // Get user profile data
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User not found");
      return getUserProfile(user.id);
    },
    enabled: !!user?.id,
  });

  // Mutation for creating checkout session
  const { mutate: initiateCheckout, isPending } = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not found");
      const url = await createCheckoutSession(user.id, selectedPackage);

      if (!url) throw new Error("Checkout URL not found");

      window.open(url, "_blank");

      return url;
    },
    onSuccess: (url) => {
      setCheckoutUrl(url);
    },
    onError: (error) => {
      console.error("Failed to create checkout session:", error);
    },
  });

  const handlePurchase = () => {
    initiateCheckout();
  };

  const handleBack = () => {
    router.push("/");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("common.welcomeTitle")}</CardTitle>
            <CardDescription>{t("common.telegramRequired")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const selectedPackageData = TOKEN_PACKAGES.find(
    (pkg) => pkg.id === selectedPackage,
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl min-h-screen">
      <Button variant="ghost" onClick={handleBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t("buyTokens.backToDashboard")}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Coins className="w-5 h-5 mr-2" />
            {t("buyTokens.title")}
          </CardTitle>
          <CardDescription>{t("buyTokens.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Balance */}
          <div className="bg-accent p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">
              {t("buyTokens.currentBalance")}
            </div>
            <div className="text-2xl font-bold">
              {isLoadingProfile
                ? t("common.loading")
                : t("labels.tokens", { count: profile?.tokens || 0 })}
            </div>
          </div>

          {/* Token Packages */}
          <div>
            <h3 className="text-lg font-medium mb-4">
              {t("buyTokens.selectPackage")}
            </h3>
            <RadioGroup
              value={selectedPackage}
              onValueChange={setSelectedPackage}
              className="space-y-3"
            >
              {TOKEN_PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`flex items-center justify-between border rounded-lg p-4 transition-all duration-200 ${
                    selectedPackage === pkg.id
                      ? "border-primary bg-accent shadow-md"
                      : "border-border hover:border-primary/50"
                  } ${pkg.popular ? "relative" : ""}`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-2 -right-2">
                      <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                        {t("buyTokens.bestValue")}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value={pkg.id} id={pkg.id} />
                    <Label
                      htmlFor={pkg.id}
                      className="flex flex-col cursor-pointer"
                    >
                      <span className="font-medium text-base">
                        {pkg.quantity} {t("buyTokens.tokens")}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        €{(pkg.amount / pkg.quantity / 100).toFixed(2)}{" "}
                        {t("buyTokens.perToken")}
                      </span>
                    </Label>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      €{(pkg.amount / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handlePurchase}
            className="w-full py-3"
            disabled={isPending}
            size="lg"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {t("buyTokens.processing")}
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                {t("buyTokens.purchase")} - €
                {(selectedPackageData?.amount || 0) / 100}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
