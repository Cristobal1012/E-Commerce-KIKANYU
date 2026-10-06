import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { CSSProperties, ReactNode } from "react";
import { brandConfig } from "@config/brand.config";
import { MiniCart } from "@/components/cart/mini-cart";
import { getCurrentCart } from "@/lib/current-cart";
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
  title: brandConfig.storeName,
  description: "Tienda online de esencias aromáticas.",
};

const brandCssVariables = {
  "--brand-background": brandConfig.theme.colors.background,
  "--brand-foreground": brandConfig.theme.colors.foreground,
  "--brand-muted": brandConfig.theme.colors.muted,
  "--brand-surface": brandConfig.theme.colors.surface,
  "--brand-border": brandConfig.theme.colors.border,
  "--brand-primary": brandConfig.theme.colors.primary,
  "--brand-primary-foreground": brandConfig.theme.colors.primaryForeground,
  "--brand-accent": brandConfig.theme.colors.accent,
  "--font-brand-sans": brandConfig.theme.fonts.sans,
  "--font-brand-serif": brandConfig.theme.fonts.serif,
} as CSSProperties;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cart = await getCurrentCart();

  return (
    <html
      lang="es-CL"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={brandCssVariables}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <MiniCart initialCart={cart} />
      </body>
    </html>
  );
}
