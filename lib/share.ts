/**
 * 루틴을 URL 로 공유한다.
 *
 * 서버에 저장하지 않고 링크 자체에 루틴을 담는다 — 목업 단계에서 백엔드 없이
 * 도는 것이 첫째 이유이고, 링크를 받은 사람이 로그인 없이 열어볼 수 있는 것이
 * 둘째다. 루틴 하나는 수백 바이트라 URL 에 들어간다.
 *
 * 순수 함수라 RN 에서도 그대로 쓴다(딥링크로 같은 문자열을 넘긴다).
 */
import type { RoutinePreset, WorkExercise } from "./types";

/** 링크에 담는 최소 형태. 키를 한 글자로 줄여 URL 을 짧게 만든다. */
interface Packed {
  n: string;
  e: { x: string; r: 0 | 1; t: number; s: [number, number][] }[];
}

export function packPreset(preset: RoutinePreset): string {
  const packed: Packed = {
    n: preset.name,
    e: preset.exercises.map((ex) => ({
      x: ex.exerciseId,
      r: ex.role === "주운동" ? 0 : 1,
      t: ex.restSec,
      s: ex.sets.map((s) => [s.plannedWeight, s.plannedReps] as [number, number]),
    })),
  };
  return toBase64Url(JSON.stringify(packed));
}

export function unpackPreset(code: string): { name: string; exercises: Omit<WorkExercise, "id">[] } | null {
  try {
    const packed = JSON.parse(fromBase64Url(code)) as Packed;
    if (!packed?.n || !Array.isArray(packed.e)) return null;
    return {
      name: packed.n,
      exercises: packed.e.map((e) => ({
        exerciseId: e.x,
        role: e.r === 0 ? "주운동" : "보조",
        restSec: e.t,
        sets: e.s.map(([weight, reps]) => ({
          id: "",
          plannedWeight: weight,
          plannedReps: reps,
          actualWeight: null,
          actualReps: null,
          completedAt: null,
        })),
      })),
    };
  } catch {
    return null;
  }
}

/**
 * 한글 이름이 들어가므로 UTF-8 을 거쳐야 한다. btoa 는 라틴만 받는다.
 * 그리고 URL 에 그대로 넣으려면 +/= 를 바꿔야 한다.
 */
function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code: string): string {
  const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function shareUrl(preset: RoutinePreset, origin: string): string {
  return `${origin}/r/${packPreset(preset)}`;
}
