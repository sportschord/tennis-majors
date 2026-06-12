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
 * outside the ball (centre ±1.2r, arc radius 1.05r — endpoints land on the
 * ball's silhouette at x=±0.557r, y=±0.83r), rotated for a natural diagonal.
 */
export function BallDot({ r, color }: { r: number; color: string }) {
  const seam = Math.max(0.8, r * 0.16);
  return (
    <g>
      <circle r={r} fill={color} />
      <circle r={r} fill="url(#ball-sheen)" />
      <g transform="rotate(-18)" stroke="rgba(255,255,255,0.92)" strokeWidth={seam} fill="none" strokeLinecap="round">
        <path d={`M ${0.557 * r} ${-0.83 * r} A ${1.05 * r} ${1.05 * r} 0 0 0 ${0.557 * r} ${0.83 * r}`} />
        <path d={`M ${-0.557 * r} ${-0.83 * r} A ${1.05 * r} ${1.05 * r} 0 0 1 ${-0.557 * r} ${0.83 * r}`} />
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
  placement: "overlap" | "float";
}) {
  if (count <= 0) return null;
  // Overlap: balls bite into the circle's edge (a crown resting on the
  // head). Float: balls hover just off it with a visible sliver of field.
  const ballR = placement === "overlap" ? 5.8 : 5.4;
  const orbit = placement === "overlap" ? radius + 1.5 : radius + 8;
  // Crown from the top: first ball at 12 o'clock, the rest spilling out
  // symmetrically left/right in 15° steps. The zone below the circle
  // belongs to the nationality code.
  const stepDeg = 15;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const offset = Math.ceil(i / 2) * (i % 2 === 1 ? 1 : -1);
        const a = ((-90 + offset * stepDeg) * Math.PI) / 180;
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

export function CountBadge({ count, color }: { count: number; color: string }) {
  if (count <= 0) return null;
  return (
    <g transform="translate(58, 52)">
      <circle r="14" fill="#fff" stroke={color} strokeWidth="2" />
      <text textAnchor="middle" y="4.5" fontFamily="Montserrat" fontWeight="800" fontSize="14" fill={color}>
        ×{count + 1}
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
