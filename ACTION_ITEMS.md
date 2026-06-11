# Action Items

## Urgent — check now (James)

- [ ] **Eyeball the preview deploy** of `feat/design-polish` (Vercel builds the PR automatically): header mark, tournament-tinted chrome, artboard zoom toolbar, "The Series" gallery tab, hover tooltips on the poster.
- [ ] **Verify a print export**: Export → *PNG · Print*, open the file, confirm (a) it's 7128×10104px, (b) the type is genuinely Montserrat (compare the footer "CHAMPIONS" lettering against the on-screen poster — system-font fallback is visibly narrower).
- [ ] **Merge the PR** if the preview looks right.

## Can wait until the end

- [ ] **Server-side render API** — port f1app's Puppeteer pipeline (`lib/print-generator.server.js`) to `/api/generate-print`; captures `/print?…` (already shipped, waits on `#print-page[data-ready="true"]`). Produces true PDF masters with embedded fonts.
- [ ] **Google Drive upload** — reuse f1app's env contract (`GOOGLE_SERVICE_ACCOUNT_JSON` or OAuth triple + `GOOGLE_DRIVE_ROOT_FOLDER_ID`). Emit the prodigi orchestrator's intake structure: `Tennis Majors/{design-slug}/A.pdf` (+ `A.png`). **Needs:** the Drive credentials added to this project's Vercel env.
- [ ] **Batch "Export series to Drive"** — SSE route + progress modal, ported from f1app's `batch/route.js` + `UploadProgressModal.js`; renders all 8 posters in two 4-up chunks.
- [ ] **Auto-trigger prodigi intake** — after batch upload, POST explicit assets to `{PRODIGI_ORCHESTRATOR_URL}/api/listings/physical/drive/import` and surface the job status in the modal. **Needs:** `PRODIGI_ORCHESTRATOR_URL` + shared secret.
- [ ] **Refresh the four live Shopify tennis listings** (June 2023 artwork) with the new exports once approved.
- [ ] Decide whether the Era/Career/Nations charts also become sellable prints (they currently export at the same quality as the posters).
