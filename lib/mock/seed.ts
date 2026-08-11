/**
 * 목업 초기 데이터. DB 가 붙기 전까지 첫 실행 때 이걸 깐다.
 *
 * 프리셋은 실제 메모(등하는날 · 하체하는날)를 그대로 옮겼고, 지난 세션은
 * 그래프가 비어 보이지 않도록 6주치를 만들어 넣는다 — 중량이 조금씩 오르되
 * 매주 오르지는 않게 했다. 실제 기록이 그렇다.
 */
import { addDays, todayISO, weekStart } from "../date";
import { defaultSettings, makeExercise, makeSet, newId } from "../store";
import type { AppState } from "../store";
import type { PlannedDay, RoutinePreset, Session, WorkExercise } from "../types";
import presetSeed from "./presets.json";

type SeedItem = { role: string; exerciseId: string; nameKo: string; sets: [number, number][] };

function buildPreset(name: string, items: SeedItem[]): RoutinePreset {
  return {
    id: newId("preset"),
    name,
    memo: null,
    exercises: items.map((it) => {
      const ex = makeExercise(it.exerciseId, it.role === "주운동" ? "주운동" : "보조", it.role === "주운동" ? 180 : 90);
      ex.sets = it.sets.map(([w, r]) => makeSet(w, r));
      return ex;
    }),
  };
}

/** 지난 세션 한 개. 그 주의 컨디션에 따라 계획보다 덜/더 들기도 한다. */
function pastSession(preset: RoutinePreset, date: string, weekIndex: number, rng: () => number): Session {
  // 6주 전이 가장 가볍고 최근이 무겁다. 다만 매주 오르지는 않는다.
  const growth = 1 + weekIndex * 0.022 + (rng() - 0.5) * 0.02;

  const exercises: WorkExercise[] = preset.exercises.map((e) => ({
    ...e,
    id: newId("we"),
    sets: e.sets.map((s) => {
      const weight = round2(s.plannedWeight * growth);
      // 마지막 한두 세트는 못 채우고 나오는 날이 있다.
      const skipped = rng() < 0.12;
      return {
        ...makeSet(weight, s.plannedReps),
        actualWeight: skipped ? null : weight,
        actualReps: skipped ? null : s.plannedReps - (rng() < 0.2 ? 1 : 0),
        completedAt: skipped ? null : `${date}T12:00:00.000Z`,
      };
    }),
  }));

  return {
    id: newId("session"),
    date,
    title: preset.name,
    presetId: preset.id,
    status: "완료",
    deferredFrom: null,
    exercises,
  };
}

function round2(n: number): number {
  return Math.round(n * 2) / 2;
}

/** 시드는 매번 같아야 한다. 목업이 열 때마다 달라지면 화면을 못 고친다. */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function buildSeedState(today: string = todayISO()): AppState {
  const seed = presetSeed as unknown as Record<string, SeedItem[]>;
  const back = buildPreset("등하는날", seed["등하는날"]);
  const legs = buildPreset("하체하는날", seed["하체하는날"]);
  const presets = [back, legs];

  const rng = seededRandom(20260811);
  const sessions: Session[] = [];

  // 6주 전부터 지난주까지. 등은 월·목, 하체는 화·금에 했다고 둔다.
  const thisMonday = weekStart(today);
  for (let w = 6; w >= 1; w--) {
    const monday = addDays(thisMonday, -7 * w);
    const weekIndex = 6 - w;
    sessions.push(pastSession(back, addDays(monday, 0), weekIndex, rng));
    sessions.push(pastSession(legs, addDays(monday, 1), weekIndex, rng));
    sessions.push(pastSession(back, addDays(monday, 3), weekIndex, rng));
    sessions.push(pastSession(legs, addDays(monday, 4), weekIndex, rng));
  }

  // 이번 주 계획. 오늘은 아직 시작 전이다.
  const planned: PlannedDay[] = [
    { id: newId("plan"), date: addDays(thisMonday, 0), presetId: back.id, deferredFrom: null },
    { id: newId("plan"), date: addDays(thisMonday, 1), presetId: legs.id, deferredFrom: null },
    { id: newId("plan"), date: addDays(thisMonday, 3), presetId: back.id, deferredFrom: null },
    { id: newId("plan"), date: addDays(thisMonday, 4), presetId: legs.id, deferredFrom: null },
  ];

  return {
    user: { nickname: "헬창", provider: "kakao" },
    settings: defaultSettings,
    presets,
    planned,
    sessions,
    deferred: [],
    customExercises: [],
  };
}
