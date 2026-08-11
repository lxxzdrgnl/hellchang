"use client";

/**
 * 진척 그래프. 라이브러리를 쓰지 않고 SVG 를 직접 그린다 — 그래야 RN 에서
 * react-native-svg 로 그대로 옮긴다. Recharts 를 쓰면 전환 때 통째로 다시 짠다.
 *
 * 추정 1RM 은 선으로, 볼륨은 그 뒤의 막대로. 둘을 겹쳐 보면 "무게는 그대로인데
 * 총량이 늘었다" 같은 것이 한눈에 잡힌다.
 */
import { formatShort } from "@/lib/date";
import type { DayPoint } from "@/lib/progress";

interface Props {
  points: DayPoint[];
  prDates: Set<string>;
  metric: "1rm" | "volume";
}

const W = 320;
const H = 132;
const PAD = { top: 12, right: 8, bottom: 20, left: 8 };

export function ProgressChart({ points, prDates, metric }: Props) {
  if (points.length < 2) {
    return (
      <p className="flex h-[132px] items-center justify-center text-meta text-sub">
        두 번은 해야 늘었는지 보인다
      </p>
    );
  }

  const values = points.map((p) => (metric === "1rm" ? p.oneRepMax : p.volume));
  const max = Math.max(...values);
  const min = Math.min(...values);
  // 위아래를 꽉 채우면 작은 변화가 절벽처럼 보인다. 아래로 조금 여유를 둔다.
  const lo = min - (max - min) * 0.35 || 0;
  const hi = max + (max - min) * 0.12 || max * 1.1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (innerW * i) / (points.length - 1);
  const y = (v: number) => PAD.top + innerH * (1 - (v - lo) / (hi - lo || 1));

  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${x(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;
  const barW = Math.max(3, Math.min(16, innerW / points.length - 4));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="중량 추이">
      {metric === "1rm" && (
        <>
          <defs>
            <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#fade)" />
          <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        </>
      )}

      {metric === "volume" &&
        values.map((v, i) => {
          const top = y(v);
          return (
            <rect
              key={i}
              x={x(i) - barW / 2}
              y={top}
              width={barW}
              height={PAD.top + innerH - top}
              rx={2}
              fill="var(--accent)"
              opacity={0.55}
            />
          );
        })}

      {points.map((p, i) => {
        const pr = prDates.has(p.date);
        if (metric === "volume" && !pr) return null;
        return (
          <circle
            key={p.date}
            cx={x(i)}
            cy={y(values[i])}
            r={pr ? 4 : 2.6}
            fill={pr ? "var(--accent)" : "var(--bg)"}
            stroke="var(--accent)"
            strokeWidth={pr ? 0 : 2}
          />
        );
      })}

      {/* 날짜는 양 끝과 가운데만. 다 적으면 겹쳐서 아무것도 못 읽는다. */}
      {[0, Math.floor((points.length - 1) / 2), points.length - 1].map((i, k) => (
        <text
          key={k}
          x={x(i)}
          y={H - 6}
          textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}
          className="fill-[var(--sub)] text-nano"
        >
          {formatShort(points[i].date)}
        </text>
      ))}
    </svg>
  );
}
