import "../styles/globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { Footer } from "@/components/layout/Footer";
import { ToastProvider } from "@/hooks/useToast";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OneHub",
  description: "All-in-one event planning platform",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  await auth();
  return (
    <html lang="en" className={`h-full ${inter.variable}`} suppressHydrationWarning>
      <body className={`min-h-full bg-slate-50 text-slate-900 font-sans ${inter.variable} flex flex-col`}>
                    <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 rounded bg-indigo-600 px-3 py-1 text-white">Skip to content</a>
                    <SessionProvider>
                      <ToastProvider>
                        <div className="flex-1 flex flex-col">
                          {children}
                        </div>
                        <Footer />
                      </ToastProvider>
                    </SessionProvider>
      </body>
    </html>
  );
}
