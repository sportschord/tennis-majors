import type { TweakState, VizTab, Division } from "../types";
import { TOURNAMENTS } from "../tournaments";
import { VIZ_DIMS } from "../viz-dims";
import { decodeState, encodeState } from "../url-state";

export type PrintViz = Exclude<VizTab, "gallery">;
export type PrintFormat = "png" | "pdf";
export type PrintDpi = 300 | 150;
/** Master size groups the prints-orchestrator recognises (file stems). */
export type PrintSize = "A" | "18x24";

export interface PrintRenderOptions {
  viz: PrintViz;
  tweaks: TweakState;
  format: PrintFormat;
  dpi: PrintDpi;
  /** A = ISO √2 aspect; 18x24 = 3:4 aspect (poster lays out natively per ratio). */
  size: PrintSize;
  uploadTarget: "drive" | null;
}

/** Pixels per mm at CSS 96dpi — used to size PDF pages from mm dimensions. */
const CSS_PX_PER_MM = 96 / 25.4;

/** Top-level category folder under the shared "Import Drive" base. */
export const CATEGORY_FOLDER = "Tennis";
/** Drive section folder (nested under the category). */
export const SECTION_FOLDER = "Tennis Majors";
/**
 * The `section` string the prints-orchestrator stores for an M2M push. It MUST
 * equal the Drive folder chain above the design, joined the way the
 * orchestrator's folder walk joins levels (" / "), so a machine push and a
 * manual scan of the Import Drive root converge on the same catalog path
 * (`Tennis / Tennis Majors/<design>`).
 */
export const ORCHESTRATOR_SECTION = `${CATEGORY_FOLDER} / ${SECTION_FOLDER}`;

export function parsePrintOptions(params: URLSearchParams): PrintRenderOptions {
  const { tweaks, viz } = decodeState(params.toString());
  const format: PrintFormat = params.get("format") === "pdf" ? "pdf" : "png";
  const dpi: PrintDpi = params.get("dpi") === "150" ? 150 : 300;
  const size: PrintSize = params.get("size") === "18x24" ? "18x24" : "A";
  const uploadTarget = params.get("uploadTarget") === "drive" ? ("drive" as const) : null;
  return { viz: viz === "gallery" ? "poster" : viz, tweaks, format, dpi, size, uploadTarget };
}

function divisionLabel(division: Division): string {
  return division === "men" ? "Men's" : "Women's";
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildPrintFileName(options: PrintRenderOptions): string {
  const tourn = TOURNAMENTS[options.tweaks.tournament];
  const parts = [slug(tourn.name), options.tweaks.division, options.viz];
  if (options.size === "18x24") parts.push("18x24");
  if (options.format === "png") parts.push(`${options.dpi}dpi`);
  return `${parts.join("-")}.${options.format}`;
}

/** Drive/orchestrator master file name — the stem IS the size group. */
export function masterFileName(options: PrintRenderOptions): string {
  return `${options.size}.${options.format}`;
}

/**
 * Design folder name inside the Drive tree — this becomes the design's
 * globally-unique name when the prints-orchestrator ingests the folder.
 */
export function buildDesignFolderName(options: PrintRenderOptions): string {
  const tourn = TOURNAMENTS[options.tweaks.tournament];
  return `${tourn.name} Champions (${divisionLabel(options.tweaks.division)})`;
}

export interface PrintGeometry {
  /** CSS pixel size the /print page renders at. */
  cssWidth: number;
  cssHeight: number;
  /** Screenshot multiplier (PNG only). */
  deviceScaleFactor: number;
  /** PDF page size in mm (content-exact, A-width). */
  widthMm: number;
  heightMm: number;
}

/**
 * Geometry per artwork/format. Portrait pieces target the A-series width
 * (594mm = A1); pages are sized exactly to the artwork's aspect so nothing
 * is cropped or letterboxed. PNG uses deviceScaleFactor against the natural
 * viewBox size: scale 6 on 1188px → 7128px wide, clearing A1 @ 300 DPI (7016).
 */
export function getPrintGeometry(options: PrintRenderOptions): PrintGeometry {
  // 18x24 masters (poster only): the poster lays out natively at 3:4
  // (1188×1584 viewBox via /print?size=18x24). 300 DPI at 18×24in is
  // exactly 5400×7200 — css 1080×1440 at deviceScaleFactor 5.
  if (options.viz === "poster" && options.size === "18x24") {
    const widthMm = 457.2;
    const heightMm = 609.6;
    if (options.format === "pdf") {
      const cssWidth = Math.round(widthMm * CSS_PX_PER_MM);
      return { cssWidth, cssHeight: Math.round((cssWidth * 4) / 3), deviceScaleFactor: 1, widthMm, heightMm };
    }
    return {
      cssWidth: 1080,
      cssHeight: 1440,
      deviceScaleFactor: options.dpi === 300 ? 5 : 2.5,
      widthMm,
      heightMm,
    };
  }

  const dims = VIZ_DIMS[options.viz];
  const portrait = dims.h >= dims.w;
  const widthMm = portrait ? 594 : 841;
  const heightMm = Math.round((widthMm * dims.h) / dims.w);

  if (options.format === "pdf") {
    const cssWidth = Math.round(widthMm * CSS_PX_PER_MM);
    return {
      cssWidth,
      cssHeight: Math.round((cssWidth * dims.h) / dims.w),
      deviceScaleFactor: 1,
      widthMm,
      heightMm,
    };
  }

  return {
    cssWidth: dims.w,
    cssHeight: dims.h,
    deviceScaleFactor: options.dpi === 300 ? 6 : 3,
    widthMm,
    heightMm,
  };
}

export function buildPrintPagePath(options: PrintRenderOptions): string {
  const geometry = getPrintGeometry(options);
  const params = new URLSearchParams(encodeState(options.tweaks, options.viz));
  if (options.viz === "poster" && options.size === "18x24") {
    params.set("size", "18x24");
    params.set("w", String(geometry.cssWidth));
  } else if (options.format === "pdf") {
    params.set("w", String(geometry.cssWidth));
  }
  return `/print?${params.toString()}`;
}
