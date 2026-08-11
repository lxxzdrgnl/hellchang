/**
 * 앱 전체가 쓰는 타입. 순수 TypeScript 다 — DOM 을 모른다.
 * RN 으로 넘어갈 때 이 파일은 그대로 간다.
 */

export type BodyPart = "등" | "하체" | "가슴" | "어깨" | "팔" | "복근";

export const BODY_PARTS: BodyPart[] = ["등", "하체", "가슴", "어깨", "팔", "복근"];

export type Role = "주운동" | "보조";

export interface Exercise {
  id: string;
  nameKo: string;
  nameEn: string | null;
  bodyPart: BodyPart;
  targetMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  mechanic: string | null;
  force: string | null;
  level: string | null;
  category: string | null;
  instructions: string[];
  imageUrl: string | null;
  videoUrl: string | null;
  defaultRestSec: number;
}

/** 프리셋·세션이 공유하는 세트 한 줄. 계획과 실제를 같이 들고 있다. */
export interface WorkSet {
  id: string;
  plannedWeight: number;
  plannedReps: number;
  /** 실제로 든 것. completedAt 이 null 이면 아직 안 한 세트다. */
  actualWeight: number | null;
  actualReps: number | null;
  completedAt: string | null;
}

export interface WorkExercise {
  id: string;
  exerciseId: string;
  role: Role;
  restSec: number;
  sets: WorkSet[];
}

/** 재사용 템플릿. "등하는날" */
export interface RoutinePreset {
  id: string;
  name: string;
  memo: string | null;
  exercises: WorkExercise[];
}

export type SessionStatus = "진행중" | "완료";

/**
 * 특정 날짜의 실제 운동. 프리셋의 스냅샷이다 —
 * 오늘 중량을 올려도 프리셋은 그대로고, 프리셋을 고쳐도 지난 기록은 안 변한다.
 */
export interface Session {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  presetId: string | null;
  status: SessionStatus;
  deferredFrom: string | null;
  exercises: WorkExercise[];
}

/** "이 날짜에 이 프리셋을 한다". 요일이 아니라 날짜다. */
export interface PlannedDay {
  id: string;
  date: string; // YYYY-MM-DD
  presetId: string;
  deferredFrom: string | null;
}

/** 같은 역할 안에서 몇 번째인지. 저장하지 않고 순서에서 매긴다. */
export function roleLabel(exercises: WorkExercise[], index: number): string {
  const { role } = exercises[index];
  if (role === "주운동") return "주운동";
  let n = 0;
  for (let i = 0; i <= index; i++) if (exercises[i].role === "보조") n++;
  return `보조${n}`;
}
