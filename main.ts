// News image generator — make.fun "Sum up 26 November's world news in one image".
// Draws a 1024x1024 newspaper front page for Thursday 26 November 2026 as a
// PNG, using only Node 22 stdlib (node:fs, node:zlib, node:path).
// No network, no fonts, no downloaded images: text is drawn from an embedded
// 5x7 bitmap font and every shape is drawn from code. Deterministic: the same
// input always writes the same bytes to /output/entry.png.
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join } from "node:path";

const W = 1024;
const H = 1024;
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || "/output";
const OUT_FILE = join(OUT_DIR, "entry.png");

// Palette: broadsheet cream paper, black ink, red and navy accents.
const PAPER = [246, 241, 231];
const INK = [22, 22, 22];
const RED = [178, 34, 28];
const NAVY = [31, 58, 95];
const GREY = [96, 90, 78];
const LIGHT = [232, 225, 208];

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows; each row is a 5-bit number whose
// most significant bit is the leftmost pixel. Lowercase renders as uppercase.
// ---------------------------------------------------------------------------
const FONT: Record<string, number[]> = {
  "A": [14, 17, 17, 31, 17, 17, 17],
  "B": [30, 17, 17, 30, 17, 17, 30],
  "C": [14, 17, 16, 16, 16, 17, 14],
  "D": [30, 17, 17, 17, 17, 17, 30],
  "E": [31, 16, 16, 30, 16, 16, 31],
  "F": [31, 16, 16, 30, 16, 16, 16],
  "G": [14, 17, 16, 23, 17, 17, 15],
  "H": [17, 17, 17, 31, 17, 17, 17],
  "I": [14, 4, 4, 4, 4, 4, 14],
  "J": [7, 2, 2, 2, 2, 18, 12],
  "K": [17, 18, 20, 24, 20, 18, 17],
  "L": [16, 16, 16, 16, 16, 16, 31],
  "M": [17, 27, 21, 21, 17, 17, 17],
  "N": [17, 25, 21, 19, 17, 17, 17],
  "O": [14, 17, 17, 17, 17, 17, 14],
  "P": [30, 17, 17, 30, 16, 16, 16],
  "Q": [14, 17, 17, 17, 21, 18, 13],
  "R": [30, 17, 17, 30, 20, 18, 17],
  "S": [15, 16, 16, 14, 1, 1, 30],
  "T": [31, 4, 4, 4, 4, 4, 4],
  "U": [17, 17, 17, 17, 17, 17, 14],
  "V": [17, 17, 17, 17, 17, 10, 4],
  "W": [17, 17, 17, 21, 21, 27, 17],
  "X": [17, 17, 10, 4, 10, 17, 17],
  "Y": [17, 17, 10, 4, 4, 4, 4],
  "Z": [31, 1, 2, 4, 8, 16, 31],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 2, 4, 8, 31],
  "3": [31, 2, 4, 2, 1, 17, 14],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [6, 8, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 2, 12],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 12, 12],
  ",": [0, 0, 0, 0, 12, 12, 8],
  ":": [0, 12, 12, 0, 12, 12, 0],
  ";": [0, 12, 12, 0, 12, 4, 8],
  "!": [4, 4, 4, 4, 4, 0, 4],
  "?": [14, 17, 1, 2, 4, 0, 4],
  "'": [4, 4, 8, 0, 0, 0, 0],
  '"': [10, 10, 10, 0, 0, 0, 0],
  "-": [0, 0, 0, 31, 0, 0, 0],
  "(": [2, 4, 8, 8, 8, 4, 2],
  ")": [8, 4, 2, 2, 2, 4, 8],
  "/": [1, 1, 2, 4, 8, 16, 16],
  "%": [25, 25, 2, 4, 8, 19, 19],
  "&": [12, 18, 20, 8, 21, 18, 13],
  "+": [0, 4, 4, 31, 4, 4, 0],
  "=": [0, 0, 31, 0, 31, 0, 0],
  "$": [4, 15, 20, 14, 5, 30, 4],
};

// ---------------------------------------------------------------------------
// Pixel buffer (RGB) and drawing helpers.
// ---------------------------------------------------------------------------
const buf = new Uint8Array(W * H * 3);

function fill(color: number[]): void {
  for (let i = 0; i < W * H; i++) {
    buf[i * 3] = color[0];
    buf[i * 3 + 1] = color[1];
    buf[i * 3 + 2] = color[2];
  }
}

