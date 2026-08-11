/**
 * 근육별 피로도와 회복도.
 *
 * "오늘 뭘 해도 되는지"를 판단하는 데 쓴다. 어제 하체를 털었으면 오늘 스쿼트를
 * 또 하는 건 손해다 — 그 사실이 숫자가 아니라 그림으로 보여야 한다.
 *
 * 순수 함수다. RN 에서 그대로 쓴다.
 */
import { fromISO } from "./date";
import { completedSets } from "./progress";
import type { Session } from "./types";

/** 근육 하나에 쌓인 자극 */
export interface MuscleLoad {
  /** 0(완전 회복) ~ 1(방금 털었다) */
  fatigue: number;
  /** 마지막으로 건드린 날. 없으면 null */
  lastDate: string | null;
  /** 최근 7일 볼륨 합 */
  volume: number;
}

/**
 * 보조 근육은 주 타겟만큼 털리지 않는다. 벤치프레스에서 삼두가 쓰이긴 해도
 * 삼두 고립 운동만큼은 아니다.
 */
const SECONDARY_WEIGHT = 0.4;

/**
 * 큰 근육은 오래 걸리고 작은 근육은 빨리 돌아온다. 대략의 회복 시간(시간 단위)이며,
 * 정확할 필요는 없다 — 오늘 이 부위를 또 해도 되는지만 가늠하면 된다.
 */
const RECOVERY_HOURS: Record<string, number> = {
  대퇴사두근: 72,
  햄스트링: 72,
  둔근: 72,
  광배근: 72,
  기립근: 72,
  대흉근: 60,
  가슴: 60,
  윗가슴: 60,
  아랫가슴: 60,
  승모근: 48,
  "등 중앙": 48,
  전면삼각근: 48,
  측면삼각근: 48,
  후면삼각근: 48,
  이두근: 48,
  삼두근: 48,
  종아리: 36,
  전완근: 36,
  상복부: 36,
  하복부: 36,
  복사근: 36,
  내전근: 48,
  외전근: 48,
};

const DEFAULT_RECOVERY_HOURS = 48;

interface ExerciseMeta {
  targetMuscles: string[];
  secondaryMuscles: string[];
}

/**
 * 최근 세션에서 근육별 부하를 모은다.
 *
 * 볼륨을 그대로 쓰지 않고 회복 시간으로 나눈 뒤 감쇠시킨다. 스쿼트 한 세션의
 * 볼륨은 사이드 레터럴 열 세션보다 크지만, 그렇다고 어깨가 멀쩡하다는 뜻은
 * 아니기 때문이다. 부위마다 "한 번 제대로 한 양"이 다르다.
 */
export function muscleLoads(
  sessions: Session[],
  lookupMeta: (exerciseId: string) => ExerciseMeta | undefined,
  now: Date = new Date(),
): Map<string, MuscleLoad> {
  const out = new Map<string, MuscleLoad>();

  const add = (muscle: string, volume: number, date: string, weight: number) => {
    const hours = hoursSince(date, now);
    const recovery = RECOVERY_HOURS[muscle] ?? DEFAULT_RECOVERY_HOURS;
    // 회복 시간이 지나면 거의 0 이 되도록 지수 감쇠시킨다.
    const decay = Math.exp(-hours / (recovery / 1.6));
    // 볼륨을 부위별 기준량으로 정규화한다. 3000kg 정도면 한 번 제대로 한 것.
    const intensity = Math.min(1, volume / 3000);

    const prev = out.get(muscle) ?? { fatigue: 0, lastDate: null, volume: 0 };
    out.set(muscle, {
      fatigue: Math.min(1, prev.fatigue + intensity * decay * weight),
      lastDate: !prev.lastDate || date > prev.lastDate ? date : prev.lastDate,
      volume: prev.volume + (hours <= 24 * 7 ? volume * weight : 0),
    });
  };

  for (const session of sessions) {
    // 2주보다 오래된 것은 이미 다 회복됐다.
    if (hoursSince(session.date, now) > 24 * 14) continue;

    for (const ex of session.exercises) {
      const meta = lookupMeta(ex.exerciseId);
      if (!meta) continue;

      let volume = 0;
      for (const s of completedSets(ex.sets)) {
        volume += (s.actualWeight ?? s.plannedWeight) * (s.actualReps ?? s.plannedReps);
      }
      if (volume === 0) continue;

      for (const m of meta.targetMuscles) add(m, volume, session.date, 1);
      for (const m of meta.secondaryMuscles) add(m, volume, session.date, SECONDARY_WEIGHT);
    }
  }

  return out;
}

function hoursSince(date: string, now: Date): number {
  // 날짜만 있으므로 그날 정오에 한 것으로 친다. 시각까지 따질 정밀도가 아니다.
  const then = fromISO(date);
  then.setHours(12, 0, 0, 0);
  return Math.max(0, (now.getTime() - then.getTime()) / 3600000);
}

/** 화면에 쓰는 회복도(%). 피로도의 반대다. */
export function recoveryPercent(load: MuscleLoad | undefined): number {
  if (!load) return 100;
  return Math.round((1 - load.fatigue) * 100);
}

export interface PartSummary {
  bodyPart: string;
  recovery: number;
  lastDate: string | null;
  volume: number;
}

/** 부위 대분류로 묶은 요약. 그 부위에서 가장 지친 근육을 대표로 삼는다. */
export function summarizeByPart(
  loads: Map<string, MuscleLoad>,
  muscleToPart: (muscle: string) => string | null,
): PartSummary[] {
  const byPart = new Map<string, { fatigue: number; lastDate: string | null; volume: number }>();

  for (const [muscle, load] of loads) {
    const part = muscleToPart(muscle);
    if (!part) continue;
    const prev = byPart.get(part) ?? { fatigue: 0, lastDate: null, volume: 0 };
    byPart.set(part, {
      fatigue: Math.max(prev.fatigue, load.fatigue),
      lastDate:
        !prev.lastDate || (load.lastDate && load.lastDate > prev.lastDate)
          ? load.lastDate
          : prev.lastDate,
      volume: prev.volume + load.volume,
    });
  }

  return [...byPart.entries()]
    .map(([bodyPart, v]) => ({
      bodyPart,
      recovery: Math.round((1 - v.fatigue) * 100),
      lastDate: v.lastDate,
      volume: Math.round(v.volume),
    }))
    .sort((a, b) => a.recovery - b.recovery);
}
