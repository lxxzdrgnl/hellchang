/**
 * 진척 계산. 완료된 세트(actual*)만 본다 — 계획을 고쳐도 그래프가 흔들리지 않게.
 * 순수 함수라 RN 에서 그대로 쓴다.
 */
import type { Session, WorkSet } from "./types";

/** Epley. 중량과 반복이 같이 움직여도 한 숫자로 비교할 수 있게 한다. */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function completedSets(sets: WorkSet[]): WorkSet[] {
  return sets.filter((s) => s.completedAt !== null);
}

function actual(s: WorkSet): { weight: number; reps: number } {
  return { weight: s.actualWeight ?? s.plannedWeight, reps: s.actualReps ?? s.plannedReps };
}

export interface DayPoint {
  date: string;
  /** 그날 세트 중 추정 1RM 이 가장 높은 값 */
  oneRepMax: number;
  /** Σ 중량 × 횟수 */
  volume: number;
  topWeight: number;
  setCount: number;
}

/** 한 종목의 날짜별 추이. 오래된 것부터. */
export function exerciseHistory(sessions: Session[], exerciseId: string): DayPoint[] {
  const byDate = new Map<string, WorkSet[]>();

  for (const session of sessions) {
    for (const ex of session.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      const done = completedSets(ex.sets);
      if (done.length === 0) continue;
      byDate.set(session.date, [...(byDate.get(session.date) ?? []), ...done]);
    }
  }

  return [...byDate.entries()]
    .map(([date, sets]) => {
      let oneRepMax = 0;
      let volume = 0;
      let topWeight = 0;
      for (const s of sets) {
        const { weight, reps } = actual(s);
        oneRepMax = Math.max(oneRepMax, estimateOneRepMax(weight, reps));
        volume += weight * reps;
        topWeight = Math.max(topWeight, weight);
      }
      return { date, oneRepMax, volume, topWeight, setCount: sets.length };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 그날이 그때까지의 최고 기록이면 신기록. 첫날은 신기록으로 치지 않는다. */
export function personalRecordDates(points: DayPoint[]): Set<string> {
  const prs = new Set<string>();
  let best = 0;
  points.forEach((p, i) => {
    if (i > 0 && p.oneRepMax > best) prs.add(p.date);
    best = Math.max(best, p.oneRepMax);
  });
  return prs;
}

export interface SessionProgress {
  done: number;
  total: number;
  ratio: number;
}

export function sessionProgress(session: Session): SessionProgress {
  let done = 0;
  let total = 0;
  for (const ex of session.exercises) {
    total += ex.sets.length;
    done += completedSets(ex.sets).length;
  }
  return { done, total, ratio: total === 0 ? 0 : done / total };
}

export function sessionVolume(session: Session): number {
  let volume = 0;
  for (const ex of session.exercises) {
    for (const s of completedSets(ex.sets)) {
      const { weight, reps } = actual(s);
      volume += weight * reps;
    }
  }
  return volume;
}
