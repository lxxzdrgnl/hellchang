/**
 * 종목 동작 설명을 가져온다. 컴포넌트가 fetch 를 직접 부르지 않게 여기로 모은다 —
 * RN 으로 갈 때 base URL 만 바뀌면 된다.
 */
const cache = new Map<string, string[]>();

export async function fetchExerciseGuide(id: string): Promise<string[]> {
  const hit = cache.get(id);
  if (hit) return hit;

  try {
    const res = await fetch(`/api/exercises/${encodeURIComponent(id)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { steps?: string[] };
    const steps = data.steps ?? [];
    cache.set(id, steps);
    return steps;
  } catch {
    // 헬스장 지하에서 열면 실패한다. 가이드가 없다고 화면이 멈출 이유는 없다.
    return [];
  }
}
