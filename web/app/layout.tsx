import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/query/query-provider";

export const metadata: Metadata = {
  title: "Kuri · Operaciones en vivo",
  description: "Consola operacional de Kuri Delivery",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><QueryProvider>{children}</QueryProvider></body>
    </html>
  );
}
