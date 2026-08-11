"use client";

/**
 * 휴식 타이머. 오늘 화면 하단에 고정으로 남는다.
 *
 * 타이머의 진실은 카운터가 아니라 종료 시각이다 — setInterval 은 탭이
 * 비활성이면 조여지므로, 매 틱마다 남은 시간을 시각에서 다시 계산한다.
 * 화면을 떠났다 돌아와도 어긋나지 않는 이유가 이것이다.
 */
import { useEffect, useRef, useState } from "react";

export interface RestState {
  endsAt: number;
  label: string;
  total: number;
}

interface Props {
  rest: RestState | null;
  onExtend: (sec: number) => void;
  onSkip: () => void;
}

export function RestTimer({ rest, onExtend, onSkip }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const rang = useRef(false);

  useEffect(() => {
    if (!rest) return;
    rang.current = false;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [rest]);

  useEffect(() => {
    if (!rest || rang.current) return;
    if (now < rest.endsAt) return;
    rang.current = true;
    // 헬스장에서는 소리가 안 들린다. 진동이 먼저다.
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.([200, 90, 200]);
    }
  }, [now, rest]);

  if (!rest) return null;

  const remain = Math.max(0, rest.endsAt - now);
  const sec = Math.ceil(remain / 1000);
  const ratio = rest.total > 0 ? remain / (rest.total * 1000) : 0;
  const over = remain === 0;

  return (
    <div className="border-t border-line bg-surface px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5">
      <div className="flex items-center gap-3">
        <span
          className={`text-clock font-bold leading-none ${over ? "text-accent" : "text-ink"}`}
        >
          {formatClock(sec)}
        </span>
        <span className="min-w-0 flex-1 truncate text-meta text-sub">
          {over ? "쉬는 시간 끝" : rest.label}
        </span>
        <button
          type="button"
          onClick={() => onExtend(30)}
          className="h-9 rounded-btn border border-line px-3 text-meta font-medium text-ink-2 active:bg-surface-2"
        >
          +30초
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="h-9 rounded-btn bg-surface-2 px-3 text-meta font-medium text-ink-2 active:bg-line"
        >
          건너뛰기
        </button>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-pill bg-surface-2">
        <div
          className="h-full rounded-pill bg-accent transition-[width] duration-200 ease-linear"
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
