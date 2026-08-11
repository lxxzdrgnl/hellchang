"use client";

/**
 * 프리셋 편집. 오늘 화면과 거의 같은 구조인데 완료 체크가 없고 순서 이동이 있다.
 * 여기서 무엇을 고쳐도 이미 지나간 세션은 변하지 않는다 — 세션은 시작할 때
 * 이 프리셋을 깊은 복사해 갔기 때문이다.
 */
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/components/app-store";
import { ExerciseBlock } from "@/components/exercise-block";
import { ExercisePicker } from "@/components/exercise-picker";
import { SetEditor } from "@/components/set-editor";
import { Sheet } from "@/components/sheet";
import { ShareSheet } from "@/components/share-sheet";
import { getExercise } from "@/lib/exercises";
import {
  applyNotation,
  deletePreset,
  presetAddExercise,
  presetMoveExercise,
  presetRemoveExercise,
  presetUpdateExercise,
  renamePreset,
} from "@/lib/store";
import { roleLabel } from "@/lib/types";

export default function PresetEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, update, ready } = useStore();

  const [picking, setPicking] = useState(false);
  const [swapExId, setSwapExId] = useState<string | null>(null);
  const [editingExId, setEditingExId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [draftName, setDraftName] = useState("");

  const preset = state.presets.find((p) => p.id === id);

  if (!ready) return null;
  if (!preset) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-meta text-sub">없는 루틴이다</p>
      </div>
    );
  }

  const editingExercise = preset.exercises.find((e) => e.id === editingExId);
  const totalSets = preset.exercises.reduce((a, e) => a + e.sets.length, 0);

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 px-2 pb-2 pt-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로"
          className="size-10 rounded-btn text-title text-ink-2 active:bg-surface"
        >
          ‹
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={() => {
              setDraftName(preset.name);
              setRenaming(true);
            }}
            className="truncate text-left text-screen font-bold text-ink"
          >
            {preset.name} <span className="text-meta font-normal text-sub">이름 바꾸기</span>
          </button>
          <span className="text-micro text-sub">
            {preset.exercises.length}종목 · {totalSets}세트
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSharing(true)}
          aria-label="루틴 공유"
          className="flex size-11 shrink-0 items-center justify-center rounded-btn text-sub active:bg-surface active:text-accent"
        >
          <svg viewBox="0 0 24 24" width={18} height={18} fill="none" aria-hidden="true">
            <path
              d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5M5 13v5.5A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5V13"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="px-2 py-2 text-meta text-sub active:text-ink"
        >
          삭제
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-6">
        {preset.exercises.map((ex, i) => (
          <ExerciseBlock
            key={ex.id}
            exercise={ex}
            roleLabel={roleLabel(preset.exercises, i)}
            readOnly
            onEditSets={() => setEditingExId(ex.id)}
            onSwap={() => setSwapExId(ex.id)}
            onRemove={() => update((s) => presetRemoveExercise(s, preset.id, ex.id))}
            onMove={(delta) => update((s) => presetMoveExercise(s, preset.id, ex.id, delta))}
          />
        ))}

        {preset.exercises.length === 0 && (
          <p className="rounded-card bg-surface px-4 py-8 text-center text-meta leading-relaxed text-sub">
            아직 비어 있다.
            <br />
            운동을 넣으면 오늘 화면에서 그대로 불러온다.
          </p>
        )}

        <button
          type="button"
          onClick={() => setPicking(true)}
          className="h-13 rounded-btn border border-dashed border-line text-body font-medium text-ink-2 active:bg-surface"
        >
          ＋ 운동 추가
        </button>

        <p className="px-1 pt-2 text-micro leading-relaxed text-sub">
          첫 운동은 주운동, 나머지는 보조로 들어간다. 순서를 바꾸면 번호도 따라 바뀐다.
        </p>
      </div>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(e) => update((s) => presetAddExercise(s, preset.id, e.id, e.defaultRestSec))}
      />

      <ExercisePicker
        open={swapExId !== null}
        onClose={() => setSwapExId(null)}
        title="종목 교체"
        onPick={(picked) => {
          if (!swapExId) return;
          update((s) =>
            presetUpdateExercise(s, preset.id, swapExId, (e) => ({
              ...e,
              exerciseId: picked.id,
              restSec: picked.defaultRestSec,
            })),
          );
        }}
      />

      <SetEditor
        open={editingExId !== null}
        onClose={() => setEditingExId(null)}
        title={
          editingExercise ? (getExercise(editingExercise.exerciseId)?.nameKo ?? "세트 편집") : "세트 편집"
        }
        sets={editingExercise?.sets ?? []}
        onSave={(notation) => {
          if (!editingExId) return;
          update((s) =>
            presetUpdateExercise(s, preset.id, editingExId, (e) => applyNotation(e, notation)),
          );
        }}
      />

      <ShareSheet preset={sharing ? preset : null} onClose={() => setSharing(false)} />

      <Sheet open={renaming} onClose={() => setRenaming(false)} title="루틴 이름">
        <div className="flex flex-col gap-3 px-4 pb-5">
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            className="h-12 rounded-btn bg-surface-2 px-3.5 text-body text-ink outline-none focus:ring-2 focus:ring-accent/40"
          />
          <button
            type="button"
            disabled={!draftName.trim()}
            onClick={() => {
              update((s) => renamePreset(s, preset.id, draftName.trim()));
              setRenaming(false);
            }}
            className="h-13 rounded-btn bg-accent text-body font-bold text-bg active:bg-accent-press disabled:bg-surface-2 disabled:text-sub"
          >
            저장
          </button>
        </div>
      </Sheet>

      {/* 파괴적 동작은 색이 아니라 한 단계 더 밟게 해서 막는다. */}
      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="루틴 삭제">
        <div className="flex flex-col gap-3 px-4 pb-5">
          <p className="text-meta leading-relaxed text-ink-2">
            <b className="text-ink">{preset.name}</b> 을 지운다. 이 루틴이 잡힌 계획도 같이
            사라진다. 이미 한 운동 기록은 그대로 남는다.
          </p>
          <button
            type="button"
            onClick={() => {
              update((s) => deletePreset(s, preset.id));
              router.replace("/routines");
            }}
            className="h-13 rounded-btn border border-line text-body font-semibold text-ink active:bg-surface-2"
          >
            지운다
          </button>
        </div>
      </Sheet>
    </>
  );
}
