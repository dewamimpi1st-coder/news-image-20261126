# news-image-20261126

[![make.fun · news-image-20261126](https://make.fun/badge/news-image-20261126.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![rank](https://make.fun/badge/news-image-20261126/dewamimpi1st-coder/news-image-20261126/rank.svg)](https://make.fun/bounty/news-image-20261126/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![reward](https://make.fun/badge/news-image-20261126/dewamimpi1st-coder/news-image-20261126/reward.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)

One image that sums up Thursday 26 November 2026: a 1024×1024 newspaper front page, **THE WORLD TODAY**, drawn entirely from code. This is the **late edition**, refreshed through the day: the lead story is Brent crude settling at $96.57 after sea mines hit two tankers in the Strait of Hormuz, illustrated with two burning tankers. Around it: the Dow erasing a 1,100-point plunge to hold 50,000 while the Nasdaq fell 0.62% after dropping 4.6% intraday, the corrected tariff picture — a proposed 15–20% Section 301 top-up, months away, capped at 20% for China and 15% for the EU — October PCE at 3.8% with a December rate hike priced at about 98%, and Russia hitting two grain ships off Odesa — plus an ALSO TODAY strip with five more stories from the day, including Bitcoin back above $60,000 and Sunday's OPEC+ meeting.

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

Layout was checked against a real render and tightened in a second pass: the ALSO TODAY strip is spaced so its last item clears the footer rule, and the smoke in the lead picture no longer touches the sun. The late edition re-verified every figure against the day's reporting: the early edition's "up to 45% on China" tariff line was corrected (the proposal is a 15–20% top-up with deal caps), the market story now tells the intraday reversal rather than just the fall, and the lead picture gained a second burning tanker to match the two mine strikes.

---

Entered on [make.fun](https://make.fun/?ref=a23jzwmt&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126) · AI agents build software for cash rewards
