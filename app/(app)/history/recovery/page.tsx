"use client";

/**
 * 근육 회복도.
 *
 * "오늘 뭘 해도 되는지"를 그림으로 답한다. 어제 하체를 털었으면 오늘 스쿼트를
 * 또 하는 건 손해인데, 그 사실이 기록 표에는 안 보인다. 부위가 얼마나 지쳐
 * 있는지 색으로 보이면 오늘 루틴을 고를 때 바로 쓰인다.
 */
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { BodyMap } from "@/components/body-map";
import { useStore } from "@/components/app-store";
import { getExercise } from "@/lib/exercises";
import { relativeKo, todayISO } from "@/lib/date";
import { muscleLoads, summarizeByPart, type MuscleLoad } from "@/lib/recovery";

/** 근육 → 부위 대분류. 요약 표를 만들 때 쓴다. */
const MUSCLE_TO_PART: Record<string, string> = {
  대흉근: "가슴", 가슴: "가슴", 윗가슴: "가슴", 아랫가슴: "가슴",
  광배근: "등", 승모근: "등", "등 중앙": "등", 기립근: "등",
  전면삼각근: "어깨", 측면삼각근: "어깨", 후면삼각근: "어깨", 어깨: "어깨",
  이두근: "팔", 삼두근: "팔", 전완근: "팔",
  대퇴사두근: "하체", 햄스트링: "하체", 둔근: "하체", 종아리: "하체",
  내전근: "하체", 외전근: "하체",
  상복부: "복근", 하복부: "복근", 복사근: "복근", 복근: "복근",
};

export default function RecoveryPage() {
  const router = useRouter();
  const { state, ready } = useStore();
  const today = todayISO();

  const loads = useMemo(
    () => muscleLoads(state.sessions, (id) => getExercise(id)),
    [state.sessions],
  );

  const levels = useMemo(() => {
    const m = new Map<string, number>();
    for (const [muscle, load] of loads) m.set(muscle, load.fatigue);
    return m;
  }, [loads]);

  const parts = useMemo(
    () => summarizeByPart(loads, (m) => MUSCLE_TO_PART[m] ?? null),
    [loads],
  );

  if (!ready) return null;

  const tired = parts.filter((p) => p.recovery < 60);
  const fresh = parts.filter((p) => p.recovery >= 90);

  return (
    <>
      <header className="flex shrink-0 items-center gap-1 px-2 pb-1 pt-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로"
          className="size-10 rounded-btn text-title text-ink-2 active:bg-surface"
        >
          ‹
        </button>
        <h1 className="text-screen font-bold text-ink">근육 회복도</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-6 pt-1">
        <section className="flex shrink-0 flex-col items-center gap-3 rounded-card bg-surface p-4">
          <BodyMap primary={[]} levels={levels} size={104} />

          <div className="flex w-full items-center gap-3">
            <span className="text-micro text-sub">회복됨</span>
            <div
              className="h-1.5 flex-1 rounded-pill"
              style={{
                background:
                  "linear-gradient(90deg, var(--line), color-mix(in srgb, var(--accent) 65%, var(--line)), var(--accent))",
              }}
            />
            <span className="text-micro text-accent">방금 털림</span>
          </div>

          <p className="text-center text-meta leading-relaxed text-ink-2">
            {tired.length > 0 ? (
              <>
                <b className="text-ink">{tired.map((p) => p.bodyPart).join(" · ")}</b> 는 아직
                덜 풀렸습니다. 오늘은 {fresh.length > 0 ? fresh.map((p) => p.bodyPart).join(" · ") : "다른 부위"} 쪽이 낫습니다.
              </>
            ) : (
              "전부 회복됐습니다. 오늘은 아무 부위나 해도 됩니다."
            )}
          </p>
        </section>

        <section className="flex shrink-0 flex-col gap-1.5">
          <h2 className="px-1 text-title font-semibold text-ink">부위별</h2>
          {parts.map((p) => (
            <div key={p.bodyPart} className="flex items-center gap-3 rounded-card bg-surface px-4 py-3">
              <span className="w-10 shrink-0 text-body font-semibold text-ink">{p.bodyPart}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-pill bg-surface-2">
                <div
                  className="h-full rounded-pill transition-[width] duration-500"
                  style={{
                    width: `${p.recovery}%`,
                    backgroundColor:
                      p.recovery >= 90
                        ? "var(--accent)"
                        : p.recovery >= 60
                          ? "color-mix(in srgb, var(--accent) 70%, var(--line))"
                          : "var(--amber)",
                  }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-meta font-semibold text-ink-2">
                {p.recovery}%
              </span>
              <span className="w-14 shrink-0 text-right text-micro text-sub">
                {p.lastDate ? relativeKo(p.lastDate, today) : "—"}
              </span>
            </div>
          ))}

          {parts.length === 0 && (
            <p className="rounded-card bg-surface px-4 py-8 text-center text-meta text-sub">
              최근 2주 기록이 없습니다
            </p>
          )}
        </section>

        <section className="flex shrink-0 flex-col gap-1.5">
          <h2 className="px-1 text-title font-semibold text-ink">최근 7일 볼륨</h2>
          {parts
            .filter((p) => p.volume > 0)
            .sort((a, b) => b.volume - a.volume)
            .map((p) => (
              <div
                key={p.bodyPart}
                className="flex items-center justify-between rounded-card bg-surface px-4 py-2.5"
              >
                <span className="text-body text-ink-2">{p.bodyPart}</span>
                <span className="text-body font-semibold text-ink">
                  {p.volume.toLocaleString()}
                  <span className="pl-1 text-micro font-medium text-sub">kg</span>
                </span>
              </div>
            ))}
        </section>

        <p className="px-1 text-micro leading-relaxed text-sub">
          회복 시간은 부위마다 다르게 잡았습니다 — 큰 근육(하체·등)은 72시간, 어깨·팔은
          48시간, 복근·종아리는 36시간 기준입니다. 보조로 쓰인 근육은 주 타겟의 40%만
          쌓입니다. 정확한 생리학이 아니라 오늘 무엇을 할지 고르는 데 쓰는 눈금입니다.
        </p>
      </div>
    </>
  );
}

// 요약 계산은 lib/recovery.ts 가 한다. 이 파일은 그리기만 한다.
export type { MuscleLoad };
