import { QueryProvider } from "@/components/providers/QueryProvider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const IntlProvider = dynamic(
  () => import("@/components/providers/IntlProvider"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-screen w-screen" />,
  },
);

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My Telegram Mini App",
  description: "A mini app for Telegram.",
  // PWA meta for mobile-only
  applicationName: "My Telegram Mini App",
  themeColor: "#18181b",
  manifest: "/manifest.json",
  icons: [
    {
      rel: "icon",
      url: "/icons/icon-192x192.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      rel: "apple-touch-icon",
      url: "/icons/icon-192x192.png",
      sizes: "192x192",
    },
    {
      rel: "icon",
      url: "/icons/icon-512x512.png",
      sizes: "512x512",
      type: "image/png",
    },
  ],
  other: {
    // Viewport for mobile web app
    viewport:
      "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
    // Add to home screen on iOS
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "My Telegram Mini App",
    "apple-mobile-web-app-status-bar-style": "default",
    // Mobile Chrome install
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <IntlProvider>
              <div className="pb-20">{children}</div>
            </IntlProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
