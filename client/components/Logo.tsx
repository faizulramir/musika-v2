export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="2" y="9" width="3" height="6" rx="1.5" fill="#22d3ee" />
        <rect x="7" y="5" width="3" height="14" rx="1.5" fill="#ff2d95" />
        <rect x="12" y="8" width="3" height="8" rx="1.5" fill="#8b5cf6" />
        <rect x="17" y="3" width="3" height="18" rx="1.5" fill="#a3e635" />
      </svg>
      <span
        className="font-extrabold tracking-tight"
        style={{ fontSize: size * 0.95 }}
      >
        Musika
      </span>
    </span>
  );
}
