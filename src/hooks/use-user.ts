// src/hooks/use-user-client.ts
"use client";

import { getUserProfile } from "@/app/profile/actions";
import { UserSelectType } from "@/database/schema";
import { useLaunchParams, User } from "@telegram-apps/sdk-react";
import { useEffect, useState } from "react";

export const useUser = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserSelectType | null>(null);
  const [telegramUser, setTelegramUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { tgWebAppData } = useLaunchParams();

  useEffect(() => {
    if (isClient && tgWebAppData && tgWebAppData.user) {
      setTelegramUser(tgWebAppData.user);
      getUserProfile(tgWebAppData.user.id).then(setUser);
      setIsLoading(false);
    }
  }, [tgWebAppData, isClient]);

  return {
    user,
    telegramUser,
    isLoading,
  };
};
