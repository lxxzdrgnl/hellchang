/**
 * 앱 상태와 그것을 바꾸는 순수 함수들. React 도 DOM 도 모른다 —
 * RN 으로 넘어갈 때 이 파일은 그대로 간다. 저장은 storage.ts 가 맡는다.
 *
 * DB 가 붙기 전까지 여기가 진실이다. 붙은 뒤에는 이 함수들이 그대로
 * API 요청의 낙관적 업데이트 본체가 된다.
 */
import { addDays, todayISO } from "./date";
import { parseSetNotation } from "./set-notation";
import type { ExerciseBrief } from "./exercises";
import type { PlannedDay, Role, RoutinePreset, Session, WorkExercise, WorkSet } from "./types";

/**
 * 다른 날로 미룬 운동 하나. 미루기는 루틴 단위가 아니라 운동 단위다 —
 * 등하는날에서 데드리프트만 못 하고 나오는 일이 훨씬 잦다.
 */
export interface DeferredExercise {
  id: string;
  /** 옮겨간 날짜 */
  date: string;
  /** 원래 하려던 날짜 */
  fromDate: string;
  /** 어느 루틴에서 왔는지 — 화면에 "등하는날에서" 로 보여준다 */
  fromTitle: string;
  exercise: WorkExercise;
}

/** 앱 전체에 걸리는 설정. 종목마다 따로 정하지 않았을 때 쓰는 값들이다. */
export interface Settings {
  /** 주운동 세트 사이 휴식(초) */
  mainRestSec: number;
  /** 보조 세트 사이 휴식(초) */
  accessoryRestSec: number;
}

export const defaultSettings: Settings = { mainRestSec: 180, accessoryRestSec: 90 };

export interface AppState {
  user: { nickname: string; provider: "kakao" | "google" } | null;
  settings: Settings;
  presets: RoutinePreset[];
  planned: PlannedDay[];
  sessions: Session[];
  deferred: DeferredExercise[];
  /** 목록에 없어서 직접 만든 종목 */
  customExercises: ExerciseBrief[];
}

export const emptyState: AppState = {
  user: null,
  settings: defaultSettings,
  presets: [],
  planned: [],
  sessions: [],
  deferred: [],
  customExercises: [],
};

let idCounter = 0;
/** cuid 를 흉내낼 이유가 없다. 목업에서는 단조 증가면 충분하다. */
export function newId(prefix = "id"): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

// ── 프리셋 ────────────────────────────────────────────────────────────

export function createPreset(state: AppState, name: string): [AppState, string] {
  const id = newId("preset");
  const preset: RoutinePreset = { id, name, memo: null, exercises: [] };
  return [{ ...state, presets: [...state.presets, preset] }, id];
}

export function renamePreset(state: AppState, presetId: string, name: string): AppState {
  return mapPreset(state, presetId, (p) => ({ ...p, name }));
}

export function deletePreset(state: AppState, presetId: string): AppState {
  return {
    ...state,
    presets: state.presets.filter((p) => p.id !== presetId),
    planned: state.planned.filter((d) => d.presetId !== presetId),
  };
}

function mapPreset(
  state: AppState,
  presetId: string,
  fn: (p: RoutinePreset) => RoutinePreset,
): AppState {
  return { ...state, presets: state.presets.map((p) => (p.id === presetId ? fn(p) : p)) };
}

// ── 운동·세트 (프리셋과 세션이 같은 모양이라 함께 쓴다) ──────────────────

export function makeExercise(exerciseId: string, role: Role, restSec: number): WorkExercise {
  return { id: newId("we"), exerciseId, role, restSec, sets: [] };
}

export function makeSet(weight: number, reps: number): WorkSet {
  return {
    id: newId("set"),
    plannedWeight: weight,
    plannedReps: reps,
    actualWeight: null,
    actualReps: null,
    completedAt: null,
  };
}

