"use client";

/**
 * 루틴 — 주간 계획과 프리셋 목록.
 *
 * 요일 고정 스케줄이 없다. 주마다 계획이 달라지므로 진짜 데이터는 날짜이고,
 * 반복은 "지난주 그대로 가져오기" 버튼이 대신한다.
 */
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/components/app-store";
import { Sheet } from "@/components/sheet";
import { addDays, formatShort, todayISO, weekDates, weekStart, weekdayKo } from "@/lib/date";
import { copyLastWeek, createPreset, planDay, unplanDay } from "@/lib/store";
import { ShareSheet } from "@/components/share-sheet";
import type { RoutinePreset } from "@/lib/types";

export default function RoutinesPage() {
  const { state, update, ready } = useStore();
  const today = todayISO();
  const [offset, setOffset] = useState(0);
  const [planningDate, setPlanningDate] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [sharing, setSharing] = useState<RoutinePreset | null>(null);

  const start = addDays(weekStart(today), offset * 7);
  const dates = weekDates(start);

  if (!ready) return null;

  const presetName = (id: string) => state.presets.find((p) => p.id === id)?.name ?? "삭제된 루틴";

  return (
    <>
      <header className="flex shrink-0 items-center justify-between px-4 pb-2 pt-4">
        <h1 className="text-screen font-bold text-ink">루틴</h1>
        <div className="flex items-center gap-1">
          <NavButton onClick={() => setOffset((o) => o - 1)} label="지난주">
            ‹
          </NavButton>
          <span className="w-24 text-center text-meta text-ink-2">
            {offset === 0 ? "이번 주" : `${formatShort(start)} 주`}
          </span>
          <NavButton onClick={() => setOffset((o) => o + 1)} label="다음주">
            ›
          </NavButton>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6">
        <section className="flex flex-col gap-1.5">
          {dates.map((date) => {
            const plans = state.planned.filter((d) => d.date === date);
            const sessions = state.sessions.filter((s) => s.date === date);
            const isToday = date === today;

            return (
              <div
                key={date}
                className={`flex items-start gap-3 rounded-card px-3 py-2.5 ${
                  isToday ? "bg-accent-tint" : "bg-surface"
                }`}
              >
                <div className="flex w-11 shrink-0 flex-col items-center pt-0.5">
                  <span className={`text-micro ${isToday ? "text-accent" : "text-sub"}`}>
                    {weekdayKo(date)}
                  </span>
                  <span className={`text-body font-bold ${isToday ? "text-accent" : "text-ink-2"}`}>
                    {Number(date.slice(8))}
                  </span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {sessions.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <span className="truncate text-body font-medium text-ink">{s.title}</span>
                      <span
                        className={`shrink-0 rounded-pill px-2 py-0.5 text-micro ${
                          s.status === "완료"
                            ? "bg-accent-tint text-accent"
                            : "bg-surface-2 text-ink-2"
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                  ))}

                  {plans
                    .filter((p) => !sessions.some((s) => s.presetId === p.presetId))
                    .map((p) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <span className="truncate text-body text-ink-2">{presetName(p.presetId)}</span>
                        {p.deferredFrom && (
                          <span className="shrink-0 text-micro text-amber">미룸</span>
                        )}
                        <button
                          type="button"
                          onClick={() => update((s) => unplanDay(s, p.id))}
                          className="ml-auto shrink-0 px-2 py-1 text-micro text-sub active:text-ink"
                        >
                          빼기
                        </button>
                      </div>
                    ))}

                  {plans.length === 0 && sessions.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setPlanningDate(date)}
                      className="self-start py-0.5 text-meta text-sub active:text-accent"
                    >
                      ＋ 루틴 넣기
                    </button>
                  )}
                </div>

                {(plans.length > 0 || sessions.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setPlanningDate(date)}
                    aria-label={`${date}에 루틴 추가`}
                    className="size-8 shrink-0 rounded-btn text-sub active:bg-surface-2"
                  >
                    ＋
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => update((s) => copyLastWeek(s, start))}
            className="mt-1 h-12 rounded-btn border border-line text-meta font-medium text-ink-2 active:bg-surface"
          >
            지난주 그대로 가져오기
          </button>
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-title font-semibold text-ink">내 루틴</h2>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="text-meta font-medium text-accent"
            >
              ＋ 새 루틴
            </button>
          </div>

          {state.presets.map((p) => (
            <div key={p.id} className="flex items-center rounded-card bg-surface">
              <Link href={`/routines/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-title font-semibold text-ink">{p.name}</span>
                  <span className="text-micro text-sub">
                    {p.exercises.length}종목 ·{" "}
                    {p.exercises.reduce((a, e) => a + e.sets.length, 0)}세트
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setSharing(p)}
                aria-label={`${p.name} 공유`}
                className="mr-1 flex size-11 shrink-0 items-center justify-center rounded-btn text-sub active:bg-surface-2 active:text-accent"
              >
                <ShareIcon />
              </button>
            </div>
          ))}
        </section>
      </div>

      <Sheet
        open={planningDate !== null}
        onClose={() => setPlanningDate(null)}
        title={planningDate ? `${formatShort(planningDate)} 에 넣을 루틴` : ""}
      >
        <div className="flex flex-col gap-2 px-4 pb-5">
          {state.presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                if (planningDate) update((s) => planDay(s, planningDate, p.id));
                setPlanningDate(null);
              }}
              className="flex h-13 items-center justify-between rounded-btn border border-line px-4 text-left active:bg-surface-2"
            >
              <span className="text-body font-medium text-ink">{p.name}</span>
              <span className="text-micro text-sub">{p.exercises.length}종목</span>
            </button>
          ))}
        </div>
      </Sheet>

      <ShareSheet preset={sharing} onClose={() => setSharing(null)} />

      <Sheet open={creating} onClose={() => setCreating(false)} title="새 루틴">
        <div className="flex flex-col gap-3 px-4 pb-5">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="등하는날"
            className="h-12 rounded-btn bg-surface-2 px-3.5 text-body text-ink outline-none placeholder:text-sub focus:ring-2 focus:ring-accent/40"
          />
          <button
            type="button"
            disabled={!newName.trim()}
            onClick={() => {
              update((s) => createPreset(s, newName.trim())[0]);
              setNewName("");
              setCreating(false);
            }}
            className="h-13 rounded-btn bg-accent text-body font-bold text-bg active:bg-accent-press disabled:bg-surface-2 disabled:text-sub"
          >
            만들기
          </button>
        </div>
      </Sheet>
    </>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" aria-hidden="true">
      <path
        d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5M5 13v5.5A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5V13"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NavButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="size-9 rounded-btn text-body text-ink-2 active:bg-surface"
    >
      {children}
    </button>
  );
}
