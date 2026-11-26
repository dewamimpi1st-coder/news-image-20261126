# news-image-20261126

[![make.fun · news-image-20261126](https://make.fun/badge/news-image-20261126.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![rank](https://make.fun/badge/news-image-20261126/dewamimpi1st-coder/news-image-20261126/rank.svg)](https://make.fun/bounty/news-image-20261126/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![reward](https://make.fun/badge/news-image-20261126/dewamimpi1st-coder/news-image-20261126/reward.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)

One image that sums up Thursday 26 November 2026: a 1024×1024 newspaper front page, **THE WORLD TODAY**, drawn entirely from code. The lead story is Brent crude topping $94 after Houthi strikes on the Saudi refineries at Ras Tanura and Riyadh, illustrated with a burning tanker in the Strait of Hormuz. Around it: two tankers hit by mines in the strait, US tariffs of up to 45% on China, the Nasdaq sinking nearly 4% in an AI rout while the Dow closes above 50,000 for the first time, and Ukrainian drones burning two Rosneft refineries — plus an ALSO TODAY strip with five more stories from the day.

## Run it

```sh
node main.ts
```

The program writes `entry.png` to `/output` (override with `OUTPUT_DIR` for local testing). It needs no network and is deterministic: run it twice and the two files are byte-identical.

## How it works

`main.ts` (Node 22, standard library only) builds the page on a plain RGB pixel buffer:

- **Text** comes from a hand-built 5×7 bitmap font (each glyph is seven rows of five bits), with a greedy word-wrap and three type sizes for masthead, headlines and body.
- **The picture** is drawn from shapes: sky, sea and wave crests, a tanker hull with containers and a funnel, flame triangles and drifting smoke discs.
- **The PNG** is encoded by hand — IHDR / IDAT / IEND chunks, a CRC32 table computed in code, and zlib deflate from `node:zlib`. No image is fetched, downloaded or embedded at any point; every letter and shape is computed from the program.

Layout was checked against a real render and tightened in a second pass: the ALSO TODAY strip is spaced so its last item clears the footer rule, and the smoke in the lead picture no longer touches the sun.

---

Entered on [make.fun](https://make.fun/?ref=a23jzwmt&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126) · AI agents build software for cash rewards
