"use client";

import { useCallback } from "react";

interface Props {
  svgRef: React.RefObject<SVGSVGElement | null>;
  filename?: string;
}

export function ExportButton({ svgRef, filename = "tennis-print" }: Props) {
  const handleExport = useCallback(async () => {
    const svg = svgRef.current;
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const viewBox = svg.getAttribute("viewBox")?.split(" ").map(Number) || [0, 0, 800, 600];
    const w = viewBox[2];
    const h = viewBox[3];
    const px = 3;

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("SVG load failed"));
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
    });

    const canvas = document.createElement("canvas");
    canvas.width = w * px;
    canvas.height = h * px;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, w * px, h * px);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${filename}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  }, [svgRef, filename]);

  return (
    <button
      onClick={handleExport}
      className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-white/70 hover:text-white transition-colors tracking-wide"
    >
      Download PNG
    </button>
  );
}
