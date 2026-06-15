import { Readable } from "node:stream";
import { google, type drive_v3 } from "googleapis";
import { buildDesignFolderName, CATEGORY_FOLDER, masterFileName, SECTION_FOLDER, type PrintRenderOptions } from "./options";
import type { RenderedPrint } from "./render.server";

/**
 * Google Drive upload, ported from f1app's lib/print-generator.server.js
 * and emitting the prints-orchestrator's intake structure instead of
 * f1app's flat naming:
 *
 *   {GOOGLE_DRIVE_FOLDER_ID = Import Drive}/Tennis/Tennis Majors/{design name}/A.pdf|A.png
 *
 * The "A" file stem is what the orchestrator's aspect-ratio detection
 * expects for A-series prints; the design folder name becomes the
 * globally-unique design name on ingest.
 */

interface OAuthConfig {
  authType: "oauth2";
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  rootFolderId: string;
}

interface ServiceAccountConfig {
  authType: "serviceAccount";
  clientEmail: string;
  privateKey: string;
  rootFolderId: string;
}

export type DriveConfig = OAuthConfig | ServiceAccountConfig;

export function getGoogleDriveConfig(): DriveConfig | null {
  const rootFolderId = (
    process.env.GOOGLE_DRIVE_FOLDER_ID ||
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ||
    ""
  ).trim();

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim();
  if (clientId && clientSecret && refreshToken && rootFolderId) {
    return { authType: "oauth2", clientId, clientSecret, refreshToken, rootFolderId };
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON.trim();
      const jsonStr = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf-8");
      const sa = JSON.parse(jsonStr);
      if (sa.client_email && sa.private_key && rootFolderId) {
        return {
          authType: "serviceAccount",
          clientEmail: sa.client_email,
          privateKey: sa.private_key,
          rootFolderId,
        };
      }
    } catch {
      console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON");
    }
  }

  return null;
}

function getDriveClient(config: DriveConfig): drive_v3.Drive {
  if (config.authType === "oauth2") {
    const oauth2 = new google.auth.OAuth2(config.clientId, config.clientSecret);
    oauth2.setCredentials({ refresh_token: config.refreshToken });
    return google.drive({ version: "v3", auth: oauth2 });
  }
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: "service_account",
      client_email: config.clientEmail,
      private_key: config.privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

async function ensureDriveFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId: string
): Promise<string> {
  const escapedName = name.replace(/'/g, "\\'");
  const existing = await drive.files.list({
    q: [
      `name = '${escapedName}'`,
      "mimeType = 'application/vnd.google-apps.folder'",
      "trashed = false",
      `'${parentId}' in parents`,
    ].join(" and "),
    fields: "files(id, name)",
    pageSize: 1,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  if (existing.data.files?.length) return existing.data.files[0].id as string;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  return created.data.id as string;
}

export interface DriveUploadResult {
  id: string;
  name: string;
  webViewLink: string | null;
  overwritten: boolean;
  folderId: string;
  folderPath: string[];
  rootFolderId: string;
}

export async function uploadPrintToDrive(rendered: RenderedPrint): Promise<DriveUploadResult> {
  const config = getGoogleDriveConfig();
  if (!config) throw new Error("Google Drive not configured.");

  const options: PrintRenderOptions = rendered.options;
  if (options.viz !== "poster") {
    throw new Error(
      "Drive uploads are reserved for the A-ratio posters; download the other visualizations directly."
    );
  }

  const drive = getDriveClient(config);
  // Full category/section/design chain so the tree matches the canonical
  // Import Drive layout (Tennis / Tennis Majors / <design>) and a manual scan
  // of the Import Drive root derives the same section as the M2M push.
  const folderPath = [CATEGORY_FOLDER, SECTION_FOLDER, buildDesignFolderName(options)];

  let parentId = config.rootFolderId;
  for (const folderName of folderPath) {
    parentId = await ensureDriveFolder(drive, folderName, parentId);
  }

  const fileName = masterFileName(options);
  const escapedFileName = fileName.replace(/'/g, "\\'");
  const existing = await drive.files.list({
    q: `name = '${escapedFileName}' and '${parentId}' in parents and trashed = false`,
    fields: "files(id, name)",
    pageSize: 1,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  const media = {
    mimeType: rendered.contentType,
    body: Readable.from(Buffer.from(rendered.output)),
  };

  let result;
  const overwritten = Boolean(existing.data.files?.length);
  if (overwritten) {
    result = await drive.files.update({
      fileId: existing.data.files![0].id as string,
      media,
      fields: "id, name, webViewLink",
      supportsAllDrives: true,
    });
  } else {
    result = await drive.files.create({
      requestBody: { name: fileName, parents: [parentId] },
      media,
      fields: "id, name, webViewLink",
      supportsAllDrives: true,
    });
  }

  return {
    id: result.data.id as string,
    name: result.data.name as string,
    webViewLink: result.data.webViewLink ?? null,
    overwritten,
    folderId: parentId,
    folderPath,
    rootFolderId: config.rootFolderId,
  };
}
