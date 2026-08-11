"use client";

/**
 * 종목 상세 — 이 운동이 무엇이고, 내가 얼마나 늘었는지.
 *
 * 위쪽은 종목 자체(그림·타겟·장비), 아래쪽은 내 기록(그래프·세트 표).
 * 둘을 한 화면에 둔 이유는, 무게를 올릴지 말지 판단할 때 자세 정보와
 * 지난 기록을 같이 보기 때문이다.
 */
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { BodyMap } from "@/components/body-map";
import { useStore } from "@/components/app-store";
import { ExerciseVideo } from "@/components/exercise-video";
import { ProgressChart } from "@/components/progress-chart";
import { formatWeight } from "@/components/set-ladder";
import { getExercise } from "@/lib/exercises";
import { formatKo } from "@/lib/date";
import { completedSets, exerciseHistory, personalRecordDates } from "@/lib/progress";
import { fetchExerciseGuide } from "@/lib/api/exercise-guide";

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, ready } = useStore();
  const [metric, setMetric] = useState<"1rm" | "volume">("1rm");
  const [tab, setTab] = useState<"기록" | "가이드">("기록");
  const [guide, setGuide] = useState<string[] | null>(null);

  useEffect(() => {
    if (tab !== "가이드" || guide !== null) return;
    let alive = true;
    fetchExerciseGuide(id).then((steps) => alive && setGuide(steps));
    return () => {
      alive = false;
    };
  }, [tab, guide, id]);

  const meta = getExercise(id);
  const points = useMemo(() => exerciseHistory(state.sessions, id), [state.sessions, id]);
  const prDates = useMemo(() => personalRecordDates(points), [points]);

  const rows = useMemo(() => {
    const out: { date: string; sets: { w: number; r: number }[] }[] = [];
    for (const s of [...state.sessions].sort((a, b) => b.date.localeCompare(a.date))) {
      for (const ex of s.exercises) {
        if (ex.exerciseId !== id) continue;
        const done = completedSets(ex.sets);
        if (done.length === 0) continue;
        out.push({
          date: s.date,
          sets: done.map((x) => ({
            w: x.actualWeight ?? x.plannedWeight,
            r: x.actualReps ?? x.plannedReps,
          })),
        });
      }
    }
    return out;
  }, [state.sessions, id]);

  if (!ready) return null;

  const best = points.length ? Math.max(...points.map((p) => p.oneRepMax)) : 0;
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const delta = last && prev ? last.oneRepMax - prev.oneRepMax : 0;

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
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-screen font-bold text-ink">{meta?.nameKo ?? id}</h1>
          {meta?.nameEn && <p className="truncate text-micro text-sub">{meta.nameEn}</p>}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-6 pt-2">
        {meta && (
          <section className="flex shrink-0 flex-col gap-3 rounded-card bg-surface p-4">
            {/* 목록에서는 근육 그림만 쓰지만 여기서는 사진도 같이 둔다 —
                기구가 어떻게 생겼는지는 그림이 답하지 못한다. */}
            <div className="flex items-center gap-4">
              <BodyMap
                primary={meta.targetMuscles}
                secondary={meta.secondaryMuscles}
                bodyPart={meta.bodyPart}
                size={64}
                both
              />
              {meta.imageUrl && (
                <Image
                  src={meta.imageUrl}
                  alt={`${meta.nameKo} 자세`}
                  width={132}
                  height={132}
                  unoptimized
                  className="ml-auto size-[132px] shrink-0 rounded-btn bg-white object-cover"
                />
              )}
            </div>

            <dl className="flex flex-col gap-1.5 border-t border-line pt-3">
              <Row label="주 타겟" value={`${meta.bodyPart} · ${meta.targetMuscles.join(", ")}`} />
              {meta.secondaryMuscles.length > 0 && (
                <Row label="보조" value={meta.secondaryMuscles.join(", ")} />
              )}
              <Row label="장비" value={meta.equipment ?? "—"} />
              <Row label="휴식" value={`${Math.round(meta.defaultRestSec / 60)}분 기본`} />
            </dl>
          </section>
        )}

        <div className="flex shrink-0 gap-1 rounded-btn bg-surface p-1">
          {(["기록", "가이드"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`h-10 flex-1 rounded-[9px] text-meta font-semibold transition-colors ${
                tab === t ? "bg-accent-tint text-accent" : "text-sub"
              }`}
            >
              {t === "기록" ? "내 기록" : "운동 가이드"}
            </button>
          ))}
        </div>

        {tab === "가이드" ? (
          <section className="flex shrink-0 flex-col gap-3 rounded-card bg-surface p-4">
            {meta?.videoUrl && (
              <ExerciseVideo src={meta.videoUrl} poster={meta.posterUrl} label={meta.nameKo} />
            )}
            {guide === null && <p className="py-6 text-center text-meta text-sub">불러오는 중</p>}
            {guide?.length === 0 && (
              <p className="py-6 text-center text-meta leading-relaxed text-sub">
                이 종목은 설명이 없습니다.
                <br />
                직접 추가한 운동이거나 원본에 빠져 있습니다.
              </p>
            )}
            {guide?.map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-tint text-micro font-bold text-accent">
                  {i + 1}
                </span>
                <p className="flex-1 text-body leading-relaxed text-ink-2">{step}</p>
              </div>
            ))}
          </section>
        ) : (
        <>
        <section className="flex shrink-0 flex-col gap-2 rounded-card bg-surface p-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-micro text-sub">최고 추정 1RM</span>
              <span className="text-hero font-bold leading-none text-ink">
                {Math.round(best)}
                <span className="pl-1 text-body font-medium text-sub">kg</span>
              </span>
              {delta !== 0 && (
                <span className={`pt-1 text-micro ${delta > 0 ? "text-accent" : "text-sub"}`}>
                  지난번보다 {delta > 0 ? "+" : ""}
                  {delta.toFixed(1)}kg
                </span>
              )}
            </div>

            <div className="flex gap-1 rounded-btn bg-surface-2 p-1">
              {(
                [
                  ["1rm", "1RM"],
                  ["volume", "볼륨"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMetric(key)}
                  className={`h-8 rounded-[9px] px-3 text-micro font-semibold transition-colors ${
                    metric === key ? "bg-accent-tint text-accent" : "text-sub"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <ProgressChart points={points} prDates={prDates} metric={metric} />

          {prDates.size > 0 && (
            <p className="text-micro text-sub">
              초록 점이 신기록을 세운 날 · 모두 {prDates.size}번
            </p>
          )}
        </section>

        <section className="flex shrink-0 flex-col gap-1.5">
          <h2 className="px-1 text-title font-semibold text-ink">날짜별 세트</h2>
          {rows.map((row) => (
            <div key={row.date} className="rounded-card bg-surface px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-meta font-medium text-ink-2">{formatKo(row.date)}</span>
                {prDates.has(row.date) && (
                  <span className="rounded-pill bg-accent-tint px-2 py-0.5 text-micro font-semibold text-accent">
                    신기록
                  </span>
                )}
              </div>
              <p className="pt-1 font-mono text-meta leading-relaxed text-ink">
                {row.sets.map((s) => `${formatWeight(s.w)}-${s.r}`).join(", ")}
              </p>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="rounded-card bg-surface px-4 py-8 text-center text-meta text-sub">
              아직 이 운동 기록이 없습니다
            </p>
          )}
        </section>
        </>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-14 shrink-0 text-micro text-sub">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-meta text-ink-2">{value}</dd>
    </div>
  );
}