function editExercises(
  list: WorkExercise[],
  exId: string,
  fn: (e: WorkExercise) => WorkExercise,
): WorkExercise[] {
  return list.map((e) => (e.id === exId ? fn(e) : e));
}

/** 텍스트 표기를 그대로 세트로 바꾼다. 이미 완료한 세트의 실제값은 지키고 계획만 갈아끼운다. */
export function applyNotation(ex: WorkExercise, notation: string): WorkExercise {
  const { sets } = parseSetNotation(notation);
  const next = sets.map((s, i) => {
    const old = ex.sets[i];
    if (old?.completedAt) {
      return { ...old, plannedWeight: s.weight, plannedReps: s.reps };
    }
    return { ...makeSet(s.weight, s.reps), id: old?.id ?? newId("set") };
  });
  return { ...ex, sets: next };
}

export function setSetCount(ex: WorkExercise, count: number): WorkExercise {
  if (count === ex.sets.length) return ex;
  if (count < ex.sets.length) return { ...ex, sets: ex.sets.slice(0, count) };
  const last = ex.sets[ex.sets.length - 1];
  const added = Array.from({ length: count - ex.sets.length }, () =>
    makeSet(last?.plannedWeight ?? 20, last?.plannedReps ?? 10),
  );
  return { ...ex, sets: [...ex.sets, ...added] };
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// ── 프리셋 편집 ───────────────────────────────────────────────────────

export function presetAddExercise(
  state: AppState,
  presetId: string,
  exerciseId: string,
  restSec: number,
): AppState {
  return mapPreset(state, presetId, (p) => {
    const role: Role = p.exercises.length === 0 ? "주운동" : "보조";
    const ex = makeExercise(exerciseId, role, restSec);
    // 빈 운동은 쓸모가 없다. 흔한 3세트를 미리 깔아준다.
    ex.sets = [makeSet(20, 12), makeSet(20, 12), makeSet(20, 12)];
    return { ...p, exercises: [...p.exercises, ex] };
  });
}

export function presetUpdateExercise(
  state: AppState,
  presetId: string,
  exId: string,
  fn: (e: WorkExercise) => WorkExercise,
): AppState {
  return mapPreset(state, presetId, (p) => ({ ...p, exercises: editExercises(p.exercises, exId, fn) }));
}

export function presetRemoveExercise(state: AppState, presetId: string, exId: string): AppState {
  return mapPreset(state, presetId, (p) => ({
    ...p,
    exercises: p.exercises.filter((e) => e.id !== exId),
  }));
}

export function presetMoveExercise(
  state: AppState,
  presetId: string,
  exId: string,
  delta: number,
): AppState {
  return mapPreset(state, presetId, (p) => {
    const i = p.exercises.findIndex((e) => e.id === exId);
    return i < 0 ? p : { ...p, exercises: moveItem(p.exercises, i, i + delta) };
  });
}

// ── 주간 계획 ─────────────────────────────────────────────────────────

export function planDay(state: AppState, date: string, presetId: string): AppState {
  const day: PlannedDay = { id: newId("plan"), date, presetId, deferredFrom: null };
  return { ...state, planned: [...state.planned, day] };
}

export function unplanDay(state: AppState, planId: string): AppState {
  return { ...state, planned: state.planned.filter((d) => d.id !== planId) };
}

/**
 * 미루기. 자동으로 밀리지 않는다 — 옮긴 날에 이미 계획이 있으면 둘이 나란히 선다.
 * 원래 날짜를 deferredFrom 에 남겨 "왜 여기 있는지"가 보이게 한다.
 */
export function deferDay(state: AppState, planId: string, days = 1): AppState {
  return {
    ...state,
    planned: state.planned.map((d) =>
      d.id === planId
        ? { ...d, date: addDays(d.date, days), deferredFrom: d.deferredFrom ?? d.date }
        : d,
    ),
  };
}

/** 지난주 배정을 이번 주로 복사한다. 이미 있는 날은 건드리지 않는다. */
export function copyLastWeek(state: AppState, weekStartISO: string): AppState {
  const prevStart = addDays(weekStartISO, -7);
  const source = state.planned.filter((d) => {
    const diff = daysBetween(prevStart, d.date);
    return diff >= 0 && diff < 7;
  });
  const existing = new Set(state.planned.map((d) => `${d.date}:${d.presetId}`));
  const copies: PlannedDay[] = [];
  for (const d of source) {
    const date = addDays(d.date, 7);
    if (existing.has(`${date}:${d.presetId}`)) continue;
    copies.push({ id: newId("plan"), date, presetId: d.presetId, deferredFrom: null });
  }
  return { ...state, planned: [...state.planned, ...copies] };
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000,
  );
}

