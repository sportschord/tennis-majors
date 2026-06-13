import zlib from "node:zlib";

/**
 * Minimal PNG codec for stitching same-width screenshot slices vertically.
 *
 * Why this exists: production Chromium (@sparticuz/chromium renders through
 * SwiftShader) caps raster surfaces at 8192 device px. A 300-DPI A-series
 * master is 10104 px tall, so a single capture WRAPS — the top of the
 * artwork repeats over the footer. The renderer captures the page in
 * viewport-sized slices instead and this module joins them.
 *
 * Slices can't be joined at the scanline level because each PNG's first row
 * is filtered against an implicit zero row — so we unfilter to raw pixels,
 * concatenate, and re-encode (filter 1/Sub keeps flat poster fields tiny).
 */

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

interface DecodedPng {
  width: number;
  height: number;
  channels: number;
  pixels: Buffer;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export function decodePng(buf: Buffer): DecodedPng {
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error("Not a PNG");
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat: Buffer[] = [];
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    if (type === "IHDR") {
      width = buf.readUInt32BE(pos + 8);
      height = buf.readUInt32BE(pos + 12);
      bitDepth = buf[pos + 16];
      colorType = buf[pos + 17];
      interlace = buf[pos + 20];
    } else if (type === "IDAT") {
      idat.push(buf.subarray(pos + 8, pos + 8 + len));
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2) || interlace !== 0) {
    throw new Error(`Unsupported PNG layout (bitDepth ${bitDepth}, colorType ${colorType}, interlace ${interlace})`);
  }
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  if (raw.length !== (stride + 1) * height) throw new Error("PNG data size mismatch");

  const pixels = Buffer.allocUnsafe(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[(stride + 1) * y];
    const src = (stride + 1) * y + 1;
    const dst = stride * y;
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[src + x];
      const left = x >= channels ? pixels[dst + x - channels] : 0;
      const up = y > 0 ? pixels[dst + x - stride] : 0;
      let val: number;
      switch (filter) {
        case 0:
          val = rawByte;
          break;
        case 1:
          val = rawByte + left;
          break;
        case 2:
          val = rawByte + up;
          break;
        case 3:
          val = rawByte + ((left + up) >> 1);
          break;
        case 4: {
          const upLeft = y > 0 && x >= channels ? pixels[dst + x - stride - channels] : 0;
          val = rawByte + paeth(left, up, upLeft);
          break;
        }
        default:
          throw new Error(`Unknown PNG filter ${filter}`);
      }
      pixels[dst + x] = val & 0xff;
    }
  }
  return { width, height, channels, pixels };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(...parts: Buffer[]): number {
  let c = 0xffffffff;
  for (const part of parts) {
    for (let i = 0; i < part.length; i++) c = CRC_TABLE[(c ^ part[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(head.subarray(4), data), 0);
  return Buffer.concat([head, data, crc]);
}

export function encodePng(width: number, height: number, channels: number, pixels: Buffer): Buffer {
  const stride = width * channels;
  const raw = Buffer.allocUnsafe((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    // Filter 1 (Sub): horizontal deltas — flat poster fields become runs of
    // zeros, which deflate compresses to near-nothing.
    raw[(stride + 1) * y] = 1;
    const src = stride * y;
    const dst = (stride + 1) * y + 1;
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? pixels[src + x - channels] : 0;
      raw[dst + x] = (pixels[src + x] - left) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = channels === 4 ? 6 : 2;
  const idat = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([SIGNATURE, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

export function stitchPngsVertically(buffers: Buffer[]): Buffer {
  if (buffers.length === 1) return buffers[0];
  const slices = buffers.map(decodePng);
  const { width, channels } = slices[0];
  for (const slice of slices) {
    if (slice.width !== width || slice.channels !== channels) {
      throw new Error("PNG slices disagree on width or pixel format");
    }
  }
  const height = slices.reduce((sum, slice) => sum + slice.height, 0);
  return encodePng(width, height, channels, Buffer.concat(slices.map((slice) => slice.pixels)));
}
