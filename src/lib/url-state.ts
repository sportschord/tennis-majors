import type { TweakState, VizTab, Division } from "./types";
import { TOURNAMENT_ORDER } from "./tournaments";

export const DEFAULT_TWEAKS: TweakState = {
  tournament: "RG",
  division: "men",
  paperMode: "block",
  indicator: "curl",
  perRow: 6,
  showNat: true,
  showScore: true,
};

export const DEFAULT_VIZ: VizTab = "poster";

const DIVISION_VALUES: readonly Division[] = ["men", "women"];
const PAPER_VALUES: readonly TweakState["paperMode"][] = ["block", "paper"];
const INDICATOR_VALUES: readonly TweakState["indicator"][] = ["curl", "badge", "ring", "none"];
const PER_ROW_VALUES: readonly TweakState["perRow"][] = [4, 6, 10];
const VIZ_VALUES: readonly VizTab[] = ["poster", "gallery", "era", "career", "fingerprint", "nations"];

function pick<T>(raw: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(raw as T) ? (raw as T) : fallback;
}

export function encodeState(tweaks: TweakState, viz: VizTab): string {
  const params = new URLSearchParams({
    viz,
    tourn: tweaks.tournament,
    div: tweaks.division,
    paper: tweaks.paperMode,
    ind: tweaks.indicator,
    row: String(tweaks.perRow),
    nat: tweaks.showNat ? "1" : "0",
    score: tweaks.showScore ? "1" : "0",
  });
  return params.toString();
}

export function decodeState(search: string): { tweaks: TweakState; viz: VizTab } {
  const params = new URLSearchParams(search);
  const rowRaw = parseInt(params.get("row") ?? "", 10);
  return {
    viz: pick(params.get("viz"), VIZ_VALUES, DEFAULT_VIZ),
    tweaks: {
      tournament: pick(params.get("tourn"), TOURNAMENT_ORDER, DEFAULT_TWEAKS.tournament),
      division: pick(params.get("div"), DIVISION_VALUES, DEFAULT_TWEAKS.division),
      paperMode: pick(params.get("paper"), PAPER_VALUES, DEFAULT_TWEAKS.paperMode),
      indicator: pick(params.get("ind"), INDICATOR_VALUES, DEFAULT_TWEAKS.indicator),
      perRow: PER_ROW_VALUES.includes(rowRaw as TweakState["perRow"])
        ? (rowRaw as TweakState["perRow"])
        : DEFAULT_TWEAKS.perRow,
      showNat: params.get("nat") !== "0",
      showScore: params.get("score") !== "0",
    },
  };
}
