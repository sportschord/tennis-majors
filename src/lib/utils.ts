import type { Final } from "./types";

export function countPriorTitles(rows: Final[], idx: number): number {
  const target = rows[idx].w;
  let c = 0;
  for (let i = 0; i < idx; i++) if (rows[i].w === target) c++;
  return c;
}

export function splitScore(s: string, maxCharsPerLine: number): string[] {
  const parts = s.split(" ");
  if (s.length <= maxCharsPerLine) return [s];
  let line1 = "",
    line2 = "";
  for (let i = 0; i < parts.length; i++) {
    if ((line1 + " " + parts[i]).trim().length <= maxCharsPerLine && line2 === "") {
      line1 = (line1 + " " + parts[i]).trim();
    } else {
      line2 = (line2 + " " + parts[i]).trim();
    }
  }
  return line2 ? [line1, line2] : [line1];
}

export interface ParsedSet {
  w: number;
  l: number;
  total: number;
}

export function parseSets(s: string, maxSets = 5): ParsedSet[] {
  return s
    .split(" ")
    .map((seg) => {
      const cleaned = seg.replace(/\([^)]+\)/g, "").replace(/RET/i, "").replace(/[^0-9-]/g, "");
      const [a, b] = cleaned.split("-").map((x) => parseInt(x, 10));
      if (Number.isNaN(a) || Number.isNaN(b)) return null;
      return { w: a, l: b, total: a + b };
    })
    .filter((x): x is ParsedSet => x !== null)
    .slice(0, maxSets);
}
