import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "What-In - Commerce & Automation",
  description: "Unified Commerce Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light h-full antialiased" style={{ colorScheme: "light" }}>
      <body className={`${inter.className} min-h-full flex flex-col`} style={{ background: "#f8fafc", color: "#0f172a", colorScheme: "light" }}>
        {children}
      </body>
    </html>
  );
}
