import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Headless-render + Drive deps stay external to the server bundle —
  // @sparticuz/chromium ships a compressed binary the bundler must not touch.
  serverExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium", "googleapis"],
};

export default nextConfig;
