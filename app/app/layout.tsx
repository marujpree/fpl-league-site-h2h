import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import TabNav from "@/components/TabNav";
import { CURRENT_GAMEWEEK } from "@/components/mock-data";
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
  title: "Sigma Chi FC",
  description: "Sigma Chi FC -- FPL Head-to-Head league dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="pl-gradient">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-xl font-black tracking-tight text-white sm:text-2xl">
                Sigma Chi FC
              </span>
              <span className="hidden text-xs font-semibold uppercase tracking-widest text-white/70 sm:inline">
                Head-to-Head League
              </span>
            </Link>
            <span className="rounded-full bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/90">
              Gameweek {CURRENT_GAMEWEEK}
            </span>
          </div>
        </header>
        <TabNav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-card-border px-4 py-6 text-center text-xs text-muted sm:px-6">
          Sigma Chi FC &middot; Private league dashboard
        </footer>
      </body>
    </html>
  );
}
