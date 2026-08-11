"use client";

/**
 * 운동 플레이어 — 운동 중에는 이 화면만 본다.
 *
 * 오늘 화면이 "무엇을 할지"라면 여기는 "지금 이것"이다. 목록을 스크롤하며
 * 자기 위치를 찾는 대신, 한 종목을 크게 띄우고 세트를 하나씩 지운다.
 * 헬스장에서 폰을 내려놨다 다시 집었을 때 어디였는지 찾을 필요가 없어야 한다.
 */
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BodyMap } from "@/components/body-map";
import { useStore } from "@/components/app-store";
import { ExercisePicker } from "@/components/exercise-picker";
import { SetEditor } from "@/components/set-editor";
import { Sheet } from "@/components/sheet";
import { formatWeight } from "@/components/set-ladder";
import { getExercise } from "@/lib/exercises";
import { completedSets, sessionProgress, sessionVolume } from "@/lib/progress";
import {
  applyNotation,
  completeSet,
  deferExercise,
  finishSession,
  sessionMoveExercise,
  sessionUpdateExercise,
  uncompleteSet,
} from "@/lib/store";
import { roleLabel } from "@/lib/types";

export default function SessionPlayerPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { state, update, ready } = useStore();

  const [index, setIndex] = useState(0);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [editing, setEditing] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [deferring, setDeferring] = useState(false);

  const session = state.sessions.find((s) => s.id === sessionId);
  const exercises = useMemo(() => session?.exercises ?? [], [session]);
  const current = exercises[Math.min(index, exercises.length - 1)];

  useEffect(() => {
    if (restEndsAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [restEndsAt]);

  // 쉬는 시간이 끝나면 알린다. 헬스장에서는 소리보다 진동이 먼저 닿는다.
  useEffect(() => {
    if (restEndsAt === null || now < restEndsAt) return;
    if ("vibrate" in navigator) navigator.vibrate?.([200, 90, 200]);
  }, [now, restEndsAt]);

  if (!ready) return null;
  if (!session || !current) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-meta text-sub">없는 운동이다</p>
      </div>
    );
  }

  const meta = getExercise(current.exerciseId);
  const done = completedSets(current.sets);
  const nextSet = current.sets.find((s) => s.completedAt === null);
  const progress = sessionProgress(session);
  const resting = restEndsAt !== null && now < restEndsAt;
  const restLeft = resting ? Math.ceil((restEndsAt - now) / 1000) : 0;

  function completeCurrent() {
    if (!nextSet || !session) return;
    update((s) => completeSet(s, session.id, current.id, nextSet.id));

    const isLastOfExercise = current.sets[current.sets.length - 1]?.id === nextSet.id;
    if (isLastOfExercise) {
      setRestEndsAt(null);
      // 마지막 종목이면 그대로 두고, 아니면 다음 종목으로 넘긴다.
      if (index < exercises.length - 1) setIndex(index + 1);
      return;
    }
    setRestTotal(current.restSec);
    setRestEndsAt(Date.now() + current.restSec * 1000);
  }

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-3">
        <button
          type="button"
          onClick={() => router.push("/today")}
          aria-label="목록으로"
          className="size-10 rounded-btn text-screen text-ink-2 active:bg-surface"
        >
          ‹
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-micro text-sub">
            {index + 1} / {exercises.length} · {session.title}
          </span>
          <div className="mt-1 h-1 overflow-hidden rounded-pill bg-surface-2">
            <div
              className="h-full rounded-pill bg-accent transition-[width] duration-300"
              style={{ width: `${progress.ratio * 100}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setFinishing(true)}
          className="shrink-0 px-2 py-2 text-meta font-semibold text-accent"
        >
          끝내기
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">
        <div className="flex items-start justify-between gap-2 pt-1">
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-card font-bold text-ink">{meta?.nameKo ?? current.exerciseId}</h1>
            <p className="truncate text-meta text-sub">
              {roleLabel(exercises, index)} · {meta?.targetMuscles.join(" · ")}
              {meta?.equipment ? ` · ${meta.equipment}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDeferring(true)}
            className="shrink-0 rounded-pill border border-line px-3 py-1.5 text-micro font-medium text-ink-2 active:bg-surface"
          >
            미루기
          </button>
        </div>

        {/* 어디를 쓰는 운동인지. 사진 대신 이걸 두는 이유는 종목마다 조명·각도가
            달라 시끄럽고, 정작 알고 싶은 것은 이 그림이 답하기 때문이다. */}
        <div className="flex items-center justify-center gap-6 py-4">
          <BodyMap
            primary={meta?.targetMuscles ?? []}
            secondary={meta?.secondaryMuscles ?? []}
            bodyPart={meta?.bodyPart}
            size={96}
            both
          />
        </div>

        <div className="flex items-center justify-between pb-1.5">
          <span className="text-meta font-semibold text-ink-2">
            세트 {done.length}/{current.sets.length}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-pill border border-line px-3 py-1.5 text-micro font-medium text-ink-2 active:bg-surface"
          >
            세트 수정
          </button>
        </div>

        <ul className="flex flex-col gap-1.5">
          {current.sets.map((s, i) => {
            const isDone = s.completedAt !== null;
            const isNext = s.id === nextSet?.id;
            return (
              <li
                key={s.id}
                className={`flex items-center gap-3 rounded-btn border px-4 py-3 transition-colors ${
                  isNext
                    ? "border-accent bg-accent-tint"
                    : isDone
                      ? "border-transparent bg-surface"
                      : "border-transparent bg-surface-2"
                }`}
              >
                <span
                  className={`w-12 shrink-0 text-meta font-semibold ${
                    isNext ? "text-accent" : isDone ? "text-ink-2" : "text-sub"
                  }`}
                >
                  {i + 1}세트
                </span>
                <span className={`text-weight font-bold ${isDone || isNext ? "text-ink" : "text-sub"}`}>
                  {formatWeight(s.actualWeight ?? s.plannedWeight)}
                  <span className="pl-0.5 text-meta font-medium text-sub">kg</span>
                </span>
                <span className={`text-weight font-bold ${isDone || isNext ? "text-ink" : "text-sub"}`}>
                  {s.actualReps ?? s.plannedReps}
                  <span className="pl-0.5 text-meta font-medium text-sub">회</span>
                </span>
                {isDone && (
                  <button
                    type="button"
                    onClick={() => update((st) => uncompleteSet(st, session.id, current.id, s.id))}
                    aria-label={`${i + 1}세트 되돌리기`}
                    className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-bg"
                  >
                    ✓
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <nav className="flex gap-2 pt-4">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
            className="h-11 flex-1 rounded-btn border border-line text-meta font-medium text-ink-2 active:bg-surface disabled:opacity-40"
          >
            이전 운동
          </button>
          <button
            type="button"
            onClick={() => setSwapping(true)}
            className="h-11 rounded-btn border border-line px-4 text-meta font-medium text-ink-2 active:bg-surface"
          >
            종목 교체
          </button>
          <button
            type="button"
            disabled={index >= exercises.length - 1}
            onClick={() => setIndex(index + 1)}
            className="h-11 flex-1 rounded-btn border border-line text-meta font-medium text-ink-2 active:bg-surface disabled:opacity-40"
          >
            다음 운동
          </button>
        </nav>

        {/* 기구가 차 있으면 순서를 바꿔야 한다. 헬스장에서 제일 잦은 변수다. */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => {
              update((s) => sessionMoveExercise(s, session.id, current.id, -1));
              setIndex(index - 1);
            }}
            className="h-10 flex-1 rounded-btn text-micro font-medium text-sub active:bg-surface disabled:opacity-40"
          >
            ↑ 이 운동을 앞으로
          </button>
          <button
            type="button"
            disabled={index >= exercises.length - 1}
            onClick={() => {
              update((s) => sessionMoveExercise(s, session.id, current.id, 1));
              setIndex(index + 1);
            }}
            className="h-10 flex-1 rounded-btn text-micro font-medium text-sub active:bg-surface disabled:opacity-40"
          >
            ↓ 이 운동을 뒤로
          </button>
        </div>
      </div>

      {/* 손이 닿는 자리. 쉬는 중에는 남은 시간이 그 자리를 차지한다. */}
      <div className="shrink-0 border-t border-line bg-surface p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        {resting ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-hero font-bold leading-none text-ink">
                {Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, "0")}
              </span>
              <span className="text-meta text-sub">쉬는 중</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-pill bg-surface-2">
              <div
                className="h-full rounded-pill bg-accent"
                style={{ width: `${Math.max(0, ((restEndsAt! - now) / (restTotal * 1000)) * 100)}%` }}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRestEndsAt((v) => (v ?? Date.now()) + 30000)}
                className="h-12 flex-1 rounded-btn border border-line text-meta font-semibold text-ink-2 active:bg-surface-2"
              >
                +30초
              </button>
              <button
                type="button"
                onClick={() => setRestEndsAt(null)}
                className="h-12 flex-1 rounded-btn bg-surface-2 text-meta font-semibold text-ink active:bg-line"
              >
                건너뛰기
              </button>
            </div>
          </div>
        ) : nextSet ? (
          <button
            type="button"
            onClick={completeCurrent}
            className="h-16 w-full rounded-btn bg-accent text-action font-bold text-bg active:bg-accent-press"
          >
            {formatWeight(nextSet.plannedWeight)}kg × {nextSet.plannedReps}회 완료
          </button>
        ) : index < exercises.length - 1 ? (
          <button
            type="button"
            onClick={() => setIndex(index + 1)}
            className="h-16 w-full rounded-btn bg-accent text-action font-bold text-bg active:bg-accent-press"
          >
            다음 운동으로
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setFinishing(true)}
            className="h-16 w-full rounded-btn bg-accent text-action font-bold text-bg active:bg-accent-press"
          >
            운동 끝내기
          </button>
        )}
      </div>

      <SetEditor
        open={editing}
        onClose={() => setEditing(false)}
        title={meta?.nameKo ?? "세트 수정"}
        sets={current.sets}
        onSave={(notation) =>
          update((s) => sessionUpdateExercise(s, session.id, current.id, (e) => applyNotation(e, notation)))
        }
      />

      <ExercisePicker
        open={swapping}
        onClose={() => setSwapping(false)}
        title="종목 교체"
        onPick={(picked) =>
          update((s) =>
            sessionUpdateExercise(s, session.id, current.id, (e) => ({
              ...e,
              exerciseId: picked.id,
              restSec: picked.defaultRestSec,
            })),
          )
        }
      />

      <Sheet open={deferring} onClose={() => setDeferring(false)} title="이 운동 미루기">
        <div className="flex flex-col gap-3 px-4 pb-5">
          <p className="text-meta leading-relaxed text-ink-2">
            <b className="text-ink">{meta?.nameKo}</b> 만 다른 날로 넘긴다. 이미 한 세트는
            오늘 기록으로 남는다.
          </p>
          <div className="flex gap-2">
            {[1, 2].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  update((s) => deferExercise(s, session.id, current.id, d));
                  setDeferring(false);
                  setIndex((i) => Math.max(0, Math.min(i, exercises.length - 2)));
                }}
                className="h-13 flex-1 rounded-btn border border-line text-body font-semibold text-ink active:bg-surface-2"
              >
                {d === 1 ? "내일로" : "모레로"}
              </button>
            ))}
          </div>
        </div>
      </Sheet>

      <Sheet open={finishing} onClose={() => setFinishing(false)} title="운동 끝내기">
        <div className="flex flex-col gap-4 px-4 pb-5">
          <div className="flex gap-3">
            <Stat label="완료한 세트" value={`${progress.done}`} unit={`/ ${progress.total}`} />
            <Stat label="총 볼륨" value={sessionVolume(session).toLocaleString()} unit="kg" />
          </div>
          <p className="text-meta leading-relaxed text-ink-2">
            {progress.total - progress.done > 0
              ? `${progress.total - progress.done}세트가 남았다. 남긴 채로 끝내도 한 것만 기록된다.`
              : "계획한 세트를 다 채웠다."}
          </p>
          <button
            type="button"
            onClick={() => {
              update((s) => finishSession(s, session.id));
              router.push("/today");
            }}
            className="h-14 rounded-btn bg-accent text-action font-bold text-bg active:bg-accent-press"
          >
            끝내고 기록하기
          </button>
        </div>
      </Sheet>
    </>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-btn bg-surface-2 px-3 py-2.5">
      <span className="text-micro text-sub">{label}</span>
      <span className="text-card font-bold leading-tight text-ink">
        {value}
        {unit && <span className="pl-1 text-meta font-medium text-sub">{unit}</span>}
      </span>
    </div>
  );
}
