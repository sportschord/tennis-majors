import type { TournamentKey, TournamentMeta, Division } from "./types";

export const TOURNAMENTS: Record<TournamentKey, TournamentMeta> = {
  AO: {
    key: "AO",
    name: "Australian Open",
    venue: "Melbourne Park",
    bg: "#1E78B4",
    bgDeep: "#155A8A",
    accent: "#1E78B4",
    ball: "#D4DD3A",
  },
  RG: {
    key: "RG",
    name: "French Open",
    venue: "Roland Garros",
    bg: "#C75B2A",
    bgDeep: "#9D4321",
    accent: "#C75B2A",
    ball: "#C7DA31",
  },
  WB: {
    key: "WB",
    name: "Wimbledon",
    venue: "All England Lawn Tennis Club",
    bg: "#1F6B4A",
    bgDeep: "#15553A",
    accent: "#5D2A6E",
    ball: "#D6DD30",
  },
  US: {
    key: "US",
    name: "US Open",
    venue: "Flushing Meadows",
    bg: "#3F6FA4",
    bgDeep: "#2A4F7A",
    accent: "#71A93C",
    ball: "#D6DD30",
  },
};

export const DIVISIONS: Record<Division, { label: string }> = {
  men: { label: "Men's Singles" },
  women: { label: "Women's Singles" },
};
