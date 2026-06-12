"use client";

/**
 * Shared sphere shading for every tennis ball: a colour-agnostic overlay
 * (white highlight top-left fading to a dark rim) so one def serves all
 * tournament ball colours. Rendered once per <svg>; duplicate ids across
 * sibling svgs resolve to identical definitions, so rendering is stable.
 */
export function BallSheenDefs() {
  return (
    <defs>
      <radialGradient id="ball-sheen" cx="0.36" cy="0.3" r="0.85">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
        <stop offset="42%" stopColor="#fff" stopOpacity="0.1" />
        <stop offset="72%" stopColor="#000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.22" />
      </radialGradient>
    </defs>
  );
}

/**
 * A tennis ball drawn at the origin. Seams are arcs of circles centred just
 * outside the ball (centre ±1.2r, arc radius 1.05r — endpoints on the
 * silhouette at x=±0.557r, y=±0.83r), rotated for a natural diagonal. The
 * endpoints are pulled inside the silhouette by the stroke's cap radius so
 * the white lines never paint past the ball's edge.
 */
export function BallDot({ r, color, seamOpacity = 0.92 }: { r: number; color: string; seamOpacity?: number }) {
  const seam = Math.max(0.8, r * 0.16);
  const k = (r - seam * 0.9) / r;
  const ex = 0.557 * r * k;
  const ey = 0.83 * r * k;
  const ar = 1.05 * r * k;
  return (
    <g>
      <circle r={r} fill={color} />
      <circle r={r} fill="url(#ball-sheen)" />
      <g transform="rotate(-18)" stroke={`rgba(255,255,255,${seamOpacity})`} strokeWidth={seam} fill="none" strokeLinecap="round">
        <path d={`M ${ex} ${-ey} A ${ar} ${ar} 0 0 0 ${ex} ${ey}`} />
        <path d={`M ${-ex} ${-ey} A ${ar} ${ar} 0 0 1 ${-ex} ${ey}`} />
      </g>
      <circle r={r} fill="none" stroke="rgba(0,0,0,0.16)" strokeWidth={Math.max(0.5, r * 0.08)} />
    </g>
  );
}

export function TennisBall({ size = 18, color = "#D6DD30" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true">
      <BallSheenDefs />
      <BallDot r={11} color={color} />
    </svg>
  );
}

export function BallCurl({
  count,
  radius,
  color,
  placement,
}: {
  count: number;
  radius: number;
  color: string;
  placement: "overlap" | "float" | "trail";
}) {
  if (count <= 0) return null;
  // Overlap: balls bite into the circle's edge (a crown resting on the
  // head). Float: balls hover just off it with a visible sliver of field.
  // Trail: floats too, but winds up from beside the nationality code.
  const ballR = placement === "overlap" ? 5.8 : 5.4;
  const orbit = placement === "overlap" ? radius + 1.5 : radius + 8;
  const stepDeg = 15;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        // Trail: start just clear of the nationality code (bottom right,
        // +50°) and wind counter-clockwise up the right shoulder — the
        // original 2023 series arrangement. Crown: first ball at 12
        // o'clock, the rest spilling out symmetrically in 15° steps.
        const deg =
          placement === "trail"
            ? 50 - i * stepDeg
            : -90 + Math.ceil(i / 2) * (i % 2 === 1 ? 1 : -1) * stepDeg;
        const a = (deg * Math.PI) / 180;
        const x = Math.cos(a) * orbit;
        const y = Math.sin(a) * orbit;
        return (
          <g key={i} transform={`translate(${x},${y})`}>
            <BallDot r={ballR} color={color} />
          </g>
        );
      })}
    </g>
  );
}

/**
 * Total-titles badge: a numbered tennis ball perched on the circle's
 * top-right shoulder — real balls carry printed numbers, so the count
 * reads as part of the object rather than a UI sticker.
 */
export function CountBadge({ count, radius, ballColor, ink }: { count: number; radius: number; ballColor: string; ink: string }) {
  if (count <= 0) return null;
  const r = Math.max(11, radius * 0.26);
  const label = `×${count + 1}`;
  const fs = r * (label.length > 2 ? 0.72 : 0.95);
  return (
    <g transform={`translate(${radius * 0.76}, ${-radius * 0.76})`}>
      <BallDot r={r} color={ballColor} seamOpacity={0.45} />
      <text textAnchor="middle" y={fs * 0.34} fontFamily="Montserrat" fontWeight="800" fontSize={fs} fill={ink}>
        {label}
      </text>
    </g>
  );
}

export function DotRing({ count, radius }: { count: number; radius: number }) {
  if (count <= 0) return null;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const a = ((-90 + (360 / Math.max(count, 12)) * i) * Math.PI) / 180;
        const x = Math.cos(a) * (radius - 6);
        const y = Math.sin(a) * (radius - 6);
        return <circle key={i} cx={x} cy={y} r="2.4" fill="rgba(255,255,255,0.85)" />;
      })}
    </g>
  );
}
