"use client";

/**
 * 공유받은 루틴 미리보기.
 *
 * 링크 자체에 루틴이 들어 있어 로그인 없이 열린다. 담기를 누르면 그때
 * 내 루틴으로 복사된다 — 복사본이므로 원본이 바뀌어도 내 것은 그대로다.
 */
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BodyMap } from "@/components/body-map";
import { useStore } from "@/components/app-store";
import { ArmMark } from "@/components/logo";
import { formatWeight } from "@/components/set-ladder";
import { estimateMinutes } from "@/components/plan-card";
import { getExercise } from "@/lib/exercises";
import { unpackPreset } from "@/lib/share";
import { makeSet, newId } from "@/lib/store";

export default function SharedRoutinePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { update, ready } = useStore();

  const [saved, setSaved] = useState(false);
  const shared = useMemo(() => unpackPreset(code), [code]);

  if (!shared) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-title font-semibold text-ink">링크를 읽을 수 없습니다</h1>
        <p className="text-center text-meta leading-relaxed text-sub">
          주소가 잘렸거나 잘못된 링크입니다. 보낸 사람에게 다시 받아야 합니다.
        </p>
      </main>
    );
  }

  const totalSets = shared.exercises.reduce((a, e) => a + e.sets.length, 0);
  const minutes = estimateMinutes({ exercises: shared.exercises });

  function save() {
    const id = newId("preset");
    update((s) => ({
      ...s,
      presets: [
        ...s.presets,
        {
          id,
          name: shared!.name,
          memo: null,
          exercises: shared!.exercises.map((e) => ({
            ...e,
            id: newId("we"),
            sets: e.sets.map((x) => makeSet(x.plannedWeight, x.plannedReps)),
          })),
        },
      ],
    }));
    setSaved(true);
    // push 면 뒤로가기가 공유 화면으로 돌아옵니다. 이미 담았는데 또 담으라는
    // 화면이 나오는 셈이라 replace 로 갈아치웁니다.
    router.replace(`/routines/${id}`);
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-2 px-4 pb-3 pt-5">
        <ArmMark size={26} className="text-accent" />
        <span className="text-meta text-sub">헬창에서 공유한 루틴</span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
        <div className="flex shrink-0 flex-col gap-1">
          <h1 className="text-card font-bold text-ink">{shared.name}</h1>
          <p className="text-meta text-sub">
            {shared.exercises.length}개 운동 · {totalSets}세트 · 약 {minutes}분
          </p>
        </div>

        <ul className="flex shrink-0 flex-col overflow-hidden rounded-card bg-surface">
          {shared.exercises.map((ex, i) => {
            const meta = getExercise(ex.exerciseId);
            return (
              <li key={i} className="flex items-center gap-3 border-b border-line/50 px-4 py-3 last:border-0">
                <BodyMap
                  primary={meta?.targetMuscles ?? []}
                  secondary={meta?.secondaryMuscles ?? []}
                  bodyPart={meta?.bodyPart}
                  size={30}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-semibold text-ink">
                    {meta?.nameKo ?? ex.exerciseId}
                  </span>
                  <span className="truncate text-micro text-sub">
                    {ex.role} · {ex.sets.length}세트 ·{" "}
                    {ex.sets.map((s) => `${formatWeight(s.plannedWeight)}-${s.plannedReps}`).join(", ")}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="shrink-0 px-1 text-micro leading-relaxed text-sub">
          담으면 내 루틴으로 복사됩니다. 무게와 세트는 내 것에 맞게 고쳐 쓰면 됩니다 —
          보낸 사람의 루틴은 바뀌지 않습니다.
        </p>

        {/* 스크롤 영역 안에 sticky 로 붙인다. 바깥에 고정하면 모바일 브라우저의
            하단 주소창에 가려 아예 안 보인다 — 링크를 받은 사람이 담을 방법이
            없어진다. */}
        <div className="sticky bottom-0 -mx-4 mt-auto bg-bg px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            disabled={!ready || saved}
            onClick={save}
            className="h-14 w-full rounded-btn bg-accent text-action font-bold text-bg active:bg-accent-press disabled:bg-surface-2 disabled:text-sub"
          >
            {saved ? "담았습니다" : "내 루틴에 담기"}
          </button>
        </div>
      </div>
    </main>
  );
}
