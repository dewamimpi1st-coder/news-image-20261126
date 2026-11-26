// THE WORLD TODAY — Thursday, 26 November 2026
// A program that draws a newspaper front page summing up the day's world
// news, using nothing but the Node standard library. No network access, no
// downloaded images: every pixel is computed here — the masthead, the text
// (from a hand-built 5x7 bitmap font), the lead illustration of a burning
// tanker, and the PNG bytes themselves (hand-rolled encoder + zlib).
//
// Usage: node main.ts            (writes /output/entry.png)
//        OUTPUT_DIR=/tmp/out node main.ts   (local testing)
// The output is deterministic: run it twice, get byte-identical output.

import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Canvas: a plain RGB pixel buffer, 1024 x 1024.
// ---------------------------------------------------------------------------

const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

type RGB = [number, number, number];

const PAPER: RGB = [246, 241, 229];
const INK: RGB = [25, 25, 25];
const RED: RGB = [163, 22, 33];
const SKY: RGB = [191, 217, 232];
const SEA: RGB = [31, 78, 121];
const HULL: RGB = [34, 38, 43];
const FLAME: RGB = [232, 89, 12];
const EMBER: RGB = [247, 181, 0];
const SMOKE: RGB = [107, 114, 128];
const WHITE: RGB = [250, 250, 248];
const GREY: RGB = [90, 90, 86];

function paint(color: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = color[0];
    px[i * 3 + 1] = color[1];
    px[i * 3 + 2] = color[2];
  }
}

function dot(x: number, y: number, color: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = color[0];
  px[i + 1] = color[1];
  px[i + 2] = color[2];
}

function rect(x: number, y: number, w: number, h: number, color: RGB): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = color[0];
      px[i + 1] = color[1];
      px[i + 2] = color[2];
    }
  }
}

function hline(x: number, y: number, w: number, color: RGB, thick = 1): void {
  rect(x, y, w, thick, color);
}

function disc(cx: number, cy: number, r: number, color: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) dot(x, y, color);
    }
  }
}

// Filled triangle by walking scanlines between the three edges.
function triangle(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
  color: RGB,
): void {
  const minY = Math.max(0, Math.min(ay, by, cy));
  const maxY = Math.min(H - 1, Math.max(ay, by, cy));
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    const edges: Array<[number, number, number, number]> = [
      [ax, ay, bx, by],
      [bx, by, cx, cy],
      [cx, cy, ax, ay],
    ];
    for (const [x1, y1, x2, y2] of edges) {
      if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
        const t = (y - y1) / (y2 - y1);
        xs.push(Math.round(x1 + t * (x2 - x1)));
      }
    }
    if (xs.length >= 2) {
      const lo = Math.min(...xs);
      const hi = Math.max(...xs);
      for (let x = lo; x <= hi; x++) dot(x, y, color);
    }
  }
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font, drawn by hand. Each glyph is seven rows of five bits.
// Only the characters the front page needs are included; text is uppercased
// before drawing, so there is no lowercase set.
// ---------------------------------------------------------------------------

const FONT: Record<string, string[]> = {
  "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  "G": ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  "I": ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  "J": ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  "Q": ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  "V": ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  "W": ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "$": ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "•": ["00000", "00000", "01110", "01110", "01110", "00000", "00000"],
  "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
};

const GLYPH_W = 5;
const GLYPH_H = 7;
const GLYPH_STEP = 6; // glyph width + 1px tracking

function textWidth(text: string, scale: number): number {
  const upper = text.toUpperCase();
  if (upper.length === 0) return 0;
  return (upper.length * GLYPH_STEP - 1) * scale;
}

function drawGlyph(x: number, y: number, ch: string, scale: number, color: RGB): void {
  const rows = FONT[ch] ?? FONT["?"];
  for (let r = 0; r < GLYPH_H; r++) {
    for (let c = 0; c < GLYPH_W; c++) {
      if (rows[r][c] === "1") {
        rect(x + c * scale, y + r * scale, scale, scale, color);
      }
    }
  }
}

