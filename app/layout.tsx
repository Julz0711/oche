import type { Metadata } from "next";
import { Barlow_Condensed, Inter_Tight } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { PwaRegistration } from "@/components/PwaRegistration";
import { PendingSyncManager } from "@/components/PendingSyncManager";
import { OfflineBanner } from "@/components/OfflineBanner";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const interTight = Inter_Tight({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Oche",
  description: "Real-time darts scoring web app",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Oche',
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${interTight.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PwaRegistration />
        <PendingSyncManager />
        <OfflineBanner />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
