"use client";

/**
 * 오늘 — 무엇을 할지 고르는 화면.
 *
 * 실제 운동은 플레이어(/today/[sessionId])가 맡는다. 여기서는 오늘 할 것을
 * 보여주고, 시작 버튼을 누르면 넘긴다. 지난 날짜를 눌러 그날 기록을 볼 수도 있다.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/components/app-store";
import { BodyMap } from "@/components/body-map";
import { ExercisePicker } from "@/components/exercise-picker";
import { PlanCard } from "@/components/plan-card";
import { Sheet } from "@/components/sheet";
import { getExercise } from "@/lib/exercises";
import { formatKo, relativeKo, todayISO, weekDates, weekdayKo } from "@/lib/date";
import { completedSets, sessionProgress, sessionVolume } from "@/lib/progress";
import {
  deferAgain,
  deferExercise,
  dropDeferred,
  newId,
  sessionMoveExercise,
  sessionRemoveExercise,
  sessionUpdateExercise,
  startDeferredOnlySession,
  startSession,
  type AppState,
  type DeferredExercise,
} from "@/lib/store";
import type { Session } from "@/lib/types";

export default function TodayPage() {
  const { state, update, ready } = useStore();
  const router = useRouter();
  const today = todayISO();
  const [selected, setSelected] = useState(today);
  const [picking, setPicking] = useState(false);
  const [menuTarget, setMenuTarget] = useState<{ sessionId: string; exId: string } | null>(null);
  const [deferTarget, setDeferTarget] = useState<{ sessionId: string; exId: string } | null>(null);
  const [swapTarget, setSwapTarget] = useState<{ sessionId: string; exId: string } | null>(null);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-meta text-sub">불러오는 중</span>
      </div>
    );
  }

  const sessions = state.sessions.filter((s) => s.date === selected);
  const plans = state.planned.filter((d) => d.date === selected);
  const deferred = state.deferred.filter((d) => d.date === selected);
  const startedPresetIds = new Set(sessions.map((s) => s.presetId));
  const pending = plans.filter((p) => !startedPresetIds.has(p.presetId));
  const isToday = selected === today;

  function start(presetId: string, deferredFrom: string | null = null) {
    // id 를 먼저 정한다. 상태 갱신 콜백은 다음 렌더에 돌기 때문에, 그 안에서
    // 만든 id 를 곧바로 읽으면 비어 있어 화면이 안 넘어간다.
    const id = newId("session");
    update((s) => startSession(s, presetId, selected, deferredFrom, id)[0]);
    router.push(`/today/${id}`);
  }

  function startDeferredOnly() {
    const id = newId("session");
    update((s) => startDeferredOnlySession(s, selected, id)[0]);
    router.push(`/today/${id}`);
  }

  return (
    <>
      <header className="shrink-0 px-4 pb-1 pt-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-screen font-bold text-ink">{isToday ? "오늘" : relativeKo(selected, today)}</h1>
          <p className="text-meta text-sub">{formatKo(selected)}</p>
        </div>
        <WeekStrip selected={selected} today={today} onSelect={setSelected} />
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-6">
        {deferred.length > 0 && (
          <section className="flex shrink-0 flex-col gap-2 rounded-card bg-surface p-4">
            <h2 className="text-title font-semibold text-ink">미룬 운동</h2>
            {deferred.map((d) => (
              <DeferredRow
                key={d.id}
                item={d}
                onAgain={() => update((s) => deferAgain(s, d.id, 1))}
                onDrop={() => update((s) => dropDeferred(s, d.id))}
              />
            ))}
            {pending.length > 0 ? (
              <p className="text-micro leading-relaxed text-sub">
                아래 루틴을 시작하면 이 운동들이 뒤에 같이 들어간다.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => startDeferredOnly()}
                className="h-13 rounded-btn bg-accent text-body font-bold text-bg active:bg-accent-press"
              >
                미룬 운동만 하기
              </button>
            )}
          </section>
        )}

        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onMenu={(exId) => setMenuTarget({ sessionId: session.id, exId })}
          />
        ))}

        {pending.map((plan) => {
          const preset = state.presets.find((p) => p.id === plan.presetId);
          if (!preset) return null;
          return (
            <PlanCard
              key={plan.id}
              preset={preset}
              deferredFrom={plan.deferredFrom}
              onStart={() => start(preset.id, plan.deferredFrom)}
              onDefer={() => setPicking(true)}
            />
          );
        })}

        {sessions.length === 0 && pending.length === 0 && (
          <div className="flex shrink-0 flex-col gap-3 rounded-card bg-surface p-5">
            <h2 className="text-title font-semibold text-ink">
              {isToday ? "오늘은 계획이 없다" : "이 날은 계획이 없다"}
            </h2>
            <p className="text-meta leading-relaxed text-ink-2">
              쉬는 날이면 그대로 두면 된다. 갑자기 가기로 했다면 아래에서 골라 바로 시작한다.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              {state.presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => start(p.id)}
                  className="h-13 rounded-btn border border-line text-body font-medium text-ink active:bg-surface-2"
                >
                  {p.name} 시작
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Sheet
        open={menuTarget !== null}
        onClose={() => setMenuTarget(null)}
        title={deferName(state, menuTarget)}
      >
        <div className="flex flex-col gap-1.5 px-4 pb-5">
          <MenuItem
            onClick={() => {
              if (menuTarget) update((s) => sessionMoveExercise(s, menuTarget.sessionId, menuTarget.exId, -1));
              setMenuTarget(null);
            }}
          >
            ↑ 순서 앞으로
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (menuTarget) update((s) => sessionMoveExercise(s, menuTarget.sessionId, menuTarget.exId, 1));
              setMenuTarget(null);
            }}
          >
            ↓ 순서 뒤로
          </MenuItem>
          <MenuItem
            onClick={() => {
              setSwapTarget(menuTarget);
              setMenuTarget(null);
            }}
          >
            종목 바꾸기
          </MenuItem>
          <MenuItem
            onClick={() => {
              setDeferTarget(menuTarget);
              setMenuTarget(null);
            }}
          >
            다른 날로 미루기
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (menuTarget) update((s) => sessionRemoveExercise(s, menuTarget.sessionId, menuTarget.exId));
              setMenuTarget(null);
            }}
          >
            오늘 빼기
          </MenuItem>
        </div>
      </Sheet>

      <ExercisePicker
        open={swapTarget !== null}
        onClose={() => setSwapTarget(null)}
        title="종목 바꾸기"
        onPick={(picked) => {
          if (!swapTarget) return;
          update((s) =>
            sessionUpdateExercise(s, swapTarget.sessionId, swapTarget.exId, (e) => ({
              ...e,
              exerciseId: picked.id,
              restSec: picked.defaultRestSec,
            })),
          );
        }}
      />

      <Sheet
        open={deferTarget !== null}
        onClose={() => setDeferTarget(null)}
        title="이 운동 미루기"
      >
        <div className="flex flex-col gap-3 px-4 pb-5">
          <p className="text-meta leading-relaxed text-ink-2">
            {deferName(state, deferTarget)} 만 다른 날로 넘긴다. 이미 한 세트는 오늘 기록으로
            남고, 남은 세트가 그날 루틴에 같이 들어간다.
          </p>
          <div className="flex gap-2">
            {[1, 2].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  if (deferTarget)
                    update((s) => deferExercise(s, deferTarget.sessionId, deferTarget.exId, d));
                  setDeferTarget(null);
                }}
                className="h-13 flex-1 rounded-btn border border-line text-body font-semibold text-ink active:bg-surface-2"
              >
                {d === 1 ? "내일로" : "모레로"}
              </button>
            ))}
          </div>
        </div>
      </Sheet>

      <Sheet open={picking} onClose={() => setPicking(false)} title="루틴 통째로 미루기">
        <div className="flex flex-col gap-3 px-4 pb-5">
          <p className="text-meta leading-relaxed text-ink-2">
            루틴 전체를 옮기려면 <b className="text-ink">루틴</b> 탭의 주간 계획에서 날짜를
            바꾼다. 운동 하나만 미루는 것은 운동을 시작한 뒤 그 운동 화면에서 한다.
          </p>
          <button
            type="button"
            onClick={() => {
              setPicking(false);
              router.push("/routines");
            }}
            className="h-13 rounded-btn bg-accent text-body font-bold text-bg active:bg-accent-press"
          >
            주간 계획 열기
          </button>
        </div>
      </Sheet>
    </>
  );
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-13 rounded-btn bg-surface-2 px-4 text-left text-body font-medium text-ink active:bg-line"
    >
      {children}
    </button>
  );
}

function deferName(state: AppState, target: { sessionId: string; exId: string } | null): string {
  if (!target) return "이 운동";
  const ex = state.sessions
    .find((s) => s.id === target.sessionId)
    ?.exercises.find((e) => e.id === target.exId);
  return getExercise(ex?.exerciseId ?? "")?.nameKo ?? "이 운동";
}

function DeferredRow({
  item,
  onAgain,
  onDrop,
}: {
  item: DeferredExercise;
  onAgain: () => void;
  onDrop: () => void;
}) {
  const meta = getExercise(item.exercise.exerciseId);
  return (
    <div className="flex items-center gap-3 rounded-btn border-l-2 border-amber bg-amber-tint px-3 py-2.5">
      <BodyMap
        primary={meta?.targetMuscles ?? []}
        secondary={meta?.secondaryMuscles ?? []}
        bodyPart={meta?.bodyPart}
        size={26}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-semibold text-ink">{meta?.nameKo}</span>
        <span className="truncate text-micro text-sub">
          {item.fromTitle} · {item.exercise.sets.length}세트 남음
        </span>
      </div>
      <button
        type="button"
        onClick={onAgain}
        className="shrink-0 px-2 py-1 text-micro text-amber active:text-ink"
      >
        하루 더
      </button>
      <button
        type="button"
        onClick={onDrop}
        className="shrink-0 px-2 py-1 text-micro text-sub active:text-ink"
      >
        지우기
      </button>
    </div>
  );
}

function SessionCard({
  session,
  onMenu,
}: {
  session: Session;
  onMenu: (exId: string) => void;
}) {
  const progress = sessionProgress(session);
  const done = session.status === "완료";

  return (
    <article className="flex shrink-0 flex-col overflow-hidden rounded-card bg-surface">
      <Link href={`/today/${session.id}`} className="flex flex-col active:bg-surface-2">
        <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="truncate text-card font-bold leading-tight text-ink">{session.title}</h2>
            <p className="text-meta text-sub">
              {progress.done}/{progress.total}세트 · {sessionVolume(session).toLocaleString()}kg
            </p>
          </div>
          <span
            className={`shrink-0 rounded-pill px-3 py-1 text-micro font-semibold ${
              done ? "bg-accent-tint text-accent" : "bg-surface-2 text-ink-2"
            }`}
          >
            {done ? "완료" : "진행 중"}
          </span>
        </div>

        <div className="px-4 pb-1">
          <div className="h-1.5 overflow-hidden rounded-pill bg-surface-2">
            <div
              className="h-full rounded-pill bg-accent transition-[width] duration-300"
              style={{ width: `${progress.ratio * 100}%` }}
            />
          </div>
        </div>
      </Link>

      <ul className="flex flex-col">
        {session.exercises.map((ex) => {
          const meta = getExercise(ex.exerciseId);
          const exDone = completedSets(ex.sets).length;
          const finished = exDone === ex.sets.length;
          return (
            <li key={ex.id} className="flex items-center gap-3 px-4 py-2">
              <BodyMap
                primary={meta?.targetMuscles ?? []}
                secondary={meta?.secondaryMuscles ?? []}
                bodyPart={meta?.bodyPart}
                size={30}
              />
              <Link
                href={`/today/${session.id}`}
                className="min-w-0 flex-1 truncate text-body font-medium text-ink"
              >
                {meta?.nameKo}
              </Link>
              <span className={`shrink-0 text-meta ${finished ? "text-accent" : "text-sub"}`}>
                {exDone}/{ex.sets.length}
              </span>
              {!done && (
                <button
                  type="button"
                  onClick={() => onMenu(ex.id)}
                  aria-label={`${meta?.nameKo} 메뉴`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-btn text-title text-sub active:bg-surface-2 active:text-ink"
                >
                  ⋯
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <Link href={`/today/${session.id}`} className="px-4 pb-4 pt-2 text-meta font-semibold text-accent">
        {done ? "기록 보기 ›" : "이어서 하기 ›"}
      </Link>
    </article>
  );
}

/** 이번 주. 날짜를 누르면 그날로 옮겨 간다. */
function WeekStrip({
  selected,
  today,
  onSelect,
}: {
  selected: string;
  today: string;
  onSelect: (d: string) => void;
}) {
  const { state } = useStore();
  const dates = weekDates(selected);

  return (
    <ul className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto overflow-y-hidden px-4 pb-1">
      {dates.map((d) => {
        const plans = state.planned.filter((p) => p.date === d);
        const sessions = state.sessions.filter((s) => s.date === d);
        const isDone = sessions.some((s) => s.status === "완료");
        const isSelected = d === selected;
        const isToday = d === today;
        const name =
          sessions[0]?.title ??
          state.presets.find((p) => p.id === plans[0]?.presetId)?.name ??
          "휴식";

        return (
          <li key={d}>
            <button
              type="button"
              onClick={() => onSelect(d)}
              aria-current={isSelected ? "date" : undefined}
              className={`flex w-[62px] shrink-0 flex-col items-center gap-0.5 rounded-btn border px-1 py-2 transition-colors ${
                isSelected
                  ? "border-accent bg-accent-tint"
                  : "border-transparent bg-surface active:bg-surface-2"
              }`}
            >
              <span className={`text-micro ${isSelected ? "text-accent" : isToday ? "text-ink-2" : "text-sub"}`}>
                {weekdayKo(d)}
              </span>
              <span
                className={`text-body font-bold ${
                  isSelected ? "text-accent" : isToday ? "text-ink" : "text-ink-2"
                }`}
              >
                {Number(d.slice(8))}
              </span>
              <span
                className={`w-full truncate text-center text-micro ${
                  isDone ? "text-accent" : plans.length ? "text-sub" : "text-line"
                }`}
              >
                {isDone ? "✓" : name.replace("하는날", "")}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
