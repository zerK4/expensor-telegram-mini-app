"use client";

import { init, backButton } from "@telegram-apps/sdk-react";
import { useEffect } from "react";

/**
 * Root component for the whole project.
 */
export function TmaSDKProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    init();
    backButton.mount();
  });
  return children;
}
