export interface Final {
  year: number;
  w: string;
  ru: string;
  s: string;
  n: string;
}

export type TournamentKey = "AO" | "RG" | "WB" | "US";
export type Division = "men" | "women";

export interface TournamentMeta {
  key: TournamentKey;
  name: string;
  venue: string;
  bg: string;
  bgDeep: string;
  accent: string;
  ball: string;
}

export interface TweakState {
  tournament: TournamentKey;
  division: Division;
  paperMode: "block" | "paper";
  indicator: "curl" | "badge" | "ring" | "none";
  /** Ball curl: bite into the edge, float just off it, or trail up from
   *  beside the nationality code (the original 2023 arrangement). */
  ballPlacement: "overlap" | "float" | "trail";
  perRow: 4 | 6 | 10;
  showNat: boolean;
  showScore: boolean;
}

export type VizTab = "poster" | "gallery" | "era" | "career" | "fingerprint" | "nations";