function drawText(
  x: number,
  y: number,
  text: string,
  scale: number,
  color: RGB,
  align: "left" | "center" = "left",
): void {
  const upper = text.toUpperCase();
  let startX = x;
  if (align === "center") startX = x - Math.floor(textWidth(upper, scale) / 2);
  let cx = startX;
  for (const ch of upper) {
    drawGlyph(cx, y, ch, scale, color);
    cx += GLYPH_STEP * scale;
  }
}

// Greedy word wrap: returns lines that fit inside maxWidth pixels.
function wrapText(text: string, maxWidth: number, scale: number): string[] {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line === "" ? word : line + " " + word;
    if (textWidth(candidate, scale) <= maxWidth || line === "") {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

function drawParagraph(
  x: number,
  y: number,
  maxWidth: number,
  text: string,
  scale: number,
  color: RGB,
  lineGap = 4,
): number {
  const lines = wrapText(text, maxWidth, scale);
  const step = GLYPH_H * scale + lineGap;
  lines.forEach((lineText, i) => drawText(x, y + i * step, lineText, scale, color));
  return y + lines.length * step;
}

// ---------------------------------------------------------------------------
// PNG encoder: IHDR + IDAT (zlib deflate, filter 0) + IEND, with CRC32.
// ---------------------------------------------------------------------------

const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = W * 3 + 1;
  const raw = Buffer.alloc(stride * H);
  for (let y = 0; y < H; y++) {
    raw[y * stride] = 0; // filter: none
    Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * stride + 1);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// The front page.
// ---------------------------------------------------------------------------

function drawLeadIllustration(x: number, y: number, w: number, h: number): void {
  // Sky, sea, and a burning tanker in the Strait of Hormuz.
  rect(x, y, w, h, SKY);
  disc(x + w - 52, y + 34, 22, EMBER); // low sun, hazy
  rect(x, y + Math.floor(h * 0.62), w, h - Math.floor(h * 0.62), SEA);
  // Wave crests.
  for (let i = 0; i < 5; i++) {
    const wx = x + 18 + i * 74;
    const wy = y + h - 26 - (i % 2) * 10;
    hline(wx, wy, 44, WHITE, 3);
  }
  // Tanker hull and deck.
  const hullY = y + Math.floor(h * 0.5);
  rect(x + 28, hullY, w - 56, 34, HULL);
  rect(x + 28, hullY, w - 56, 4, RED);
  // Containers and funnel.
  rect(x + 52, hullY - 26, 60, 26, GREY);
  rect(x + 126, hullY - 20, 44, 20, WHITE);
  rect(x + 182, hullY - 30, 26, 30, INK);
  rect(x + 182, hullY - 30, 26, 6, RED);
  rect(x + 236, hullY - 16, 96, 16, GREY);
  // Flames licking up from the deck.
  triangle(x + 250, hullY, x + 268, hullY - 58, x + 288, hullY, FLAME);
  triangle(x + 292, hullY, x + 306, hullY - 44, x + 322, hullY, EMBER);
  triangle(x + 222, hullY, x + 234, hullY - 34, x + 248, hullY, EMBER);
  // Smoke drifting up and away.
  disc(x + 268, hullY - 72, 14, SMOKE);
  disc(x + 288, hullY - 92, 18, SMOKE);
  disc(x + 298, hullY - 108, 13, SMOKE);
  // Caption bar under the picture.
  rect(x, y + h - 2, w, 2, INK);
}

function drawStoryCell(
  x: number,
  y: number,
  w: number,
  kicker: string,
  headline: string,
  body: string,
): void {
  rect(x, y, 64, 4, RED);
  drawText(x, y + 12, kicker, 2, RED);
  const headY = drawParagraph(x, y + 34, w, headline, 2, INK, 3);
  drawParagraph(x, headY + 6, w, body, 2, GREY, 3);
}

function buildPage(): void {
  paint(PAPER);
  const M = 28; // page margin
  const CW = W - M * 2; // content width: 968

  // Frame.
  rect(M - 6, M - 6, CW + 12, H - (M - 6) * 2, INK);
  rect(M - 3, M - 3, CW + 6, H - (M - 3) * 2, PAPER);

  // Masthead.
  drawText(W / 2, 52, "THE WORLD TODAY", 6, INK, "center");
  hline(M, 108, CW, INK, 3);
  hline(M, 114, CW, INK, 1);
  drawText(W / 2, 126, "THURSDAY, 26 NOVEMBER 2026  •  ONE DAY, ONE PAGE", 2, INK, "center");
  hline(M, 152, CW, INK, 1);

  // Lead story: illustration left, headline + body right.
  const leadY = 168;
  const illW = 392;
  const illH = 252;
  drawLeadIllustration(M, leadY, illW, illH);
  drawText(M, leadY + illH + 12, "PHOTO: A TANKER BURNS IN THE STRAIT OF HORMUZ", 1, GREY);
  const tx = M + illW + 24;
  const tw = W - M - tx;
  drawText(tx, leadY + 4, "LEAD STORY — ENERGY", 2, RED);
  const headEnd = drawParagraph(tx, leadY + 30, tw, "BRENT TOPS $94 AS HOUTHIS HIT SAUDI REFINERY", 3, INK, 5);
  drawParagraph(
    tx,
    headEnd + 10,
    tw,
    "Houthi forces claimed strikes on refineries at Ras Tanura and Riyadh. Brent crude jumped 3.5% to $94.61, the sharpest one-day rise in months, as traders priced in supply risk across the Gulf.",
    2,
    INK,
    4,
  );

  // Divider, then the 2x2 grid.
  hline(M, 452, CW, INK, 2);
  const gridY = 470;
  const colW = Math.floor((CW - 40) / 2);
  const rowH = 148;
  drawStoryCell(
    M, gridY, colW,
    "HORMUZ",
    "TWO TANKERS BURN IN THE STRAIT",
    "Naval mines hit two tankers in the strait. Tehran says it downed two US drones, an MQ-9 and a Lucas, as the waterway stays open but tense.",
  );
  drawStoryCell(
    M + colW + 40, gridY, colW,
    "TARIFFS",
    "US EYES DUTIES UP TO 45% ON CHINA",
    "Washington proposed new Section 301 duties on 14 trading partners, with China hit hardest at nearly 45%. Markets fear a fresh trade shock.",
  );
  drawStoryCell(
    M, gridY + rowH, colW,
    "MARKETS",
    "NASDAQ SINKS NEARLY 4% IN AI ROUT",
    "The Nasdaq fell almost 4% as AI shares slid. The S&P 500 lost 2.2%, Seoul fell 6.2% and Tokyo 2.8% — yet the Dow closed above 50,000 for the first time.",
  );
  drawStoryCell(
    M + colW + 40, gridY + rowH, colW,
    "UKRAINE",
    "DRONES BURN TWO ROSNEFT REFINERIES",
    "Drones hit refineries in Samara, the 18th Russian refineries struck. Moscow's own figures put its war dead near 500,000. A Russian strike on Odesa killed 2.",
  );

  // Divider, then ALSO TODAY.
  const alsoY = gridY + rowH * 2 + 18;
  hline(M, alsoY, CW, INK, 2);
  drawText(M, alsoY + 14, "ALSO TODAY", 2, RED);
  const items = [
    "31 killed in a fuel-tanker pile-up on a Cairo highway",
    "Pakistan's first astronaut reaches the Tiangong station",
    "CIA and US intelligence hit by a cyber attack",
    "Israeli judge urges dropping the Netanyahu charges",
    "North Korea expels a Swiss diplomat",
  ];
  let iy = alsoY + 42;
  for (const item of items) {
    drawText(M, iy, "•  " + item, 2, INK);
    iy += 27; // tightened from 30: the 5th item used to sit on the footer rule
  }

  // Footer.
  hline(M, 954, CW, INK, 1);
  drawText(W / 2, 970, "THE WORLD TODAY — SUMMED UP FROM THE DAY'S REPORTING", 2, GREY, "center");
}

// ---------------------------------------------------------------------------
// Entry point.
// ---------------------------------------------------------------------------

function main(): void {
  const outDir = process.env.OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  buildPage();
  const png = encodePNG();
  const outPath = outDir + "/entry.png";
  writeFileSync(outPath, png);
  const hash = createHash("sha256").update(png).digest("hex");
  console.log(`wrote ${outPath} (${png.length} bytes, sha256 ${hash})`);
}

main();
