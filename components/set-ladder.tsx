"use client";

/**
 * 세트 사다리 — 이 앱의 시그니처.
 *
 * 메모의 (80-14,100-12,120-10,140-8,160-6) 은 램핑업 사다리다. 평평한 표로
 * 늘어놓으면 그 모양이 사라진다. 그래서 각 행의 배경을 중량에 비례해 채운다 —
 * 세트를 훑기만 해도 오늘 어디까지 올라가는지가 보인다.
 *
 * 완료한 세트는 초록으로 찬다. 진행 상황을 따로 세지 않아도 눈에 들어온다.
 */
import type { WorkSet } from "@/lib/types";

interface Props {
  sets: WorkSet[];
  onToggle?: (setId: string) => void;
  onEdit?: (setId: string) => void;
  /** 프리셋 편집처럼 완료 개념이 없는 화면 */
  readOnly?: boolean;
}

export function SetLadder({ sets, onToggle, onEdit, readOnly }: Props) {
  if (sets.length === 0) {
    return <p className="px-4 py-3 text-meta text-sub">세트가 없다. 아래에서 추가한다.</p>;
  }

  // 막대 길이는 이 운동 안에서만 비교한다. 종목마다 무게 단위가 다르기 때문이다.
  const weights = sets.map((s) => s.actualWeight ?? s.plannedWeight);
  const max = Math.max(...weights, 1);
  const min = Math.min(...weights);
  // 전 세트가 같은 무게면 사다리가 아니라 벽이다. 그때는 다 채운다.
  const flat = max - min < 0.01;

  return (
    <ul className="flex flex-col gap-1">
      {sets.map((s, i) => {
        const weight = s.actualWeight ?? s.plannedWeight;
        const reps = s.actualReps ?? s.plannedReps;
        const done = s.completedAt !== null;
        const ratio = flat ? 1 : 0.34 + 0.66 * ((weight - min) / (max - min));
        const changed =
          s.actualWeight !== null &&
          (s.actualWeight !== s.plannedWeight || s.actualReps !== s.plannedReps);

        return (
          <li key={s.id} className="relative">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 rounded-btn transition-[width,background-color] duration-300"
              style={{
                width: `${ratio * 100}%`,
                backgroundColor: done ? "var(--accent-tint)" : "var(--surface-2)",
              }}
            />
            <div className="relative flex items-center gap-3 py-2 pl-3 pr-2">
              <span className="w-5 shrink-0 text-micro text-sub">{i + 1}</span>

              <button
                type="button"
                onClick={() => onEdit?.(s.id)}
                disabled={!onEdit}
                className="flex flex-1 items-baseline gap-1.5 text-left disabled:cursor-default"
              >
                <span
                  className={`text-weight font-bold ${done ? "text-accent" : "text-ink"}`}
                >
                  {formatWeight(weight)}
                </span>
                <span className="text-meta text-sub">kg</span>
                <span className="ml-1 text-body font-medium text-ink-2">{reps}</span>
                <span className="text-meta text-sub">회</span>
                {changed && (
                  <span className="ml-1 text-micro text-amber">
                    계획 {formatWeight(s.plannedWeight)}×{s.plannedReps}
                  </span>
                )}
              </button>

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onToggle?.(s.id)}
                  aria-label={done ? `${i + 1}세트 완료 취소` : `${i + 1}세트 완료`}
                  aria-pressed={done}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    done
                      ? "border-accent bg-accent text-bg"
                      : "border-line bg-surface text-sub active:border-accent"
                  }`}
                >
                  <CheckIcon />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function formatWeight(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" aria-hidden="true">
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
