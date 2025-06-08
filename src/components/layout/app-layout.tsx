"use client";

import type React from "react";

import { BottomNav } from "@/components/navigation/bottom-nav";
import { AddReceiptButton } from "../addReceiptButton";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      {children}
      <BottomNav />
      <AddReceiptButton />
    </>
  );
}
