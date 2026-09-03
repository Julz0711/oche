import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter_Tight } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { PwaRegistration } from "@/components/PwaRegistration";
import "./globals.css";

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
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
      className={`${bricolageGrotesque.variable} ${interTight.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PwaRegistration />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
