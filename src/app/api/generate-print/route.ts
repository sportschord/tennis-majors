import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedPrintRequest, UNAUTHORIZED_PRINT_BODY } from "@/lib/print/auth";
import { parsePrintOptions } from "@/lib/print/options";
import { renderPrintSnapshot } from "@/lib/print/render.server";
import { uploadPrintToDrive } from "@/lib/print/drive.server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** GET /api/generate-print?viz=poster&tourn=WB&div=women&…&format=pdf — returns the file. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedPrintRequest(request)) {
    return NextResponse.json(UNAUTHORIZED_PRINT_BODY, { status: 401 });
  }

  const options = parsePrintOptions(request.nextUrl.searchParams);

  try {
    const rendered = await renderPrintSnapshot(request, options);
    return new NextResponse(Buffer.from(rendered.output), {
      headers: {
        "Content-Type": rendered.contentType,
        "Content-Disposition": `attachment; filename="${rendered.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(JSON.stringify({ level: "error", route: "/api/generate-print", message }));
    return NextResponse.json(
      { error: "Failed to generate print", message },
      { status: message.includes("not available") ? 501 : 500 }
    );
  }
}

/** POST with uploadTarget=drive renders then uploads into the prodigi intake tree. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedPrintRequest(request)) {
    return NextResponse.json(UNAUTHORIZED_PRINT_BODY, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)]))
  );
  const options = parsePrintOptions(params);

  try {
    const rendered = await renderPrintSnapshot(request, options);

    if (options.uploadTarget === "drive") {
      const driveFile = await uploadPrintToDrive(rendered);
      return NextResponse.json({
        ok: true,
        message: `Uploaded ${driveFile.folderPath.join("/")}/${driveFile.name} to Google Drive`,
        fileName: rendered.fileName,
        drive: driveFile,
      });
    }

    return NextResponse.json({
      ok: true,
      message: `${rendered.fileName} rendered successfully`,
      fileName: rendered.fileName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(JSON.stringify({ level: "error", route: "/api/generate-print", message }));
    return NextResponse.json(
      { error: "Failed to generate print", message },
      {
        status: message.includes("not available") || message.includes("not configured") ? 501 : 500,
      }
    );
  }
}
