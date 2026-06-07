import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevRadar | Pipeline profissional de oportunidades",
  description: "Plataforma para encontrar, classificar e acompanhar oportunidades dev, freelance e remotas."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
