import { describe, it, expect } from "vitest";
import { DEFAULT_TWEAKS, DEFAULT_VIZ, decodeState, encodeState } from "./url-state";
import type { TweakState, VizTab } from "./types";

describe("encodeState / decodeState", () => {
  it("round-trips a non-default configuration", () => {
    const tweaks: TweakState = {
      tournament: "WB",
      division: "women",
      paperMode: "paper",
      indicator: "badge",
      ballPlacement: "overlap",
      perRow: 10,
      showNat: false,
      showScore: false,
    };
    const viz: VizTab = "fingerprint";
    const decoded = decodeState("?" + encodeState(tweaks, viz));
    expect(decoded.tweaks).toEqual(tweaks);
    expect(decoded.viz).toBe(viz);
  });

  it("round-trips the defaults", () => {
    const decoded = decodeState("?" + encodeState(DEFAULT_TWEAKS, DEFAULT_VIZ));
    expect(decoded.tweaks).toEqual(DEFAULT_TWEAKS);
    expect(decoded.viz).toBe(DEFAULT_VIZ);
  });

  it("returns defaults for an empty query string", () => {
    const decoded = decodeState("");
    expect(decoded.tweaks).toEqual(DEFAULT_TWEAKS);
    expect(decoded.viz).toBe(DEFAULT_VIZ);
  });

  it("falls back to defaults on invalid values", () => {
    const decoded = decodeState("?viz=bogus&tourn=XX&div=mixed&paper=vellum&ind=sparkle&balls=hover&row=7&nat=yes&score=");
    expect(decoded.tweaks.tournament).toBe(DEFAULT_TWEAKS.tournament);
    expect(decoded.tweaks.division).toBe(DEFAULT_TWEAKS.division);
    expect(decoded.tweaks.paperMode).toBe(DEFAULT_TWEAKS.paperMode);
    expect(decoded.tweaks.indicator).toBe(DEFAULT_TWEAKS.indicator);
    expect(decoded.tweaks.ballPlacement).toBe(DEFAULT_TWEAKS.ballPlacement);
    expect(decoded.tweaks.perRow).toBe(DEFAULT_TWEAKS.perRow);
    // Toggles only switch off on an explicit "0"
    expect(decoded.tweaks.showNat).toBe(true);
    expect(decoded.tweaks.showScore).toBe(true);
    expect(decoded.viz).toBe(DEFAULT_VIZ);
  });

  it("decodes gallery as a valid viz tab", () => {
    expect(decodeState("?viz=gallery").viz).toBe("gallery");
  });

  it("switches toggles off on explicit 0", () => {
    const decoded = decodeState("?nat=0&score=0");
    expect(decoded.tweaks.showNat).toBe(false);
    expect(decoded.tweaks.showScore).toBe(false);
  });
});
