"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export function useTelegramTheme() {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Check if we're in the browser and Telegram WebApp is available
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      const webApp = (window as any).Telegram.WebApp;

      // Get Telegram's color scheme
      const telegramColorScheme = webApp.colorScheme || "light";

      // Only set theme if it's currently set to system
      if (theme === "system") {
        setTheme(telegramColorScheme);
      }

      // Listen for theme changes from Telegram
      const handleThemeChanged = () => {
        const newColorScheme = webApp.colorScheme || "light";
        if (theme === "system") {
          setTheme(newColorScheme);
        }
      };

      // Add event listener if available
      if (webApp.onEvent) {
        webApp.onEvent("themeChanged", handleThemeChanged);
      }

      return () => {
        // Clean up event listener
        if (webApp.offEvent) {
          webApp.offEvent("themeChanged", handleThemeChanged);
        }
      };
    }
  }, [theme, setTheme]);

  return { theme, setTheme };
}
