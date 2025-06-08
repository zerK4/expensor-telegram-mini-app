"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Receipt, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { ProfileSheet } from "./profile-sheet";
import { useUser } from "@/hooks/use-user";

export function BottomNav() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();

  const { telegramUser: user } = useUser();

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navItems = [
    {
      id: "home",
      icon: Home,
      label: t("navigation.dashboard"),
      path: "/",
      action: () => router.push("/"),
    },
    {
      id: "receipts",
      icon: Receipt,
      label: t("navigation.receipts"),
      path: "/receipts",
      action: () => router.push("/receipts"),
    },
    {
      id: "profile",
      icon: User,
      label: t("navigation.profile"),
      path: "/profile",
      action: () => setIsProfileOpen(true),
    },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  return (
    <>
      <div className="fixed h-16 bottom-0 left-0 right-0 bg-background border-t border-border z-50">
        <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.id === "profile" ? isProfileOpen : isActive(item.path);

            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={item.action}
                className={`flex flex-col items-center gap-1 h-auto py-2 px-3`}
              >
                <Icon
                  className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`}
                />
              </Button>
            );
          })}
        </div>
      </div>

      <ProfileSheet
        user={user}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
}