// ── 세션 ──────────────────────────────────────────────────────────────

/**
 * 프리셋을 깊은 복사해 오늘 세션을 만든다. 이 복사가 이 앱의 핵심이다 —
 * 오늘 중량을 올려도 프리셋은 그대로고, 프리셋을 고쳐도 지난 기록은 안 변한다.
 */
export function startSession(
  state: AppState,
  presetId: string,
  date: string = todayISO(),
  deferredFrom: string | null = null,
  /**
   * 세션 id 를 밖에서 넘긴다. React 의 상태 갱신 콜백은 다음 렌더에 실행되므로,
   * 여기서 만든 id 를 호출부가 곧바로 읽으면 아직 비어 있다 — 화면 이동이
   * 조용히 실패한다. id 를 먼저 정하고 넘기면 그 창이 사라진다.
   */
  sessionId?: string,
): [AppState, string] {
  const preset = state.presets.find((p) => p.id === presetId);
  if (!preset) return [state, ""];

  const id = sessionId ?? newId("session");
  const copied: WorkExercise[] = preset.exercises.map((e) => ({
    ...e,
    id: newId("we"),
    sets: e.sets.map((s) => makeSet(s.plannedWeight, s.plannedReps)),
  }));

  // 그날로 미뤄둔 운동을 뒤에 붙인다. 따로 시작하게 두면 "미룬 것을 결국
  // 안 하는" 일이 반복된다 — 오늘 하는 운동 목록 안에 들어와 있어야 한다.
  const due = state.deferred.filter((d) => d.date === date);
  const carried: WorkExercise[] = due.map((d) => ({
    ...d.exercise,
    id: newId("we"),
    // 미뤄온 것은 오늘의 보조다. 주운동 자리는 오늘 루틴의 것이다.
    role: "보조",
    sets: d.exercise.sets.map((s) => makeSet(s.plannedWeight, s.plannedReps)),
  }));

  const session: Session = {
    id,
    date,
    title: preset.name,
    presetId,
    status: "진행중",
    deferredFrom,
    exercises: [...copied, ...carried],
  };

  return [
    {
      ...state,
      sessions: [...state.sessions, session],
      // 세션에 들어갔으니 대기 목록에서는 뺀다.
      deferred: state.deferred.filter((d) => d.date !== date),
    },
    id,
  ];
}

/**
 * 계획 없이 미룬 운동만 하는 날. 헬스장에 갔는데 오늘 루틴은 없고
 * 지난번에 못 한 것만 남은 상황이다.
 */
export function startDeferredOnlySession(
  state: AppState,
  date: string = todayISO(),
  sessionId?: string,
): [AppState, string] {
  const due = state.deferred.filter((d) => d.date === date);
  if (due.length === 0) return [state, ""];

  const id = sessionId ?? newId("session");
  const session: Session = {
    id,
    date,
    title: "미룬 운동",
    presetId: null,
    status: "진행중",
    deferredFrom: due[0].fromDate,
    exercises: due.map((d, i) => ({
      ...d.exercise,
      id: newId("we"),
      role: i === 0 ? "주운동" : "보조",
      sets: d.exercise.sets.map((s) => makeSet(s.plannedWeight, s.plannedReps)),
    })),
  };

  return [
    {
      ...state,
      sessions: [...state.sessions, session],
      deferred: state.deferred.filter((d) => d.date !== date),
    },
    id,
  ];
}

