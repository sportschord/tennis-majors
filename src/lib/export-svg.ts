/**
 * Print-quality SVG export.
 *
 * Serialized SVGs only carry `fontFamily="Montserrat"` attributes — no font
 * data — so a bare XMLSerializer pass rasterizes with system-font fallbacks.
 * Every export therefore clones the SVG and injects an @font-face with the
 * self-hosted variable WOFF2 inlined as base64 before serialization.
 */

export interface ExportPreset {
  id: "png-print" | "png-preview" | "svg";
  label: string;
  description: string;
  /** Raster scale relative to the viewBox; undefined = vector SVG download. */
  scale?: number;
}

// Poster viewBox is 1188x1684. A1 @ 300 DPI needs 7016x9933px → scale 6 gives 7128x10104.
export const EXPORT_PRESETS: ExportPreset[] = [
  { id: "png-print", label: "PNG · Print", description: "300 DPI at A1 — production", scale: 6 },
  { id: "png-preview", label: "PNG · Preview", description: "150 DPI — proofs & mockups", scale: 3 },
  { id: "svg", label: "SVG · Vector", description: "Fonts embedded — design iteration" },
];

/** Every font family painted inside the poster SVGs — all must be embedded. */
const EMBEDDED_FONTS = [
  { family: "Montserrat", path: "/fonts/montserrat-var.woff2" },
  { family: "Playfair Display", path: "/fonts/playfair-var.woff2" },
];

const fontDataUriCache = new Map<string, string>();

async function getFontDataUri(path: string): Promise<string> {
  const cached = fontDataUriCache.get(path);
  if (cached) return cached;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Font fetch failed (${res.status}) for ${path}`);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  const uri = `data:font/woff2;base64,${btoa(binary)}`;
  fontDataUriCache.set(path, uri);
  return uri;
}

async function buildFontFaceCss(): Promise<string> {
  const rules = await Promise.all(
    EMBEDDED_FONTS.map(async ({ family, path }) => {
      const uri = await getFontDataUri(path);
      return `@font-face{font-family:"${family}";font-style:normal;font-weight:100 900;src:url("${uri}") format("woff2");}`;
    })
  );
  return rules.join("");
}

interface SerializedSvg {
  markup: string;
  width: number;
  height: number;
}

async function serializeWithFonts(svg: SVGSVGElement): Promise<SerializedSvg> {
  const viewBox = svg.getAttribute("viewBox")?.split(/\s+/).map(Number);
  if (!viewBox || viewBox.length !== 4 || viewBox.some(Number.isNaN)) {
    throw new Error("SVG has no valid viewBox");
  }
  const [, , width, height] = viewBox;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  // Explicit pixel dimensions: the live node uses width="100%", which has no
  // intrinsic size when the markup is loaded into an <img> for rasterization.
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = await buildFontFaceCss();
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.appendChild(style);
  clone.insertBefore(defs, clone.firstChild);

  return { markup: new XMLSerializer().serializeToString(clone), width, height };
}

function download(blob: Blob, filename: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function rasterize(markup: string, width: number, height: number, scale: number): Promise<Blob> {
  const svgBlob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    img.src = svgUrl;
    await img.decode();

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas export failed — image may be too large for this browser"));
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

/** Export the given SVG node with the chosen preset. Returns the saved filename. */
export async function exportSvgElement(svg: SVGSVGElement, baseName: string, preset: ExportPreset): Promise<string> {
  const { markup, width, height } = await serializeWithFonts(svg);

  if (preset.scale === undefined) {
    const filename = `${baseName}.svg`;
    download(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }), filename);
    return filename;
  }

  const blob = await rasterize(markup, width, height, preset.scale);
  const dpiTag = preset.id === "png-print" ? "300dpi" : "150dpi";
  const filename = `${baseName} (${dpiTag}).png`;
  download(blob, filename);
  return filename;
}
