"use client";

/**
 * 기록 — 무엇을 얼마나 했는지. 종목을 고르면 상세로 간다.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/components/app-store";
import { BodyMap } from "@/components/body-map";
import { getExercise } from "@/lib/exercises";
import { formatKo } from "@/lib/date";
import { completedSets, estimateOneRepMax, sessionVolume } from "@/lib/progress";
import { muscleLoads, summarizeByPart } from "@/lib/recovery";
import { BODY_PARTS, type BodyPart } from "@/lib/types";

/** 근육 → 부위. 회복도 요약에 쓴다. */
const MUSCLE_TO_PART: Record<string, string> = {
  대흉근: "가슴", 가슴: "가슴", 윗가슴: "가슴", 아랫가슴: "가슴",
  광배근: "등", 승모근: "등", "등 중앙": "등", 기립근: "등",
  전면삼각근: "어깨", 측면삼각근: "어깨", 후면삼각근: "어깨", 어깨: "어깨",
  이두근: "팔", 삼두근: "팔", 전완근: "팔",
  대퇴사두근: "하체", 햄스트링: "하체", 둔근: "하체", 종아리: "하체",
  내전근: "하체", 외전근: "하체",
  상복부: "복근", 하복부: "복근", 복사근: "복근", 복근: "복근",
};

export default function HistoryPage() {
  const { state, ready } = useStore();
  const [tab, setTab] = useState<"종목" | "날짜">("종목");
  const [part, setPart] = useState<BodyPart | null>(null);

  const rows = useMemo(() => {
    const map = new Map<
      string,
      { id: string; count: number; lastDate: string; best: number; lastWeight: number }
    >();
    for (const session of state.sessions) {
      for (const ex of session.exercises) {
        const done = completedSets(ex.sets);
        if (done.length === 0) continue;
        const cur = map.get(ex.exerciseId) ?? {
          id: ex.exerciseId,
          count: 0,
          lastDate: "",
          best: 0,
          lastWeight: 0,
        };
        cur.count += 1;
        for (const s of done) {
          const w = s.actualWeight ?? s.plannedWeight;
          const r = s.actualReps ?? s.plannedReps;
          cur.best = Math.max(cur.best, estimateOneRepMax(w, r));
          if (session.date >= cur.lastDate) cur.lastWeight = Math.max(cur.lastWeight, w);
        }
        if (session.date > cur.lastDate) cur.lastDate = session.date;
        map.set(ex.exerciseId, cur);
      }
    }
    let list = [...map.values()];
    if (part) list = list.filter((r) => getExercise(r.id)?.bodyPart === part);
    return list.sort((a, b) => b.lastDate.localeCompare(a.lastDate) || b.count - a.count);
  }, [state.sessions, part]);

  const recoveryLevels = useMemo(() => {
    const loads = muscleLoads(state.sessions, (id) => getExercise(id));
    const m = new Map<string, number>();
    for (const [muscle, load] of loads) m.set(muscle, load.fatigue);
    return m;
  }, [state.sessions]);

  const tiredParts = useMemo(() => {
    const loads = muscleLoads(state.sessions, (id) => getExercise(id));
    return summarizeByPart(loads, (mus) => MUSCLE_TO_PART[mus] ?? null)
      .filter((p) => p.recovery < 60)
      .map((p) => p.bodyPart);
  }, [state.sessions]);

  const doneSessions = useMemo(
    () => [...state.sessions].filter((s) => s.status === "완료").sort((a, b) => b.date.localeCompare(a.date)),
    [state.sessions],
  );

  if (!ready) return null;

  return (
    <>
      <header className="shrink-0 px-4 pb-2 pt-4">
        <h1 className="text-screen font-bold text-ink">기록</h1>
        <div className="mt-3 flex gap-1 rounded-btn bg-surface p-1">
          {(["종목", "날짜"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`h-9 flex-1 rounded-[9px] text-meta font-semibold transition-colors ${
                tab === t ? "bg-accent-tint text-accent" : "text-sub"
              }`}
            >
              {t}별로
            </button>
          ))}
        </div>

        {tab === "종목" && (
          <div className="-mx-4 mt-2.5 flex gap-1.5 overflow-x-auto overflow-y-hidden px-4 pb-1">
            <Chip active={part === null} onClick={() => setPart(null)}>
              전체
            </Chip>
            {BODY_PARTS.map((p) => (
              <Chip key={p} active={part === p} onClick={() => setPart(part === p ? null : p)}>
                {p}
              </Chip>
            ))}
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6">
        <Link
          href="/history/recovery"
          className="mx-4 mb-2 flex shrink-0 items-center gap-3 rounded-card bg-surface px-4 py-3 active:bg-surface-2"
        >
          <BodyMap primary={[]} levels={recoveryLevels} size={30} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-body font-semibold text-ink">근육 회복도</span>
            <span className="truncate text-micro text-sub">
              {tiredParts.length > 0
                ? `${tiredParts.join(" · ")} 아직 덜 풀렸습니다`
                : "전부 회복됐습니다"}
            </span>
          </span>
          <span className="shrink-0 text-sub">›</span>
        </Link>

        {tab === "종목" ? (
          <>
            <ul className="flex shrink-0 flex-col gap-1.5 px-4">
              {rows.map((r) => {
                const meta = getExercise(r.id);
                return (
                  <li key={r.id}>
                    <Link
                      href={`/history/${r.id}`}
                      className="flex items-center gap-3 rounded-card bg-surface px-3 py-2.5 active:bg-surface-2"
                    >
                      <BodyMap
                        primary={meta?.targetMuscles ?? []}
                        secondary={meta?.secondaryMuscles ?? []}
                        bodyPart={meta?.bodyPart}
                        size={30}
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-body font-semibold text-ink">
                          {meta?.nameKo ?? r.id}
                        </span>
                        <span className="truncate text-micro text-sub">
                          {r.count}회 · 마지막 {r.lastDate.slice(5).replace("-", "/")}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end">
                        <span className="text-weight font-bold text-ink">
                          {Math.round(r.best)}
                          <span className="pl-0.5 text-micro font-medium text-sub">kg</span>
                        </span>
                        <span className="text-micro text-sub">추정 1RM</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
              {rows.length === 0 && (
                <li className="px-4 py-10 text-center text-meta text-sub">아직 기록이 없습니다</li>
              )}
            </ul>
          </>
        ) : (
          <ul className="flex shrink-0 flex-col gap-1.5 px-4 pt-2">
            {doneSessions.map((s) => {
              const done = s.exercises.reduce((a, e) => a + completedSets(e.sets).length, 0);
              return (
                <li key={s.id} className="rounded-card bg-surface px-4 py-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-body font-semibold text-ink">{s.title}</span>
                    <span className="text-micro text-sub">{formatKo(s.date)}</span>
                  </div>
                  <p className="pt-0.5 text-micro text-sub">
                    {s.exercises.length}종목 · {done}세트 ·{" "}
                    <span className="text-ink-2">{sessionVolume(s).toLocaleString()}kg</span>
                  </p>
                </li>
              );
            })}
            {doneSessions.length === 0 && (
              <li className="px-4 py-10 text-center text-meta text-sub">완료한 운동이 없습니다</li>
            )}
          </ul>
        )}
      </div>
    </>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 shrink-0 rounded-pill border px-3 text-meta font-medium ${
        active ? "border-accent bg-accent-tint text-accent" : "border-line bg-surface text-ink-2"
      }`}
    >
      {children}
    </button>
  );
}
