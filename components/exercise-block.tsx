"use client";

/**
 * 운동 한 덩어리 — 썸네일, 이름, 역할, 세트 사다리, 편집/교체 버튼.
 * 오늘 화면과 프리셋 편집이 같은 것을 쓴다.
 */
import Link from "next/link";
import { SetLadder } from "./set-ladder";
import { BodyMap } from "./body-map";
import { getExercise } from "@/lib/exercises";
import { completedSets } from "@/lib/progress";
import type { WorkExercise } from "@/lib/types";

interface Props {
  exercise: WorkExercise;
  roleLabel: string;
  onToggleSet?: (setId: string) => void;
  onEditSets?: () => void;
  onSwap?: () => void;
  onRemove?: () => void;
  onMove?: (delta: number) => void;
  readOnly?: boolean;
}

export function ExerciseBlock({
  exercise,
  roleLabel,
  onToggleSet,
  onEditSets,
  onSwap,
  onRemove,
  onMove,
  readOnly,
}: Props) {
  const meta = getExercise(exercise.exerciseId);
  const done = completedSets(exercise.sets).length;
  const total = exercise.sets.length;

  return (
    <section className="shrink-0 rounded-card bg-surface">
      <header className="flex items-center gap-3 px-3 pb-1 pt-3">
        <Link href={`/history/${exercise.exerciseId}`} className="shrink-0">
          <BodyMap
            primary={meta?.targetMuscles ?? []}
            secondary={meta?.secondaryMuscles ?? []}
            bodyPart={meta?.bodyPart}
            size={32}
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          <Link
            href={`/history/${exercise.exerciseId}`}
            className="truncate text-title font-semibold text-ink"
          >
            {meta?.nameKo ?? exercise.exerciseId}
          </Link>
          <span className="truncate text-micro text-sub">
            {roleLabel} · {total}세트
            {!readOnly && done > 0 && <span className="text-accent"> · {done} 완료</span>}
            {meta?.targetMuscles.length ? ` · ${meta.targetMuscles.join(",")}` : ""}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {onMove && (
            <>
              <IconButton label="위로" onClick={() => onMove(-1)}>
                ↑
              </IconButton>
              <IconButton label="아래로" onClick={() => onMove(1)}>
                ↓
              </IconButton>
            </>
          )}
          {onEditSets && (
            <IconButton label="세트 편집" onClick={onEditSets}>
              <PencilIcon />
            </IconButton>
          )}
          {onSwap && (
            <IconButton label="종목 교체" onClick={onSwap}>
              <SwapIcon />
            </IconButton>
          )}
          {onRemove && (
            <IconButton label="빼기" onClick={onRemove}>
              ×
            </IconButton>
          )}
        </div>
      </header>

      <div className="px-2 pb-2.5">
        <SetLadder
          sets={exercise.sets}
          onToggle={onToggleSet}
          onEdit={onEditSets ? () => onEditSets() : undefined}
          readOnly={readOnly}
        />
      </div>
    </section>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-btn text-meta text-sub active:bg-surface-2 active:text-ink"
    >
      {children}
    </button>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" aria-hidden="true">
      <path
        d="M4 20h4L19 9l-4-4L4 16v4zM14.5 5.5l4 4"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" aria-hidden="true">
      <path
        d="M4 8h13l-3-3M20 16H7l3 3"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