function rect(x: number, y: number, w: number, h: number, color: number[]): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      buf[i] = color[0];
      buf[i + 1] = color[1];
      buf[i + 2] = color[2];
    }
  }
}

function hline(x: number, y: number, w: number, thick: number, color: number[]): void {
  rect(x, y, w, thick, color);
}

function charWidth(scale: number): number {
  return 6 * scale;
}

function textWidth(text: string, scale: number): number {
  if (text.length === 0) return 0;
  return text.length * charWidth(scale) - scale;
}

function drawChar(x: number, y: number, ch: string, scale: number, color: number[]): void {
  const glyph = FONT[ch.toUpperCase()] || FONT["?"];
  for (let row = 0; row < 7; row++) {
    const bits = glyph[row];
    for (let col = 0; col < 5; col++) {
      if (bits & (1 << (4 - col))) {
        rect(x + col * scale, y + row * scale, scale, scale, color);
      }
    }
  }
}

function drawText(x: number, y: number, text: string, scale: number, color: number[]): void {
  let cx = x;
  for (const ch of text) {
    drawChar(cx, y, ch, scale, color);
    cx += charWidth(scale);
  }
}

function drawTextCentered(cx: number, y: number, text: string, scale: number, color: number[]): void {
  drawText(cx - Math.floor(textWidth(text, scale) / 2), y, text, scale, color);
}

