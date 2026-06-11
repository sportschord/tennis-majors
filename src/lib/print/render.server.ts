import type { Browser, Page } from "puppeteer-core";
import {
  buildPrintFileName,
  buildPrintPagePath,
  getPrintGeometry,
  type PrintRenderOptions,
} from "./options";

/**
 * Headless render engine, ported from f1app's lib/print-generator.server.js:
 * navigate the chrome-free /print route, wait for the data-ready font
 * handshake, then screenshot (PNG) or print (PDF) the artwork element.
 */

export interface RenderedPrint {
  output: Buffer | Uint8Array;
  contentType: "image/png" | "application/pdf";
  fileName: string;
  options: PrintRenderOptions;
  targetUrl: string;
}

export async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const chromium = require("@sparticuz/chromium");
    const puppeteerCore = require("puppeteer-core");
    /* eslint-enable @typescript-eslint/no-require-imports */
    return puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const puppeteer = require("puppeteer");
  // headless "shell" (the classic headless build, same as @sparticuz/chromium
  // in production): the new headless mode stalls Page.captureScreenshot on
  // large high-DPI surfaces, verified locally on macOS.
  return puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

export function getBaseUrl(request: Request): string {
  return new URL(request.url).origin;
}

/**
 * Render one print on an existing Puppeteer page — the page is reused
 * across renders in batch mode to avoid spawning parallel Chromium
 * instances on Vercel.
 */
export async function renderPrintOnPage(
  page: Page,
  baseUrl: string,
  options: PrintRenderOptions
): Promise<RenderedPrint> {
  const geometry = getPrintGeometry(options);

  await page.setViewport({
    width: geometry.cssWidth,
    height: geometry.cssHeight,
    deviceScaleFactor: geometry.deviceScaleFactor,
  });

  const targetUrl = `${baseUrl}${buildPrintPagePath(options)}`;
  // domcontentloaded (not networkidle2): the data-ready handshake below is
  // the real readiness signal, and dev-mode HMR connections never go idle.
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

  const expected = {
    viz: options.viz,
    tournament: options.tweaks.tournament,
    division: options.tweaks.division,
  };
  // Interval polling, not the default requestAnimationFrame: headless pages
  // throttle rAF when occluded, which silently stalls the wait even after
  // data-ready flips true.
  await page.waitForFunction(
    (exp: Record<string, string>) => {
      const el = document.querySelector<HTMLElement>("#print-page");
      if (!el || el.dataset.ready !== "true") return false;
      return Object.entries(exp).every(([key, value]) => el.dataset[key] === value);
    },
    { timeout: 45000, polling: 250 },
    expected
  );

  // Brief settle for layout after fonts resolve (f1app uses 600ms with map
  // tiles in play; pure SVG needs less).
  await new Promise((resolve) => setTimeout(resolve, 300));

  let output: Buffer | Uint8Array;
  let contentType: RenderedPrint["contentType"];
  if (options.format === "pdf") {
    output = await page.pdf({
      width: `${geometry.widthMm}mm`,
      height: `${geometry.heightMm}mm`,
      printBackground: true,
      preferCSSPageSize: false,
    });
    contentType = "application/pdf";
  } else {
    // Viewport screenshot, not element.screenshot(): #print-page is laid out
    // at (0,0) exactly viewport-sized, and the element path's
    // scroll-into-view/visibility wait can stall in throttled headless pages.
    output = (await page.screenshot({ type: "png", omitBackground: false })) as Buffer;
    contentType = "image/png";
  }

  return {
    output,
    contentType,
    fileName: buildPrintFileName(options),
    options,
    targetUrl,
  };
}

/** Single render with its own browser lifecycle (used by the GET/POST endpoint). */
export async function renderPrintSnapshot(
  request: Request,
  options: PrintRenderOptions
): Promise<RenderedPrint> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    return await renderPrintOnPage(page, getBaseUrl(request), options);
  } finally {
    await browser.close();
  }
}