/** 이미 시작한 세션에 그날의 미룬 운동을 뒤늦게 합친다. */
export function pullDeferredIntoSession(
  state: AppState,
  sessionId: string,
): AppState {
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session) return state;
  const due = state.deferred.filter((d) => d.date === session.date);
  if (due.length === 0) return state;

  return {
    ...state,
    sessions: state.sessions.map((s) =>
      s.id !== sessionId
        ? s
        : {
            ...s,
            exercises: [
              ...s.exercises,
              ...due.map((d) => ({
                ...d.exercise,
                id: newId("we"),
                role: "보조" as const,
                sets: d.exercise.sets.map((x) => makeSet(x.plannedWeight, x.plannedReps)),
              })),
            ],
          },
    ),
    deferred: state.deferred.filter((d) => d.date !== session.date),
  };
}

function mapSession(state: AppState, sessionId: string, fn: (s: Session) => Session): AppState {
  return { ...state, sessions: state.sessions.map((s) => (s.id === sessionId ? fn(s) : s)) };
}

export function sessionUpdateExercise(
  state: AppState,
  sessionId: string,
  exId: string,
  fn: (e: WorkExercise) => WorkExercise,
): AppState {
  return mapSession(state, sessionId, (s) => ({
    ...s,
    exercises: editExercises(s.exercises, exId, fn),
  }));
}

export function sessionAddExercise(
  state: AppState,
  sessionId: string,
  exerciseId: string,
  restSec: number,
): AppState {
  return mapSession(state, sessionId, (s) => {
    const ex = makeExercise(exerciseId, "보조", restSec);
    ex.sets = [makeSet(20, 12), makeSet(20, 12), makeSet(20, 12)];
    return { ...s, exercises: [...s.exercises, ex] };
  });
}

/** 세션 안에서 운동 순서를 바꾼다. 기구가 차 있으면 뒤엣것을 먼저 하게 된다. */
export function sessionMoveExercise(
  state: AppState,
  sessionId: string,
  exId: string,
  delta: number,
): AppState {
  return mapSession(state, sessionId, (s) => {
    const i = s.exercises.findIndex((e) => e.id === exId);
    return i < 0 ? s : { ...s, exercises: moveItem(s.exercises, i, i + delta) };
  });
}

export function sessionRemoveExercise(state: AppState, sessionId: string, exId: string): AppState {
  return mapSession(state, sessionId, (s) => ({
    ...s,
    exercises: s.exercises.filter((e) => e.id !== exId),
  }));
}

/** 세트 완료. 실제값을 따로 안 적었으면 계획대로 든 것으로 본다. */
export function completeSet(
  state: AppState,
  sessionId: string,
  exId: string,
  setId: string,
  at: string = new Date().toISOString(),
): AppState {
  return sessionUpdateExercise(state, sessionId, exId, (e) => ({
    ...e,
    sets: e.sets.map((s) =>
      s.id === setId
        ? {
            ...s,
            completedAt: at,
            actualWeight: s.actualWeight ?? s.plannedWeight,
            actualReps: s.actualReps ?? s.plannedReps,
          }
        : s,
    ),
  }));
}

export function uncompleteSet(
  state: AppState,
  sessionId: string,
  exId: string,
  setId: string,
): AppState {
  return sessionUpdateExercise(state, sessionId, exId, (e) => ({
    ...e,
    sets: e.sets.map((s) => (s.id === setId ? { ...s, completedAt: null } : s)),
  }));
}

