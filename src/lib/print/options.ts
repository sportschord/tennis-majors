import type { TweakState, VizTab, Division } from "../types";
import { TOURNAMENTS } from "../tournaments";
import { VIZ_DIMS } from "../viz-dims";
import { decodeState, encodeState } from "../url-state";

export type PrintViz = Exclude<VizTab, "gallery">;
export type PrintFormat = "png" | "pdf";
export type PrintDpi = 300 | 150;

export interface PrintRenderOptions {
  viz: PrintViz;
  tweaks: TweakState;
  format: PrintFormat;
  dpi: PrintDpi;
  uploadTarget: "drive" | null;
}

/** Pixels per mm at CSS 96dpi — used to size PDF pages from mm dimensions. */
const CSS_PX_PER_MM = 96 / 25.4;

/** Drive section folder — also the `section` the prints-orchestrator ingests. */
export const SECTION_FOLDER = "Tennis Majors";

export function parsePrintOptions(params: URLSearchParams): PrintRenderOptions {
  const { tweaks, viz } = decodeState(params.toString());
  const format: PrintFormat = params.get("format") === "pdf" ? "pdf" : "png";
  const dpi: PrintDpi = params.get("dpi") === "150" ? 150 : 300;
  const uploadTarget = params.get("uploadTarget") === "drive" ? ("drive" as const) : null;
  return { viz: viz === "gallery" ? "poster" : viz, tweaks, format, dpi, uploadTarget };
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
  if (options.format === "png") parts.push(`${options.dpi}dpi`);
  return `${parts.join("-")}.${options.format}`;
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
  if (options.format === "pdf") params.set("w", String(geometry.cssWidth));
  return `/print?${params.toString()}`;
}
