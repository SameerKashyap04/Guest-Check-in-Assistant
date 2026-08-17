import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// ─── Airbnb DESIGN.md ─────────────────────────────────────────────────────────
// Inter is the closest open-source substitute for Airbnb Cereal VF.
// next/font/google handles font loading via <link> in <head> — no @import in CSS.
// ─────────────────────────────────────────────────────────────────────────────
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StayMate Admin — Simplifying Every Guest Stay",
  description: "StayMate Central Developer & Operations Admin Console",
};

type LayoutProps<T extends string> = { children: React.ReactNode };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-inter), -apple-system, system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
