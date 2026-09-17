import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Walcano & Surfaces — Enterprise Inventory Platform",
  description: "AI-Powered Centralized Inventory Management for Wallcano Tiles (B2B) and Surfaces Tiles (B2C)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
