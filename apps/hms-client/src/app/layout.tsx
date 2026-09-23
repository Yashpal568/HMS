import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HMS — Hospital Management System",
  description: "Enterprise Clinical and Hospital Operations Platform",
};

import { AuthProvider } from "@/context/auth-context";
import { WorkspaceProvider } from "@/context/workspace-context";
import { CurrencyProvider } from "@/context/currency-context";
import { SessionTimeoutModal } from "@/components/security/session-timeout-modal";
import { OfflineBanner } from "@/components/security/offline-banner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <AuthProvider>
          <WorkspaceProvider>
            <CurrencyProvider>
              <OfflineBanner />
              <SessionTimeoutModal />
              {children}
            </CurrencyProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
