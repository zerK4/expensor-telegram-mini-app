import { QueryProvider } from "@/components/providers/QueryProvider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { IntlProvider } from "@/components/providers/IntlProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My Telegram Mini App",
  description: "A mini app for Telegram.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          {/* <ThemeProvider attribute="class" defaultTheme="light"> */}
          <IntlProvider>{children}</IntlProvider>
          {/* </ThemeProvider> */}
        </QueryProvider>
      </body>
    </html>
  );
}
