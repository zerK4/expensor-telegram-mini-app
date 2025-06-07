"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLaunchParams } from "@telegram-apps/sdk-react";
import { addTokensToUser, getUserProfile } from "@/app/profile/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Coins, ArrowLeft, CreditCard } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const tokenPackages = [
  { id: "small", tokens: 10, price: 0.99, popular: false },
  { id: "medium", tokens: 50, price: 3.99, popular: true },
  { id: "large", tokens: 100, price: 6.99, popular: false },
  { id: "xl", tokens: 500, price: 29.99, popular: false },
];

export default function BuyTokensPage() {
  const router = useRouter();
  const { tgWebAppData } = useLaunchParams();
  const queryClient = useQueryClient();
  const [selectedPackage, setSelectedPackage] = useState("medium");

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

  // Mutation for adding tokens
  const { mutate: purchaseTokens, isPending } = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not found");
      const packageData = tokenPackages.find((p) => p.id === selectedPackage);
      if (!packageData) throw new Error("Invalid package");

      // In a real app, you would handle payment processing here
      // For this demo, we'll just add the tokens directly
      return addTokensToUser(user.id, packageData.tokens);
    },
    onSuccess: () => {
      // Invalidate the profile query to refetch with updated token balance
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
      router.push("/");
    },
  });

  const handlePurchase = () => {
    purchaseTokens();
  };

  const handleBack = () => {
    router.push("/");
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
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <Button variant="ghost" onClick={handleBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Coins className="w-5 h-5 mr-2" />
            Buy Tokens
          </CardTitle>
          <CardDescription>
            Purchase tokens to process receipts and access premium features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Balance */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Current Balance</div>
            <div className="text-2xl font-bold">
              {isLoadingProfile ? "Loading..." : profile?.tokens || 0} tokens
            </div>
          </div>

          {/* Token Packages */}
          <div>
            <h3 className="text-lg font-medium mb-4">Select a Package</h3>
            <RadioGroup
              value={selectedPackage}
              onValueChange={setSelectedPackage}
              className="space-y-3"
            >
              {tokenPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`flex items-center justify-between border rounded-lg p-4 ${
                    selectedPackage === pkg.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200"
                  } ${pkg.popular ? "relative" : ""}`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-2 -right-2">
                      <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        Best Value
                      </span>
                    </div>
                  )}
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value={pkg.id} id={pkg.id} />
                    <Label
                      htmlFor={pkg.id}
                      className="flex flex-col cursor-pointer"
                    >
                      <span className="font-medium">{pkg.tokens} Tokens</span>
                      <span className="text-sm text-gray-500">
                        {pkg.tokens > 1
                          ? `${(pkg.price / pkg.tokens).toFixed(2)}¢ per token`
                          : ""}
                      </span>
                    </Label>
                  </div>
                  <div className="text-lg font-bold">${pkg.price}</div>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handlePurchase}
            className="w-full"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Purchase Now
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
