import type { Metadata, Viewport } from "next";
import { StallStoreProvider } from "@/store/stall";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pamsika",
  description: "One photo of your price board becomes a mobile-money shop, and a public price board for Lusaka.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f3f2f0" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <StallStoreProvider>{children}</StallStoreProvider>
      </body>
    </html>
  );
}
