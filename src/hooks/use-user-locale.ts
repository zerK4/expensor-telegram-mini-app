"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLaunchParams } from "@telegram-apps/sdk-react";
import { getUserProfile } from "@/app/profile/actions";
import { getUserLocale } from "@/lib/i18n";

export function useUserLocale() {
  const { tgWebAppData } = useLaunchParams();
  const [user, setUser] = useState<any>(null);
  const [locale, setLocale] = useState("en");

  useEffect(() => {
    if (tgWebAppData) {
      setUser(tgWebAppData.user);
    }
  }, [tgWebAppData]);

  // Get user profile to determine language preference
  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User not found");
      return getUserProfile(user.id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  useEffect(() => {
    if (profile?.language) {
      const userLocale = getUserLocale(profile.language);
      setLocale(userLocale);
    }
  }, [profile?.language]);

  return {
    locale,
    user,
    profile,
  };
}
