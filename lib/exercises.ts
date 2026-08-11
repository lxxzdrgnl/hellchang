/**
 * 종목 목록. 목업 단계에서는 번들에 실어 오프라인에서도 검색이 된다.
 * DB 가 붙으면 이 함수들의 몸통만 API 호출로 바뀌고 호출부는 그대로다.
 */
import indexJson from "./mock/exercise-index.json";
import videoJson from "./mock/videos.json";
import type { BodyPart } from "./types";

const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

interface RawIndex {
  id: string;
  ko: string;
  en: string | null;
  p: string;
  t: string[];
  s: string[];
  q: string | null;
  r: number;
  img: string;
}

export interface ExerciseBrief {
  id: string;
  nameKo: string;
  nameEn: string | null;
  bodyPart: BodyPart;
  targetMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  defaultRestSec: number;
  imageUrl: string | null;
  /** 동작 데모 영상. 손으로 맞춘 90종목만 있습니다. */
  videoUrl: string | null;
  posterUrl: string | null;
}

const videos = videoJson as Record<string, { v: string; p: string }>;

const all: ExerciseBrief[] = (indexJson as RawIndex[]).map((r) => ({
  id: r.id,
  nameKo: r.ko,
  nameEn: r.en,
  bodyPart: r.p as BodyPart,
  targetMuscles: r.t,
  secondaryMuscles: r.s ?? [],
  equipment: r.q,
  defaultRestSec: r.r,
  imageUrl: r.img ? `${IMAGE_BASE}/${r.img}` : null,
  videoUrl: videos[r.id]?.v ?? null,
  posterUrl: videos[r.id]?.p ?? null,
}));

const byId = new Map(all.map((e) => [e.id, e]));

/**
 * 직접 추가한 종목. 저장은 AppState 가 하고, 여기에는 조회용으로 등록만 한다 —
 * 컴포넌트마다 "기본 목록에 없으면 store 를 뒤진다"를 반복하지 않기 위해서다.
 */
let custom: ExerciseBrief[] = [];

export function registerCustomExercises(list: ExerciseBrief[]): void {
  for (const e of custom) byId.delete(e.id);
  custom = list;
  for (const e of list) byId.set(e.id, e);
}

export function getExercise(id: string): ExerciseBrief | undefined {
  return byId.get(id);
}

export function customExercises(): ExerciseBrief[] {
  return custom;
}

export function exerciseName(id: string): string {
  return byId.get(id)?.nameKo ?? id;
}

export function allExercises(): ExerciseBrief[] {
  return [...custom, ...all];
}

/**
 * 검색. 한국어와 영어 양쪽으로 찾는다 — 헬스장에서 통용되는 이름이
 * 영어인 경우가 많고, 데이터셋 이름도 영어다.
 */
export function searchExercises(
  query: string,
  bodyPart: BodyPart | null,
  limit = 60,
): ExerciseBrief[] {
  const q = query.trim().toLowerCase();
  const pool = [...custom, ...all];
  let rows = bodyPart ? pool.filter((e) => e.bodyPart === bodyPart) : pool;

  if (q) {
    const scored: [number, ExerciseBrief][] = [];
    for (const e of rows) {
      const ko = e.nameKo.toLowerCase();
      const en = (e.nameEn ?? "").toLowerCase();
      // 앞에서 맞은 것이 위로. 헬스장에서는 이름 앞부분을 친다.
      if (ko.startsWith(q) || en.startsWith(q)) scored.push([0, e]);
      else if (ko.includes(q) || en.includes(q)) scored.push([1, e]);
      else if (e.targetMuscles.some((m) => m.includes(q))) scored.push([2, e]);
    }
    scored.sort((a, b) => a[0] - b[0] || a[1].nameKo.length - b[1].nameKo.length);
    rows = scored.map(([, e]) => e);
  }

  return rows.slice(0, limit);
}

/** 종목 목록에서 세부 부위 칩을 만든다. 그 부위에 실제로 있는 것만 보여준다. */
export function targetMusclesOf(bodyPart: BodyPart): string[] {
  const set = new Set<string>();
  for (const e of [...custom, ...all]) {
    if (e.bodyPart !== bodyPart) continue;
    for (const m of e.targetMuscles) set.add(m);
  }
  return [...set].sort();
}
