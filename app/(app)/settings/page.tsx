"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/components/app-store";
import { ArmMark } from "@/components/logo";
import { Sheet } from "@/components/sheet";
import { completedSets } from "@/lib/progress";
import { updateSettings } from "@/lib/store";

export default function SettingsPage() {
  const { state, update, reset, ready } = useStore();
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);
  const [editingRest, setEditingRest] = useState(false);

  if (!ready) return null;

  const totalSets = state.sessions.reduce(
    (a, s) => a + s.exercises.reduce((b, e) => b + completedSets(e.sets).length, 0),
    0,
  );
  const totalVolume = state.sessions.reduce(
    (a, s) =>
      a +
      s.exercises.reduce(
        (b, e) =>
          b +
          completedSets(e.sets).reduce(
            (c, x) => c + (x.actualWeight ?? x.plannedWeight) * (x.actualReps ?? x.plannedReps),
            0,
          ),
        0,
      ),
    0,
  );

  return (
    <>
      <header className="shrink-0 px-4 pb-2 pt-4">
        <h1 className="text-screen font-bold text-ink">설정</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-6">
        <section className="flex items-center gap-3 rounded-card bg-surface p-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent-tint text-accent">
            <ArmMark size={26} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-title font-semibold text-ink">
              {state.user?.nickname ?? "손님"}
            </span>
            <span className="text-micro text-sub">
              {state.user?.provider === "google" ? "구글" : "카카오"}로 로그인
            </span>
          </div>
        </section>

        <section className="flex gap-2">
          <Stat label="누적 세트" value={totalSets.toLocaleString()} />
          <Stat label="누적 볼륨" value={`${Math.round(totalVolume / 1000).toLocaleString()}t`} />
          <Stat label="운동한 날" value={`${state.sessions.length}일`} />
        </section>

        <section className="flex flex-col overflow-hidden rounded-card bg-surface">
          <button
            type="button"
            onClick={() => setEditingRest(true)}
            className="flex items-center justify-between border-b border-line/60 px-4 py-3.5 text-left active:bg-surface-2"
          >
            <span className="text-body text-ink-2">휴식 기본값</span>
            <span className="text-meta text-sub">
              주운동 {formatRest(state.settings.mainRestSec)} · 보조{" "}
              {formatRest(state.settings.accessoryRestSec)} ›
            </span>
          </button>
          <Item label="단위" value="kg" />
          <Item label="주 시작" value="월요일" />
        </section>

        <p className="px-1 text-micro leading-relaxed text-sub">
          여기서 정한 값은 앞으로 넣는 운동에 붙는다. 이미 넣어둔 운동의 휴식은
          그 운동에 저장돼 있어 바뀌지 않는다.
        </p>

        <p className="px-1 pt-1 text-micro leading-relaxed text-sub">
          지금은 목업이라 기록이 이 브라우저에만 저장된다. 서버가 붙으면 폰과 PC에서
          같은 기록이 보인다.
        </p>

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="h-12 rounded-btn border border-line text-meta font-medium text-ink-2 active:bg-surface"
          >
            목업 데이터 처음으로 되돌리기
          </button>
          <button
            type="button"
            onClick={() => {
              update((s) => ({ ...s, user: null }));
              router.replace("/");
            }}
            className="h-12 rounded-btn text-meta font-medium text-sub active:bg-surface"
          >
            로그아웃
          </button>
        </div>
      </div>

      <Sheet open={editingRest} onClose={() => setEditingRest(false)} title="휴식 기본값">
        <div className="flex flex-col gap-4 px-4 pb-5">
          <RestRow
            label="주운동"
            hint="복합 관절 · 무거운 세트"
            seconds={state.settings.mainRestSec}
            onChange={(v) => update((s) => updateSettings(s, { mainRestSec: v }))}
          />
          <RestRow
            label="보조"
            hint="고립 · 마무리 세트"
            seconds={state.settings.accessoryRestSec}
            onChange={(v) => update((s) => updateSettings(s, { accessoryRestSec: v }))}
          />
          <button
            type="button"
            onClick={() => setEditingRest(false)}
            className="h-14 rounded-btn bg-accent text-action font-bold text-bg active:bg-accent-press"
          >
            저장
          </button>
        </div>
      </Sheet>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="처음으로 되돌리기">
        <div className="flex flex-col gap-3 px-4 pb-5">
          <p className="text-meta leading-relaxed text-ink-2">
            지금까지 만든 루틴과 기록이 사라지고 처음 목업 상태로 돌아간다.
          </p>
          <button
            type="button"
            onClick={() => {
              reset();
              setConfirmReset(false);
            }}
            className="h-13 rounded-btn border border-line text-body font-semibold text-ink active:bg-surface-2"
          >
            되돌린다
          </button>
        </div>
      </Sheet>
    </>
  );
}

function formatRest(sec: number): string {
  if (sec >= 60 && sec % 60 === 0) return `${sec / 60}분`;
  if (sec > 60) return `${Math.floor(sec / 60)}분 ${sec % 60}초`;
  return `${sec}초`;
}

/** 15초 단위로 움직인다. 헬스장에서 초 단위로 맞출 일은 없다. */
function RestRow({
  label,
  hint,
  seconds,
  onChange,
}: {
  label: string;
  hint: string;
  seconds: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-card bg-surface-2 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-body font-semibold text-ink">{label}</span>
        <span className="text-micro text-sub">{hint}</span>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChange(Math.max(15, seconds - 15))}
          aria-label={`${label} 휴식 줄이기`}
          className="size-12 rounded-btn bg-bg text-title text-ink-2 active:bg-line"
        >
          −
        </button>
        <span className="text-hero font-bold leading-none text-ink">{formatRest(seconds)}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(600, seconds + 15))}
          aria-label={`${label} 휴식 늘리기`}
          className="size-12 rounded-btn bg-bg text-title text-ink-2 active:bg-line"
        >
          +
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-card bg-surface px-3 py-3">
      <span className="text-micro text-sub">{label}</span>
      <span className="text-title font-bold text-ink">{value}</span>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 px-4 py-3.5 last:border-0">
      <span className="text-body text-ink-2">{label}</span>
      <span className="text-meta text-sub">{value}</span>
    </div>
  );
}
