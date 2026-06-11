import { describe, it, expect } from "vitest";
import {
  parsePrintOptions,
  buildPrintFileName,
  buildDesignFolderName,
  getPrintGeometry,
  buildPrintPagePath,
} from "./options";

describe("parsePrintOptions", () => {
  it("parses a full print request", () => {
    const opts = parsePrintOptions(
      new URLSearchParams("viz=poster&tourn=WB&div=women&format=pdf&dpi=300&uploadTarget=drive")
    );
    expect(opts.viz).toBe("poster");
    expect(opts.tweaks.tournament).toBe("WB");
    expect(opts.tweaks.division).toBe("women");
    expect(opts.format).toBe("pdf");
    expect(opts.uploadTarget).toBe("drive");
  });

  it("coerces gallery to poster and defaults format/dpi", () => {
    const opts = parsePrintOptions(new URLSearchParams("viz=gallery"));
    expect(opts.viz).toBe("poster");
    expect(opts.format).toBe("png");
    expect(opts.dpi).toBe(300);
    expect(opts.uploadTarget).toBeNull();
  });
});

describe("naming", () => {
  it("builds slugged file names", () => {
    const opts = parsePrintOptions(new URLSearchParams("viz=poster&tourn=RG&div=men&format=png&dpi=300"));
    expect(buildPrintFileName(opts)).toBe("french-open-men-poster-300dpi.png");
  });

  it("omits dpi for pdf masters", () => {
    const opts = parsePrintOptions(new URLSearchParams("viz=poster&tourn=US&div=women&format=pdf"));
    expect(buildPrintFileName(opts)).toBe("us-open-women-poster.pdf");
  });

  it("builds the orchestrator design folder name", () => {
    const opts = parsePrintOptions(new URLSearchParams("viz=poster&tourn=AO&div=women"));
    expect(buildDesignFolderName(opts)).toBe("Australian Open Champions (Women's)");
  });
});

describe("getPrintGeometry", () => {
  it("clears A1 at 300 DPI for poster PNG (needs 7016x9933)", () => {
    const opts = parsePrintOptions(new URLSearchParams("viz=poster&tourn=RG&div=men&format=png&dpi=300"));
    const g = getPrintGeometry(opts);
    expect(g.cssWidth * g.deviceScaleFactor).toBeGreaterThanOrEqual(7016);
    expect(g.cssHeight * g.deviceScaleFactor).toBeGreaterThanOrEqual(9933);
  });

  it("sizes PDF pages at A-series width with content-exact height", () => {
    const opts = parsePrintOptions(new URLSearchParams("viz=poster&tourn=RG&div=men&format=pdf"));
    const g = getPrintGeometry(opts);
    expect(g.widthMm).toBe(594);
    // poster aspect 1684/1188 → 842mm, within a millimetre of true A1 (841)
    expect(Math.abs(g.heightMm - 841)).toBeLessThanOrEqual(2);
    // CSS layout width matches 594mm at 96dpi (≈2245px)
    expect(Math.abs(g.cssWidth - 2245)).toBeLessThanOrEqual(1);
  });

  it("uses landscape A-width for 16:9 visualizations", () => {
    const opts = parsePrintOptions(new URLSearchParams("viz=era&div=men&format=pdf"));
    const g = getPrintGeometry(opts);
    expect(g.widthMm).toBe(841);
    expect(g.heightMm).toBe(Math.round((841 * 900) / 1600));
  });
});

describe("buildPrintPagePath", () => {
  it("includes the w override only for pdf", () => {
    const pdf = parsePrintOptions(new URLSearchParams("viz=poster&tourn=WB&div=men&format=pdf"));
    const png = parsePrintOptions(new URLSearchParams("viz=poster&tourn=WB&div=men&format=png"));
    const pdfParams = new URLSearchParams(buildPrintPagePath(pdf).split("?")[1]);
    const pngParams = new URLSearchParams(buildPrintPagePath(png).split("?")[1]);
    expect(pdfParams.get("w")).toBe("2245");
    expect(pngParams.has("w")).toBe(false);
    expect(pngParams.get("tourn")).toBe("WB");
  });
});
