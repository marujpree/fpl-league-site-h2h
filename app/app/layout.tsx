import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import NewsTicker from "@/components/NewsTicker";
import TabNav from "@/components/TabNav";
import { getCurrentGameweek, getNewsHeadlines } from "@/lib/data";
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
  description: "Sigma Chi FC -- FPL Head to Head league dashboard",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sigma Chi FC",
  },
};

export const viewport: Viewport = {
  themeColor: "#38003c",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [gameweek, headlines] = await Promise.all([getCurrentGameweek(), getNewsHeadlines()]);
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="pl-gradient">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-5">
            <Link href="/" className="flex min-w-0 items-center gap-2">
              <Image
                src="/pl-lion-white.png"
                alt=""
                width={34}
                height={41}
                className="h-6 w-auto shrink-0 sm:h-9"
                priority
              />
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="truncate text-base font-black tracking-tight text-white sm:text-2xl">
                  Sigma Chi FC
                </span>
                <span className="hidden text-xs font-semibold uppercase tracking-widest text-white/70 sm:inline">
                  Head to Head League
                </span>
              </span>
            </Link>
            <span className="shrink-0 rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/90 sm:px-3 sm:text-xs">
              {gameweek ? `GW ${gameweek.id}` : "Not started"}
            </span>
          </div>
        </header>
        <NewsTicker headlines={headlines} />
        <TabNav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-4 sm:px-6 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-card-border px-3 py-4 text-center text-xs text-muted sm:px-6 sm:py-6">
          Sigma Chi FC &middot; Private league dashboard
        </footer>
      </body>
    </html>
  );
}
