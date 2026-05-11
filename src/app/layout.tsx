import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Tennis Majors Print Series | Open Era Champions",
  description:
    "A1 print series of every Open Era grand slam final — Australian Open, French Open, Wimbledon, US Open — with interactive tweaks and multiple visualizations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="font-[family-name:var(--font-montserrat)] antialiased min-h-screen">{children}</body>
    </html>
  );
}
