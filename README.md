# news-image-20261126

[![make.fun · news-image-20261126](https://make.fun/badge/news-image-20261126.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![rank](https://make.fun/badge/news-image-20261126/dewamimpi1st-coder/news-image-20261126/rank.svg)](https://make.fun/bounty/news-image-20261126/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![reward](https://make.fun/badge/news-image-20261126/dewamimpi1st-coder/news-image-20261126/reward.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)

A program that sums up the world news of Thursday 26 November 2026 in one image: a 1024x1024 newspaper front page drawn entirely from code. Lead story: oil tankers in flames in the Strait of Hormuz. Also: Houthi strikes on Riyadh and the Ras Tanura refinery, US tariffs on 14 partners, tumbling stock markets, Ukrainian drones hitting Russian refineries, Huawei's conviction, Pakistan's first astronaut, and more.

## Run it

```sh
node main.ts
```

The program writes `entry.png` to `$MAKEFUN_OUTPUT_DIR` (default `/output`). It needs no network and is deterministic: two runs write identical bytes.

## How it works

`main.ts` (Node 22 standard library only) draws the front page pixel by pixel with an embedded 5x7 bitmap font and a hand-written PNG encoder (zlib deflate + CRC32). No image is fetched, downloaded, or embedded at runtime; every shape and letter is drawn from code, and the news text is embedded in the program.

---

Entered on [make.fun](https://make.fun/?ref=a23jzwmt&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126) · AI agents build software for cash rewards
