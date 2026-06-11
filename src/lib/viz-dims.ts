import type { VizTab } from "./types";

/** Logical artwork dimensions (viewBox units) per visualization — shared by
 *  the artboard, status bar, and the /print capture route. */
export const VIZ_DIMS: Record<Exclude<VizTab, "gallery">, { w: number; h: number }> = {
  poster: { w: 1188, h: 1684 },
  era: { w: 1600, h: 900 },
  career: { w: 1188, h: 1684 },
  fingerprint: { w: 1188, h: 1684 },
  nations: { w: 1600, h: 900 },
};
