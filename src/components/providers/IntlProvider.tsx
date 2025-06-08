"use client";

import type React from "react";

import { NextIntlClientProvider } from "next-intl";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserProfile } from "@/app/profile/actions";
import { getUserLocale, type Locale } from "@/lib/i18n";

// Import messages statically for client-side
import enMessages from "@/messages/en.json";
import roMessages from "@/messages/ro.json";
import { useUser } from "@/hooks/use-user";

const messages = {
  en: enMessages,
  ro: roMessages,
};

export default function IntlProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");

  const { telegramUser: user, user: profile } = useUser();

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (profile?.language) {
      const userLocale = getUserLocale(profile.language);
      setLocale(userLocale);
    }
  }, [profile?.language]);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <NextIntlClientProvider
        locale="en"
        messages={messages.en}
        timeZone="Europe/Bucharest"
      >
        {children}
      </NextIntlClientProvider>
    );
  }

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages[locale]}
      timeZone="Europe/Bucharest"
    >
      {children}
    </NextIntlClientProvider>
  );
}
