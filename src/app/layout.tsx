import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import "./globals.css";

const plex = localFont({
  src: [
    { path: "../../public/fonts/IBMPlexSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/IBMPlexSans-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/IBMPlexSans-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  display: "swap", variable: "--font-plex",
});

export const metadata: Metadata = {
  title: "Bayframe | Workshop operations",
  description: "Local demonstration of workshop bookings, resource allocation, work orders and estimate decisions.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-GB" className={plex.variable}>
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
