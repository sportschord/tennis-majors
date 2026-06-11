import { NextRequest } from "next/server";
import type { TournamentKey, Division, TweakState } from "@/lib/types";
import { isAuthorizedPrintRequest, UNAUTHORIZED_PRINT_BODY } from "@/lib/print/auth";
import { buildDesignFolderName, type PrintRenderOptions, type PrintFormat } from "@/lib/print/options";
import { launchBrowser, renderPrintOnPage, getBaseUrl } from "@/lib/print/render.server";
import { uploadPrintToDrive, type DriveUploadResult } from "@/lib/print/drive.server";
import {
  buildIntakeAsset,
  getProdigiConfig,
  triggerProdigiIntake,
  waitForProdigiIntake,
  type ProdigiIntakeAsset,
} from "@/lib/print/prodigi.server";
import { DEFAULT_TWEAKS } from "@/lib/url-state";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ROUTE = "/api/generate-print/batch";
const MAX_BATCH_COMBINATIONS = 4;

interface BatchCombination {
  tournament: TournamentKey;
  division: Division;
  clientKey?: string;
}

interface BatchBody {
  combinations?: BatchCombination[];
  settings?: Partial<TweakState>;
  /** Formats uploaded per design — default both masters. */
  formats?: PrintFormat[];
}

function logBatch(level: "info" | "error", payload: Record<string, unknown>): void {
  const logger = level === "error" ? console.error : console.log;
  logger(JSON.stringify({ level, route: ROUTE, ...payload }));
}

/**
 * POST /api/generate-print/batch — SSE stream of per-file progress.
 * Renders serially in ONE browser session (ported from f1app's batch
 * route) to avoid spawning parallel Chromium instances on Vercel.
 * Each combination uploads its formats (A.pdf master + A.png) into the
 * prodigi intake tree.
 */
export async function POST(request: NextRequest): Promise<Response> {
  if (!isAuthorizedPrintRequest(request)) {
    return new Response(JSON.stringify(UNAUTHORIZED_PRINT_BODY), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const startedAt = Date.now();
  let body: BatchBody = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const combinations = Array.isArray(body.combinations) ? body.combinations : [];
  const formats: PrintFormat[] =
    Array.isArray(body.formats) && body.formats.length
      ? body.formats.filter((f): f is PrintFormat => f === "pdf" || f === "png")
      : ["pdf", "png"];

  if (combinations.length > MAX_BATCH_COMBINATIONS) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Batch too large",
        message: `Batch requests support at most ${MAX_BATCH_COMBINATIONS} combinations; received ${combinations.length}.`,
      }),
      { status: 413, headers: { "Content-Type": "application/json" } }
    );
  }

  const baseUrl = getBaseUrl(request);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null;

      function send(event: Record<string, unknown>): void {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // client disconnected — keep rendering so the uploads complete
        }
      }

      send({ type: "start", total: combinations.length * formats.length });
      logBatch("info", { msg: "batch_start", batchSize: combinations.length, formats });

      if (combinations.length === 0) {
        send({ type: "complete" });
        controller.close();
        return;
      }

      try {
        browser = await launchBrowser();
        const page = await browser.newPage();
        let lastDestination: Record<string, unknown> | null = null;
        const uploadedAssets: ProdigiIntakeAsset[] = [];

        for (const combo of combinations) {
          const tweaks: TweakState = {
            ...DEFAULT_TWEAKS,
            ...body.settings,
            tournament: combo.tournament,
            division: combo.division,
          };
          const designName = buildDesignFolderName({
            viz: "poster",
            tweaks,
            format: "pdf",
            dpi: 300,
            uploadTarget: "drive",
          });

          for (const format of formats) {
            const itemStartedAt = Date.now();
            const options: PrintRenderOptions = {
              viz: "poster",
              tweaks,
              format,
              dpi: 300,
              uploadTarget: "drive",
            };
            const key = `${combo.clientKey || `${combo.tournament}-${combo.division}`}-${format}`;
            const label = `${designName} · A.${format}`;

            send({ type: "item", key, fileName: label, status: "active" });

            try {
              const rendered = await renderPrintOnPage(page, baseUrl, options);
              const driveFile: DriveUploadResult = await uploadPrintToDrive(rendered);
              uploadedAssets.push(buildIntakeAsset(designName, `A.${format}`, driveFile.id));
              lastDestination = {
                folderId: driveFile.folderId,
                folderPath: driveFile.folderPath,
                folderLink: `https://drive.google.com/drive/folders/${driveFile.folderId}`,
                rootFolderId: driveFile.rootFolderId,
              };
              send({
                type: "item",
                key,
                fileName: label,
                status: "done",
                overwritten: driveFile.overwritten,
                driveId: driveFile.id,
                driveLink: driveFile.webViewLink,
                folderId: driveFile.folderId,
              });
              logBatch("info", {
                msg: "item_done",
                designName,
                format,
                overwritten: driveFile.overwritten,
                ms: Date.now() - itemStartedAt,
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : "Unknown error";
              send({ type: "item", key, fileName: label, status: "error", error: message });
              logBatch("error", { msg: "item_fail", designName, format, error: message });
            }
          }
        }

        // Register the uploaded assets with the prints-orchestrator so they
        // appear as catalog designs without a manual Drive scan. Opt-in:
        // without ORCHESTRATOR_API_TOKEN this degrades to a "skipped" notice.
        if (uploadedAssets.length > 0) {
          const prodigi = getProdigiConfig();
          if (!prodigi) {
            send({
              type: "intake",
              status: "skipped",
              message: "Orchestrator intake skipped (no ORCHESTRATOR_API_TOKEN) — scan the Drive folder from the Designs page.",
            });
          } else {
            try {
              send({ type: "intake", status: "active", message: `Registering ${uploadedAssets.length} assets with the prints-orchestrator…` });
              const job = await triggerProdigiIntake(prodigi, uploadedAssets);
              const settled = await waitForProdigiIntake(prodigi, job.id);
              if (settled?.status === "completed") {
                send({ type: "intake", status: "done", message: "Designs registered in the prints-orchestrator.", jobId: job.id });
              } else if (settled?.status === "failed" || settled?.status === "cancelled") {
                send({ type: "intake", status: "error", message: settled.errorMessage || `Orchestrator import ${settled.status}.`, jobId: job.id });
              } else {
                send({
                  type: "intake",
                  status: "done",
                  message: `Import still running in the orchestrator (job ${job.id}) — it finishes in the background.`,
                  jobId: job.id,
                });
              }
              logBatch("info", { msg: "intake_done", jobId: job.id, status: settled?.status ?? "running" });
            } catch (err) {
              const message = err instanceof Error ? err.message : "Unknown error";
              send({ type: "intake", status: "error", message: `Orchestrator intake failed: ${message}` });
              logBatch("error", { msg: "intake_fail", error: message });
            }
          }
        }

        send({ type: "complete", drive: lastDestination });
        logBatch("info", { msg: "batch_done", batchSize: combinations.length, ms: Date.now() - startedAt });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        send({ type: "error", error: message });
        logBatch("error", { msg: "batch_fail", error: message, ms: Date.now() - startedAt });
      } finally {
        if (browser) {
          try {
            await browser.close();
          } catch {
            // ignore
          }
        }
        try {
          controller.close();
        } catch {
          // ignore
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
