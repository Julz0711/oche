import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter_Tight } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { PwaRegistration } from "@/components/PwaRegistration";
import { PendingSyncManager } from "@/components/PendingSyncManager";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AchievementToastContainer } from "@/components/organisms/AchievementToast";
import { AppNavigation } from "@/components/AppNavigation";
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#101614',
};

export const metadata: Metadata = {
  title: "Oche",
  description: "Real-time darts scoring web app",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Oche',
    startupImage: [
      {
        url: '/apple-splash-2048-2732.png',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/apple-splash-1668-2388.png',
        media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/apple-splash-1536-2048.png',
        media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/apple-splash-1125-2436.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/apple-splash-1170-2532.png',
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/apple-splash-1284-2778.png',
        media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
    ],
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
        <SessionProvider><AppNavigation>{children}</AppNavigation></SessionProvider>
        <AchievementToastContainer />
      </body>
    </html>
  );
}
