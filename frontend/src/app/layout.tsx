import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Wallcano & Surfaces — Enterprise Inventory Platform",
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
        <AuthProvider>
          <main style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
