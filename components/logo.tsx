/**
 * 헬창 로고 — 아이콘과 같은 굽힌 팔. 색은 물려받으므로(currentColor)
 * 놓이는 자리에 따라 초록이 되기도, 잉크색이 되기도 한다.
 */
export function ArmMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <g stroke="currentColor" strokeWidth={17} strokeLinecap="round">
        <path d="M20 65 H55" />
        <path d="M56 64 V33" />
      </g>
      <circle cx="40" cy="50" r="13" fill="currentColor" />
      <circle cx="56" cy="28" r="11" fill="currentColor" />
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <ArmMark size={size} className="text-accent" />
      <span className="text-screen font-bold tracking-tight text-ink">헬창</span>
    </span>
  );
}
