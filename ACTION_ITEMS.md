# Action Items

## Urgent — check now (James)

- [ ] **Run “Export series to Drive”** on https://tennis-majors.vercel.app — your browser was bootstrapped with the print-auth cookie (if you use a different browser/profile, open `/api/print-auth?token=<PRINT_EXPORT_TOKEN>` there once; token is in Vercel env / `.env.local`). The modal should finish with all 16 files (8 designs × A.pdf + A.png) and “Designs registered in the prints-orchestrator.”
- [ ] **Eyeball one A.pdf at full zoom** (Drive folder is linked from the modal) before pushing any listings.
- [ ] **Check the orchestrator’s Designs page** — the 8 “… Champions (Men’s/Women’s)” designs should appear under section “Tennis Majors” without a manual scan.

## Done this session

- [x] PR #1 (design polish + print-ready exports) and PR #2 (server pipeline + prodigi intake) merged; production deployed.
- [x] Env wiring: Google Drive creds (prod+dev), `PRINT_EXPORT_TOKEN` (all envs), `ORCHESTRATOR_API_TOKEN` (Production — created **sensitive/write-only** by the M2M task, so it cannot be copied to other envs via CLI; local dev intentionally reports intake “skipped”), `PRODIGI_ORCHESTRATOR_URL` (prod+dev; preview falls back to the identical code default).

## Can wait until the end

- [ ] Watch Vercel function memory on the first production 300-DPI PNG render (7128×10104 ≈ 290MB raster buffer); drop `deviceScaleFactor` to 5 or bump instance memory if it OOMs. PDF masters are cheap and unaffected.
- [ ] **Refresh the four live Shopify tennis listings** (June 2023 artwork) with the new exports once approved.
- [ ] Decide whether Era/Career/Nations charts become sellable prints (server PDF/PNG export already works for them; Drive upload is poster-only by design — non-A aspect).
- [ ] f1app housekeeping (separate repo): production `GOOGLE_DRIVE_FOLDER_ID` and `PRINT_EXPORT_TOKEN` are empty — its prod Drive uploads are broken; also consider porting Tennis’s Puppeteer fixes (domcontentloaded + interval polling + shell headless) back to f1app’s local dev path.
