import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Umuranga — AI Talent Screening",
  description:
    "AI-powered talent screening system for fast, fair, and explainable candidate evaluation.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
