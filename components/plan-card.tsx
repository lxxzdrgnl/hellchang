"use client";

/**
 * 아직 시작하지 않은 오늘의 계획.
 *
 * 운동을 이름만 나열하면 "무엇을 하는 날인지"가 안 잡힌다. 기구 그림을 같이
 * 두면 훑기만 해도 오늘 할 것이 그려진다. 세트·중량도 같이 적어, 시작 버튼을
 * 누르기 전에 오늘 몇 kg 부터 드는지 알 수 있게 한다.
 */
import { BodyMap } from "./body-map";
import { getExercise } from "@/lib/exercises";
import { formatWeight } from "./set-ladder";
import type { RoutinePreset } from "@/lib/types";

interface Props {
  preset: RoutinePreset;
  deferredFrom: string | null;
  onStart: () => void;
  onDefer: () => void;
}

export function PlanCard({ preset, deferredFrom, onStart, onDefer }: Props) {
  const totalSets = preset.exercises.reduce((a, e) => a + e.sets.length, 0);
  const minutes = estimateMinutes(preset);
  const parts = [...new Set(preset.exercises.map((e) => getExercise(e.exerciseId)?.bodyPart).filter(Boolean))];

  return (
    <article className="flex shrink-0 flex-col overflow-hidden rounded-card bg-surface">
      {deferredFrom && (
        <p className="border-l-2 border-amber bg-amber-tint px-4 py-2 text-micro font-medium text-amber">
          {deferredFrom.slice(5).replace("-", "월 ")}일에서 미룸
        </p>
      )}

      {/* 카드 어디를 눌러도 시작한다. button 으로 감싸면 안쪽 제목·목록이
          button 의 내용 모델에 어긋나 브라우저마다 다르게 파싱된다. iOS 가
          핸들러만 달린 요소의 탭을 무시하는 것은 cursor-pointer 로 풀린다. */}
      <div
        role="button"
        tabIndex={0}
        onClick={onStart}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onStart();
          }
        }}
        className="flex cursor-pointer flex-col active:bg-surface-2"
      >
      <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="truncate text-card font-bold leading-tight text-ink">{preset.name}</h2>
          <p className="text-meta text-sub">
            {preset.exercises.length}개 운동 · {totalSets}세트 · 약 {minutes}분
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {parts.map((p) => (
            <span
              key={p}
              className="rounded-pill bg-surface-2 px-2.5 py-1 text-micro font-medium text-ink-2"
            >
              {p}
            </span>
          ))}
        </div>
      </header>

      <ul className="flex flex-col">
        {preset.exercises.map((ex, i) => {
          const meta = getExercise(ex.exerciseId);
          const first = ex.sets[0];
          const top = ex.sets.reduce((m, s) => Math.max(m, s.plannedWeight), 0);
          return (
            <li
              key={ex.id}
              className="flex items-center gap-3 border-t border-line/50 px-4 py-2.5"
            >
              <BodyMap
                primary={meta?.targetMuscles ?? []}
                secondary={meta?.secondaryMuscles ?? []}
                bodyPart={meta?.bodyPart}
                size={34}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-title font-semibold text-ink">
                  {meta?.nameKo ?? ex.exerciseId}
                </span>
                <span className="truncate text-meta text-sub">
                  {ex.sets.length}세트 · {first ? `${formatWeight(first.plannedWeight)}kg` : "—"}
                  {top > (first?.plannedWeight ?? 0) && ` → ${formatWeight(top)}kg`}
                </span>
              </div>
              {i === 0 && (
                <span className="shrink-0 rounded-pill bg-accent-tint px-2.5 py-1 text-micro font-semibold text-accent">
                  주운동
                </span>
              )}
            </li>
          );
        })}
      </ul>
      </div>

      <div className="flex gap-2 p-4 pt-3">
        <button
          type="button"
          onClick={onStart}
          className="h-14 flex-1 rounded-btn bg-accent text-action font-bold text-bg transition-colors active:bg-accent-press"
        >
          운동 시작하기
        </button>
        <button
          type="button"
          onClick={onDefer}
          className="h-14 shrink-0 rounded-btn border border-line px-5 text-meta font-semibold text-ink-2 active:bg-surface-2"
        >
          내일로
        </button>
      </div>
    </article>
  );
}

/**
 * 세트당 드는 시간 + 세트 사이 휴식. 정확할 필요는 없고, 오늘 한 시간이
 * 걸릴지 두 시간이 걸릴지만 알면 된다.
 */
export function estimateMinutes(preset: { exercises: { sets: unknown[]; restSec: number }[] }): number {
  let sec = 0;
  for (const ex of preset.exercises) {
    sec += ex.sets.length * (40 + ex.restSec);
  }
  return Math.max(5, Math.round(sec / 60 / 5) * 5);
}
