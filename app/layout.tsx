import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClaimEase | Expense management",
  description: "Submit, manage, and track your employee expense claims.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
