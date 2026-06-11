# Tennis Majors Print Series

SportsChord design tool for the Open Era grand-slam print series — every final from 1968 to 2025 across the Australian Open, French Open, Wimbledon, and US Open, in both men's and women's singles. Replaces the original Illustrator workflow so the series can be re-issued each season without a designer.

**Live:** https://tennis-majors.vercel.app

## Views

| Tab | What it shows |
|---|---|
| Poster | The A1 print — one circle per final, with repeat-champion indicators |
| The Series | All 8 posters (4 majors × 2 divisions) on one wall |
| Era Dominance | Symmetric streamgraph of the top 10 champions, 5-year rolling mean |
| Career Slams | Players with 3+ titles — year dots per major |
| Fingerprints | Radial set-score plot per tournament |
| Nations | Stacked area of titles by nation |

## Export

The Export menu serializes the live SVG with the Montserrat variable font embedded (base64 WOFF2 in an inline `@font-face`), so output renders identically to screen:

- **PNG · Print** — scale 6 = 7128×10104px, clears A1 at 300 DPI for Prodigi fine-art prints
- **PNG · Preview** — scale 3, for proofs and mockups
- **SVG · Vector** — fonts embedded, for design iteration

Every configuration is encoded in the URL (`?viz=poster&tourn=WB&div=women&…`) — **Copy link** shares the exact state.

## Print pipeline (SportsChord production flow)

`/print?<same params>` renders the selected artwork chrome-free and flips `#print-page[data-ready="true"]` once fonts load — the capture contract for the planned server-side Puppeteer pipeline (ported from f1app) that will render → upload to Google Drive → feed the prints-orchestrator's Etsy/Shopify listing flow. See [ACTION_ITEMS.md](ACTION_ITEMS.md).

## Development

```bash
npm run dev    # dev server (Turbopack)
npm run build  # production build
npm run test   # vitest
```

Data lives in `src/lib/data.ts` — add a season by appending one row per tournament/division.
