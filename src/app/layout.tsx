import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Salty Baby · Moda Sustentável",
  description: "Brechó infantil consignado de Caraguatatuba-SP.",
};

export const viewport: Viewport = {
  themeColor: "#13506E",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
