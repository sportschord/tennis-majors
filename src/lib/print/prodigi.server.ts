import { SECTION_FOLDER } from "./options";

/**
 * Machine-to-machine bridge to the prints-orchestrator
 * (~/Github/prodigi, deployed as etsy-prodigi-bridge): after a batch
 * Drive upload, register the uploaded assets as catalog designs via
 * POST /api/listings/physical/drive/import (explicit-assets form) and
 * poll the returned job until it settles.
 *
 * Auth contract (orchestrator PR #79): `Authorization: Bearer
 * <ORCHESTRATOR_API_TOKEN>`, opt-in on the orchestrator side. Here the
 * integration is equally opt-in: without the token in this project's env
 * the batch route reports intake as "skipped" and James scans the Drive
 * folder manually — nothing breaks.
 */

// Non-secret, stable deployment URL (from the orchestrator's own env);
// overridable for previews/local orchestrator runs.
const DEFAULT_ORCHESTRATOR_URL = "https://etsy-prodigi-bridge.vercel.app";

export interface ProdigiIntakeAsset {
  section: string;
  designName: string;
  filename: string;
  googleDriveFileId: string;
}

export interface ProdigiImportJob {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  errorMessage?: string | null;
}

interface ProdigiConfig {
  baseUrl: string;
  token: string;
}

export function getProdigiConfig(): ProdigiConfig | null {
  const token = process.env.ORCHESTRATOR_API_TOKEN?.trim();
  if (!token) return null;
  const baseUrl = (process.env.PRODIGI_ORCHESTRATOR_URL?.trim() || DEFAULT_ORCHESTRATOR_URL).replace(/\/+$/, "");
  return { baseUrl, token };
}

export function buildIntakeAsset(designName: string, filename: string, googleDriveFileId: string): ProdigiIntakeAsset {
  return { section: SECTION_FOLDER, designName, filename, googleDriveFileId };
}

async function prodigiFetch(config: ProdigiConfig, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
  });
}

export async function triggerProdigiIntake(
  config: ProdigiConfig,
  assets: ProdigiIntakeAsset[]
): Promise<ProdigiImportJob> {
  const res = await prodigiFetch(config, "/api/listings/physical/drive/import", {
    method: "POST",
    body: JSON.stringify({ assets }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.ok || !body?.job?.id) {
    throw new Error(body?.error || `Orchestrator intake failed (${res.status})`);
  }
  return body.job as ProdigiImportJob;
}

export async function getProdigiIntakeJob(config: ProdigiConfig, jobId: string): Promise<ProdigiImportJob> {
  const res = await prodigiFetch(config, `/api/listings/physical/drive/import?jobId=${encodeURIComponent(jobId)}`);
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.ok || !body?.job) {
    throw new Error(body?.error || `Orchestrator job poll failed (${res.status})`);
  }
  return body.job as ProdigiImportJob;
}

const SETTLED_STATUSES = new Set(["completed", "failed", "cancelled"]);

/** Poll the import job until it settles or the budget runs out. */
export async function waitForProdigiIntake(
  config: ProdigiConfig,
  jobId: string,
  { budgetMs = 50000, intervalMs = 2500 }: { budgetMs?: number; intervalMs?: number } = {}
): Promise<ProdigiImportJob | null> {
  const deadline = Date.now() + budgetMs;
  let last: ProdigiImportJob | null = null;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    last = await getProdigiIntakeJob(config, jobId);
    if (SETTLED_STATUSES.has(last.status)) return last;
  }
  return last;
}
