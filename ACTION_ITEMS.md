# Action Items

## Urgent — check now (James)

- [ ] **One-time browser auth**: visit `/api/print-auth?token=<PRINT_EXPORT_TOKEN>` once per browser (token is in this project's Vercel env / `.env.local` — newly generated, not shared with f1app). Until then the server-render and Drive options return 401.
- [ ] **First live Drive upload**: Export → *Export series to Drive*. I verified render + credentials end-to-end but deliberately did not write into the shared catalog tree — your first run creates `F1/Tennis Majors/{design}/A.pdf + A.png` for all 8 posters. Eyeball one PDF at full zoom.
- [ ] **Scan the new folder in the prints-orchestrator**: Designs page → Drive scan with the "Tennis Majors" folder ID (the progress modal links the folder when the batch finishes).
- [ ] **Merge [PR #2](https://github.com/sportschord/tennis-majors/pull/2)** once the preview deploy looks right.

## Notes from the env wiring

- Drive creds (`GOOGLE_OAUTH_*`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_DRIVE_FOLDER_ID`) copied from f1app into this project's Vercel env (production + development; preview holds only the folder ID — Vercel CLI requires secrets on argv for preview adds, which I avoided).
- **f1app's `GOOGLE_DRIVE_FOLDER_ID` is EMPTY in Production** (and `PRINT_EXPORT_TOKEN` too) — f1app's production Drive uploads are currently broken; its working folder ID lives in its Development env. Worth fixing in f1app.
- The Drive root is the folder named **"F1"** — Tennis posters land under `F1/Tennis Majors/…`. Moving that subfolder elsewhere later is safe (Drive IDs survive moves).

## Can wait until the end

- [x] **Auto-trigger prodigi intake after batch upload** — DONE. The orchestrator accepts `Bearer ORCHESTRATOR_API_TOKEN` (its PR #79); the Tennis batch route now registers uploaded assets via the explicit-assets import and polls the job, with status shown in the progress modal. Works in **production** (token is in Tennis Production env, added by the M2M task). Locally it reports "skipped" — if you want local intake tests, run `vercel env add ORCHESTRATOR_API_TOKEN development` yourself and `vercel env pull .env.local --yes` (I'm intentionally not propagating credentials between environments). The orchestrator URL defaults to `https://etsy-prodigi-bridge.vercel.app` in code; `PRODIGI_ORCHESTRATOR_URL` overrides it if you ever need to.
- [ ] Watch Vercel function memory on the first production 300-DPI PNG render (7128×10104 ≈ 290MB raster buffer); drop `deviceScaleFactor` to 5 or bump instance memory if it OOMs. PDF masters are cheap and unaffected.
- [ ] **Refresh the four live Shopify tennis listings** (June 2023 artwork) with the new exports once approved.
- [ ] Decide whether Era/Career/Nations charts become sellable prints (server PDF/PNG export already works for them; Drive upload is poster-only by design — non-A aspect).