export function editSet(
  state: AppState,
  sessionId: string,
  exId: string,
  setId: string,
  patch: Partial<Pick<WorkSet, "actualWeight" | "actualReps" | "plannedWeight" | "plannedReps">>,
): AppState {
  return sessionUpdateExercise(state, sessionId, exId, (e) => ({
    ...e,
    sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
  }));
}

/**
 * 세션을 닫는다. 부분 완료를 그대로 남긴다 — 6세트 중 4세트만 했으면 4세트가
 * 기록되고 세션은 완료다. "미완료 세션"이라는 상태를 만들지 않는다.
 */
/**
 * 세션에서 운동 하나를 빼서 다른 날로 미룬다. 완료한 세트는 그대로 두고
 * 남은 세트만 넘긴다 — 3세트까지 했으면 그 3세트는 오늘 기록이다.
 */
export function deferExercise(
  state: AppState,
  sessionId: string,
  exId: string,
  days = 1,
): AppState {
  const session = state.sessions.find((s) => s.id === sessionId);
  const ex = session?.exercises.find((e) => e.id === exId);
  if (!session || !ex) return state;

  const remaining = ex.sets.filter((s) => s.completedAt === null);
  const finished = ex.sets.filter((s) => s.completedAt !== null);

  const moved: DeferredExercise = {
    id: newId("defer"),
    date: addDays(session.date, days),
    fromDate: session.date,
    fromTitle: session.title,
    exercise: {
      ...ex,
      id: newId("we"),
      sets: remaining.map((s) => makeSet(s.plannedWeight, s.plannedReps)),
    },
  };

  return {
    ...state,
    deferred: [...state.deferred, moved],
    sessions: state.sessions.map((s) =>
      s.id !== sessionId
        ? s
        : {
            ...s,
            // 한 세트도 안 했으면 운동 자체를 뺀다. 했으면 한 만큼만 남긴다.
            exercises:
              finished.length === 0
                ? s.exercises.filter((e) => e.id !== exId)
                : s.exercises.map((e) => (e.id === exId ? { ...e, sets: finished } : e)),
          },
    ),
  };
}

export function dropDeferred(state: AppState, deferredId: string): AppState {
  return { ...state, deferred: state.deferred.filter((d) => d.id !== deferredId) };
}

/** 미룬 운동을 다시 하루 더 미룬다. */
export function deferAgain(state: AppState, deferredId: string, days = 1): AppState {
  return {
    ...state,
    deferred: state.deferred.map((d) =>
      d.id === deferredId ? { ...d, date: addDays(d.date, days) } : d,
    ),
  };
}

export function updateSettings(state: AppState, patch: Partial<Settings>): AppState {
  return { ...state, settings: { ...state.settings, ...patch } };
}

export function addCustomExercise(state: AppState, exercise: ExerciseBrief): AppState {
  return { ...state, customExercises: [exercise, ...state.customExercises] };
}

export function finishSession(state: AppState, sessionId: string): AppState {
  return mapSession(state, sessionId, (s) => ({ ...s, status: "완료" }));
}

/**
 * 지난 날짜에 열린 채로 남은 세션을 닫습니다.
 *
 * 운동은 오늘만 할 수 있습니다. 어제 시작해 놓고 끝내기를 안 누른 세션이
 * "진행중"으로 남아 있으면 주간 계획에 진행중이 여러 개로 보이고, 어느 것이
 * 지금 하는 것인지 알 수 없습니다. 한 것은 이미 기록돼 있으므로 그냥 닫습니다.
 */
export function closeStaleSessions(state: AppState, today: string = todayISO()): AppState {
  const stale = state.sessions.filter((s) => s.status === "진행중" && s.date !== today);
  if (stale.length === 0) return state;
  return {
    ...state,
    sessions: state.sessions.map((s) =>
      s.status === "진행중" && s.date !== today ? { ...s, status: "완료" } : s,
    ),
  };
}

export function deleteSession(state: AppState, sessionId: string): AppState {
  return { ...state, sessions: state.sessions.filter((s) => s.id !== sessionId) };
}
