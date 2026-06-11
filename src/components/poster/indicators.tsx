"use client";

export function TennisBall({ size = 18, color = "#D6DD30" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill={color} />
      <path d="M2 8 Q12 12 22 8" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M2 16 Q12 12 22 16" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function BallCurl({ count, radius, color }: { count: number; radius: number; color: string }) {
  if (count <= 0) return null;
  const r = radius + 8;
  // Curl UP the right shoulder and over the top (negative = counter-clockwise
  // in SVG): the zone below the circle belongs to the nationality code.
  const startDeg = -12;
  const stepDeg = -15;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const a = ((startDeg + i * stepDeg) * Math.PI) / 180;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        return (
          <g key={i} transform={`translate(${x},${y})`}>
            <circle r="6.5" fill={color} />
            <path d="M-6 -2 Q0 1.5 6 -2" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.9" strokeLinecap="round" />
            <path d="M-6 2 Q0 -1.5 6 2" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.9" strokeLinecap="round" />
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
