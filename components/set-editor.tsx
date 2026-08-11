"use client";

/**
 * 세트 편집.
 *
 * 같은 무게로 여러 세트를 하는 일이 잦다. 그래서 세트 수를 위에서 한 번에
 * 늘리고(마지막 값이 그대로 복제된다), 행마다 복제 버튼을 뒀다 — 한 세트씩
 * 만들어 값을 다시 맞추는 일이 없어야 한다.
 *
 * 메모 표기(80-14,100-12) 입력은 접어 둔다. 메모를 통째로 옮겨올 때만 필요하고,
 * 평소에는 스테퍼가 빠르다.
 */
import { useEffect, useState } from "react";
import { Sheet } from "./sheet";
import { formatSetNotation, parseSetNotation, type ParsedSet } from "@/lib/set-notation";
import { formatWeight } from "./set-ladder";
import type { WorkSet } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  sets: WorkSet[];
  onSave: (notation: string) => void;
}

export function SetEditor({ open, onClose, title, sets, onSave }: Props) {
  const [rows, setRows] = useState<ParsedSet[]>([]);
  const [showNotation, setShowNotation] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!open) return;
    setRows(sets.map((s) => ({ weight: s.plannedWeight, reps: s.plannedReps })));
    setShowNotation(false);
  }, [open, sets]);

  function bump(index: number, field: "weight" | "reps", delta: number) {
    setRows((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, [field]: Math.max(field === "weight" ? 0 : 1, s[field] + delta) } : s,
      ),
    );
  }

  function duplicate(index: number) {
    setRows((prev) => [...prev.slice(0, index + 1), { ...prev[index] }, ...prev.slice(index + 1)]);
  }

  function remove(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  /** 세트 수를 한 번에 맞춘다. 늘리면 마지막 세트를 그대로 복제한다. */
  function setCount(next: number) {
    setRows((prev) => {
      if (next <= 0) return [];
      if (next < prev.length) return prev.slice(0, next);
      const last = prev[prev.length - 1] ?? { weight: 20, reps: 10 };
      return [...prev, ...Array.from({ length: next - prev.length }, () => ({ ...last }))];
    });
  }

  function applyNotationText() {
    const parsed = parseSetNotation(text);
    if (parsed.sets.length > 0) {
      setRows(parsed.sets);
      setShowNotation(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={title} tall>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="flex items-center justify-between rounded-btn bg-surface-2 px-3 py-2">
          <span className="text-meta font-semibold text-ink-2">세트 수</span>
          <span className="flex items-center gap-1">
            <StepBtn onClick={() => setCount(rows.length - 1)} label="세트 줄이기">
              −
            </StepBtn>
            <span className="w-10 text-center text-weight font-bold text-ink">{rows.length}</span>
            <StepBtn onClick={() => setCount(rows.length + 1)} label="세트 늘리기">
              +
            </StepBtn>
          </span>
        </div>

        <ul className="flex flex-col gap-1.5">
          {rows.map((s, i) => (
            <li key={i} className="flex items-center gap-2 rounded-btn bg-surface-2 px-2.5 py-2">
              <span className="w-4 shrink-0 text-micro text-sub">{i + 1}</span>

              <Stepper
                value={`${formatWeight(s.weight)}kg`}
                onMinus={() => bump(i, "weight", -2.5)}
                onPlus={() => bump(i, "weight", 2.5)}
              />
              <Stepper
                value={`${s.reps}회`}
                onMinus={() => bump(i, "reps", -1)}
                onPlus={() => bump(i, "reps", 1)}
              />

              <button
                type="button"
                onClick={() => duplicate(i)}
                aria-label={`${i + 1}세트와 같은 세트 추가`}
                className="size-9 shrink-0 rounded-btn text-sub active:bg-line active:text-ink"
              >
                <CopyIcon />
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`${i + 1}세트 삭제`}
                className="size-9 shrink-0 rounded-btn text-body text-sub active:bg-line active:text-ink"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        {rows.length === 0 && (
          <p className="py-6 text-center text-meta text-sub">세트가 없습니다. 아래에서 추가합니다.</p>
        )}

        <button
          type="button"
          onClick={() => setCount(rows.length + 1)}
          className="h-12 rounded-btn border border-dashed border-line text-meta font-medium text-ink-2 active:bg-surface-2"
        >
          ＋ 세트 추가
        </button>

        {/* 메모를 통째로 옮겨올 때만 쓴다. 평소에는 접혀 있다. */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setText(formatSetNotation(rows));
              setShowNotation((v) => !v);
            }}
            className="self-start text-meta text-sub active:text-ink"
          >
            {showNotation ? "메모 표기 닫기" : "메모 표기로 한 번에 붙여넣기"}
          </button>

          {showNotation && (
            <div className="flex flex-col gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                spellCheck={false}
                placeholder="80-14,100-12,120-10 또는 (25-14)x3"
                className="resize-none rounded-btn bg-surface-2 p-3 font-mono text-body text-ink outline-none placeholder:text-sub focus:ring-2 focus:ring-accent/40"
              />
              <button
                type="button"
                onClick={applyNotationText}
                className="h-11 rounded-btn border border-line text-meta font-semibold text-ink active:bg-surface-2"
              >
                이대로 채우기
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 mt-auto border-t border-line bg-surface p-4">
        <button
          type="button"
          disabled={rows.length === 0}
          onClick={() => {
            onSave(formatSetNotation(rows));
            onClose();
          }}
          className="h-14 w-full rounded-btn bg-accent text-action font-bold text-bg transition-colors active:bg-accent-press disabled:bg-surface-2 disabled:text-sub"
        >
          {rows.length}세트 저장
        </button>
      </div>
    </Sheet>
  );
}

function Stepper({
  value,
  onMinus,
  onPlus,
}: {
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <span className="flex flex-1 items-center justify-between rounded-btn bg-bg px-0.5">
      <StepBtn onClick={onMinus} label="줄이기">
        −
      </StepBtn>
      <span className="text-body font-bold text-ink">{value}</span>
      <StepBtn onClick={onPlus} label="늘리기">
        +
      </StepBtn>
    </span>
  );
}

function StepBtn({
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
      className="size-10 shrink-0 rounded-btn text-title text-ink-2 active:bg-line"
    >
      {children}
    </button>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth={1.8} />
      <path d="M15 5.5A2.5 2.5 0 0012.5 3h-7A2.5 2.5 0 003 5.5v7A2.5 2.5 0 005.5 15" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}
