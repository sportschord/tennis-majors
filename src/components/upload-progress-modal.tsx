"use client";

import { createPortal } from "react-dom";

export interface BatchItem {
  key: string;
  fileName: string;
  status: "pending" | "active" | "done" | "error";
  overwritten?: boolean;
  driveLink?: string | null;
  error?: string;
}

export interface BatchDestination {
  folderLink: string;
  folderPath: string[];
  folderId: string;
}

interface Props {
  open: boolean;
  running: boolean;
  items: BatchItem[];
  logs: string[];
  destination: BatchDestination | null;
  error: string | null;
  onClose: () => void;
}

function StatusIcon({ status }: { status: BatchItem["status"] }) {
  if (status === "active")
    return <span className="inline-block w-3 h-3 rounded-full border-2 border-white/25 border-t-white animate-spin" />;
  if (status === "done") return <span className="text-emerald-400 text-[11px]">✓</span>;
  if (status === "error") return <span className="text-red-400 text-[11px]">✗</span>;
  return <span className="inline-block w-2 h-2 rounded-full bg-white/20" />;
}

/** Progress modal for the batch Drive export (lean port of f1app's UploadProgressModal). */
export function UploadProgressModal({ open, running, items, logs, destination, error, onClose }: Props) {
  if (!open) return null;

  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error").length;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={running ? undefined : onClose} />
      <div className="glass-panel relative w-full max-w-md rounded-xl p-5 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] font-bold tracking-[0.2em] text-white/45 uppercase">Export series</div>
            <div className="text-[13px] font-semibold text-white">
              {running ? `Rendering & uploading… ${done}/${items.length}` : failed ? `Finished with ${failed} error${failed === 1 ? "" : "s"}` : "Series uploaded to Google Drive"}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={running}
            aria-label="Close export progress"
            className="text-white/50 hover:text-white text-lg leading-none disabled:opacity-30"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {items.map((item) => (
            <div key={item.key} className="flex items-center gap-2.5 py-1.5 border-b border-white/5 last:border-0">
              <StatusIcon status={item.status} />
              <span className={`flex-1 text-[11px] truncate ${item.status === "error" ? "text-red-300" : "text-white/75"}`}>
                {item.fileName}
                {item.overwritten ? " · updated" : ""}
              </span>
              {item.driveLink && (
                <a
                  href={item.driveLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-semibold text-brand hover:underline"
                >
                  View
                </a>
              )}
              {item.error && <span className="text-[10px] text-red-300 max-w-[40%] truncate">{item.error}</span>}
            </div>
          ))}
        </div>

        {error && <div className="mt-3 text-[11px] text-red-300">{error}</div>}

        {logs.length > 0 && (
          <div className="mt-3 text-[10px] text-white/35 font-mono truncate">{logs[logs.length - 1]}</div>
        )}

        {destination && !running && (
          <a
            href={destination.folderLink}
            target="_blank"
            rel="noreferrer"
            className="interactive-lift mt-3 block text-center px-3 py-2 rounded-md accent-active text-[11px] font-semibold"
          >
            Open “{destination.folderPath.join(" / ")}” in Drive
          </a>
        )}
      </div>
    </div>,
    document.body
  );
}
