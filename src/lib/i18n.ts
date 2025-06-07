"use client";

import { getRequestConfig } from "next-intl/server";

// Define supported locales
export const locales = ["en", "ro"] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
  // This would normally come from a request header or user session
  // For now, we'll default to English
  const locale = "en" as Locale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});

// Helper function to get user's preferred locale
export function getUserLocale(userLanguage?: string): Locale {
  if (!userLanguage) return "en";

  const languageMap: Record<string, Locale> = {
    en: "en",
    ro: "ro",
    romanian: "ro",
    english: "en",
  };

  const normalizedLang = userLanguage.toLowerCase();
  return languageMap[normalizedLang] || "en";
}
