import { describe, it, expect } from "vitest";
import { decodePng, encodePng, stitchPngsVertically } from "./png-stitch";

function gradientPixels(width: number, height: number, channels: number, seed: number): Buffer {
  const pixels = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < channels; c++) {
        pixels[(y * width + x) * channels + c] = (x * 7 + y * 13 + c * 31 + seed) & 0xff;
      }
    }
  }
  return pixels;
}

describe("png codec", () => {
  it("round-trips RGBA pixels through encode/decode", () => {
    const pixels = gradientPixels(40, 25, 4, 3);
    const decoded = decodePng(encodePng(40, 25, 4, pixels));
    expect(decoded.width).toBe(40);
    expect(decoded.height).toBe(25);
    expect(decoded.channels).toBe(4);
    expect(decoded.pixels.equals(pixels)).toBe(true);
  });

  it("round-trips RGB pixels", () => {
    const pixels = gradientPixels(17, 9, 3, 11);
    const decoded = decodePng(encodePng(17, 9, 3, pixels));
    expect(decoded.channels).toBe(3);
    expect(decoded.pixels.equals(pixels)).toBe(true);
  });
});

describe("stitchPngsVertically", () => {
  it("joins slices into the exact concatenated image", () => {
    const top = gradientPixels(32, 20, 4, 1);
    const mid = gradientPixels(32, 14, 4, 2);
    const bottom = gradientPixels(32, 5, 4, 3);
    const stitched = decodePng(
      stitchPngsVertically([encodePng(32, 20, 4, top), encodePng(32, 14, 4, mid), encodePng(32, 5, 4, bottom)])
    );
    expect(stitched.width).toBe(32);
    expect(stitched.height).toBe(39);
    expect(stitched.pixels.equals(Buffer.concat([top, mid, bottom]))).toBe(true);
  });

  it("passes a single slice through untouched", () => {
    const png = encodePng(8, 8, 4, gradientPixels(8, 8, 4, 5));
    expect(stitchPngsVertically([png])).toBe(png);
  });

  it("rejects slices with mismatched widths", () => {
    const a = encodePng(8, 4, 4, gradientPixels(8, 4, 4, 1));
    const b = encodePng(9, 4, 4, gradientPixels(9, 4, 4, 1));
    expect(() => stitchPngsVertically([a, b])).toThrow(/width/);
  });
});