// Greedy word wrap for a max pixel width. Words longer than the width are
// split character by character.
function wrap(text: string, maxWidth: number, scale: number): string[] {
  const lines: string[] = [];
  const words = text.split(" ");
  let cur = "";
  for (const word of words) {
    const trial = cur === "" ? word : cur + " " + word;
    if (textWidth(trial, scale) <= maxWidth) {
      cur = trial;
      continue;
    }
    if (cur !== "") lines.push(cur);
    if (textWidth(word, scale) > maxWidth) {
      let part = "";
      for (const ch of word) {
        if (textWidth(part + ch, scale) > maxWidth) {
          lines.push(part);
          part = ch;
        } else {
          part += ch;
        }
      }
      cur = part;
    } else {
      cur = word;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

function drawLines(x: number, y: number, lines: string[], scale: number, color: number[], gap: number): number {
  let yy = y;
  for (const line of lines) {
    drawText(x, yy, line, scale, color);
    yy += 7 * scale + gap;
  }
  return yy;
}

// ---------------------------------------------------------------------------
// PNG encoder (8-bit RGB, filter 0, zlib level 9). Fully deterministic.
// ---------------------------------------------------------------------------
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
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
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    Buffer.from(buf.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
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
// Content: the day's world news, Thursday 26 November 2026.
// Sources (morning of 26 Nov WIB / late 25 Nov UTC, cross-checked):
// SimpleLife.news daily brief 26 Nov; Jabulani Radio top international news;
// EUR Radio News 26 Nov 01:17; Just Security Early Edition 25 Nov; Reuters.
// ---------------------------------------------------------------------------
const LEAD = {
  kicker: "MIDDLE EAST - LEAD STORY",
  headline: "BRENT TOPS $94 AS HOUTHIS HIT SAUDI REFINERY",
  summary:
    "Yemen's Houthis claim strikes on Saudi Arabia's Ras Tanura refinery and Riyadh, sending Brent crude up 3.5 percent to $94.61 as the Iran war widens.",
};

const STORIES = [
  {
    kicker: "MIDDLE EAST",
    headline: "TANKERS IN FLAMES IN THE STRAIT OF HORMUZ",
    summary:
      "Iran says two oil tankers struck naval mines and caught fire in the strait; Tehran claims it downed two US drones overhead.",
  },
  {
    kicker: "ECONOMY",
    headline: "US TARIFFS HIT CHINA HARDEST AT NEARLY 45%",
    summary:
      "Washington's updated Section 301 duties hit China hardest at nearly 45 percent; 14 trading partners face tariffs of 20 to 40 percent.",
  },
  {
    kicker: "MARKETS",
    headline: "NASDAQ SINKS NEARLY 4% IN AI ROUT",
    summary:
      "US stocks fall further as AI fears intensify, the Nasdaq down almost 4 percent; the S&P 500 falls 2.2 percent and the KOSPI 6.2 percent.",
  },
  {
    kicker: "EUROPE",
    headline: "UKRAINE DRONES HIT 18 RUSSIAN REFINERIES",
    summary:
      "Russian oil refining falls to a more than 20-year low after Ukrainian strikes on at least 18 refineries; two Rosneft plants burn in Samara.",
  },
];

const ALSO = [
  "31 KILLED AS FUEL TANKER CRASHES ON CAIRO HIGHWAY",
  "RUSSIA'S OWN FIGURES: NEARLY 500,000 WAR DEAD",
  "CIA AND US INTELLIGENCE HIT BY CYBERATTACK",
  "PAKISTAN'S FIRST ASTRONAUT REACHES SPACE STATION",
  "ISRAELI JUDGES URGE DROPPING NETANYAHU CHARGES",
  "NORTH KOREA EXPELS SWISS DIPLOMAT",
];

// ---------------------------------------------------------------------------
// Layout: a broadsheet front page, 1024x1024.
// ---------------------------------------------------------------------------
const MARGIN = 44;
const CONTENT_W = W - MARGIN * 2;

fill(PAPER);

// Double outer border.
rect(16, 16, W - 32, 3, INK);
rect(16, H - 19, W - 32, 3, INK);
rect(16, 16, 3, H - 32, INK);
rect(W - 19, 16, 3, H - 32, INK);
rect(24, 24, W - 48, 1, INK);
rect(24, H - 25, W - 48, 1, INK);
rect(24, 24, 1, H - 48, INK);
rect(W - 25, 24, 1, H - 48, INK);

// Masthead.
drawTextCentered(W / 2, 46, "THE WORLD TODAY", 7, INK);
hline(MARGIN, 116, CONTENT_W, 3, INK);
drawTextCentered(W / 2, 130, "THURSDAY, 26 NOVEMBER 2026", 3, RED);
drawTextCentered(W / 2, 158, "THE DAY'S WORLD NEWS IN ONE IMAGE", 2, GREY);
hline(MARGIN, 186, CONTENT_W, 1, GREY);

// Lead story.
let y = 206;
drawText(MARGIN, y, LEAD.kicker, 2, RED);
y += 26;
const leadLines = wrap(LEAD.headline, CONTENT_W, 5);
y = drawLines(MARGIN, y, leadLines, 5, INK, 8);
y += 6;
const leadSummary = wrap(LEAD.summary, CONTENT_W, 2);
y = drawLines(MARGIN, y, leadSummary, 2, INK, 6);
y += 14;
hline(MARGIN, y, CONTENT_W, 3, INK);
y += 16;

// Grid: 2 columns x 2 rows of stories. ROW_H leaves headroom for a
// 5-line summary (kicker 24 + 2-line headline 48 + gap 4 + 5 lines x 19)
// so a long summary can never collide with the row below it.
const COL_W = Math.floor((CONTENT_W - 32) / 2);
const ROW_H = 176;
for (let i = 0; i < STORIES.length; i++) {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const x = MARGIN + col * (COL_W + 32);
  const sy = y + row * ROW_H;
  drawText(x, sy, STORIES[i].kicker, 2, NAVY);
  const hl = wrap(STORIES[i].headline, COL_W, 3);
  let yy = drawLines(x, sy + 24, hl, 3, INK, 6);
  const sm = wrap(STORIES[i].summary, COL_W, 2);
  drawLines(x, yy + 4, sm, 2, INK, 5);
  if (col === 0) {
    rect(x + COL_W + 16, sy, 1, ROW_H - 16, LIGHT);
  }
}
y += ROW_H * 2 + 4;
hline(MARGIN, y, CONTENT_W, 3, INK);
y += 16;

// Also today.
drawText(MARGIN, y, "ALSO TODAY", 2, RED);
y += 28;
const alsoColW = Math.floor((CONTENT_W - 32) / 2);
const ALSO_ROW_H = 48;
for (let i = 0; i < ALSO.length; i++) {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const x = MARGIN + col * (alsoColW + 32);
  const yy = y + row * ALSO_ROW_H;
  rect(x, yy + 3, 8, 8, RED);
  const itemLines = wrap(ALSO[i], alsoColW - 16, 2);
  drawLines(x + 16, yy, itemLines, 2, INK, 5);
}
y += 3 * ALSO_ROW_H + 10;
hline(MARGIN, y, CONTENT_W, 1, GREY);
y += 12;

// Footer.
drawTextCentered(W / 2, y, "26 NOVEMBER 2026 - SOURCES: REUTERS, SIMPLELIFE, EUR RADIO, JUST SECURITY", 2, GREY);

// Write the image.
mkdirSync(OUT_DIR, { recursive: true });
const png = encodePNG();
writeFileSync(OUT_FILE, png);
console.log(`wrote ${OUT_FILE} (${png.length} bytes, ${W}x${H})`);
