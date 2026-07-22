import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers";

export const metadata: Metadata = {
  title: "Researo — Evidence-First AI Research",
  description:
    "Researo is an AI Research Intelligence Platform. Upload documents, ask questions, and get evidence-backed reports with citations you can trust.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
