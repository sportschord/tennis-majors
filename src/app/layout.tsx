import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tennis Majors Print Series | Open Era Champions",
  description:
    "A1 print series of every Open Era grand slam final — Australian Open, French Open, Wimbledon, US Open — with interactive tweaks and multiple visualizations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/montserrat-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
