"use client";

/**
 * 종목 선택 시트. 프리셋 편집과 오늘 화면이 이 하나를 같이 쓴다 —
 * 한 곳만 고치면 양쪽에 반영된다.
 *
 * 썸네일은 실사 사진 대신 근육 그림이다. 목록을 훑을 때 사진은 조명·각도가
 * 저마다 달라 시끄럽고, 정작 알고 싶은 "어디를 쓰는 운동인지"는 안 보인다.
 */
import { useMemo, useState } from "react";
import { BodyMap } from "./body-map";
import { Sheet } from "./sheet";
import { useStore } from "./app-store";
import { getExercise, searchExercises, targetMusclesOf, type ExerciseBrief } from "@/lib/exercises";
import { addCustomExercise, newId } from "@/lib/store";
import { BODY_PARTS, type BodyPart } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (exercise: ExerciseBrief) => void;
  title?: string;
  recentIds?: string[];
}

export function ExercisePicker({ open, onClose, onPick, title = "운동 추가", recentIds = [] }: Props) {
  const { update } = useStore();
  const [query, setQuery] = useState("");
  const [part, setPart] = useState<BodyPart | null>(null);
  const [muscle, setMuscle] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const muscles = useMemo(() => (part ? targetMusclesOf(part) : []), [part]);

  const results = useMemo(() => {
    let rows = searchExercises(query, part, 200);
    if (muscle) rows = rows.filter((e) => e.targetMuscles.includes(muscle));
    return rows.slice(0, 80);
  }, [query, part, muscle]);

  const recent = useMemo(() => {
    if (query || part) return [];
    return recentIds
      .map((id) => getExercise(id))
      .filter((e): e is ExerciseBrief => !!e)
      .slice(0, 6);
  }, [recentIds, query, part]);

  function choose(e: ExerciseBrief) {
    onPick(e);
    setQuery("");
    setMuscle(null);
    onClose();
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} title={title} tall>
        <div className="sticky top-0 z-10 flex flex-col gap-2.5 bg-surface px-4 pb-3">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="운동 이름 검색 (한글·영어)"
              className="h-12 flex-1 rounded-btn bg-surface-2 px-3.5 text-body text-ink outline-none placeholder:text-sub focus:ring-2 focus:ring-accent/40"
            />
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="h-12 shrink-0 rounded-btn border border-accent px-4 text-meta font-semibold text-accent active:bg-accent-tint"
            >
              직접 추가
            </button>
          </div>

          <div className="-mx-4 flex gap-1.5 overflow-x-auto overflow-y-hidden px-4 pb-0.5">
            <Chip active={part === null} onClick={() => { setPart(null); setMuscle(null); }}>
              전체
            </Chip>
            {BODY_PARTS.map((p) => (
              <Chip
                key={p}
                active={part === p}
                onClick={() => { setPart(part === p ? null : p); setMuscle(null); }}
              >
                {p}
              </Chip>
            ))}
          </div>

          {muscles.length > 1 && (
            <div className="-mx-4 flex gap-1.5 overflow-x-auto overflow-y-hidden px-4 pb-0.5">
              {muscles.map((m) => (
                <Chip key={m} small active={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>
                  {m}
                </Chip>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          {recent.length > 0 && (
            <>
              <SectionLabel>최근 한 운동</SectionLabel>
              {recent.map((e) => (
                <Row key={`r-${e.id}`} exercise={e} onClick={() => choose(e)} />
              ))}
              <SectionLabel>전체</SectionLabel>
            </>
          )}

          {results.map((e) => (
            <Row key={e.id} exercise={e} onClick={() => choose(e)} />
          ))}

          {results.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-4 py-10">
              <p className="text-center text-meta text-sub">
                {query ? `'${query}' 로 찾은 운동이 없습니다` : "이 조건에 맞는 운동이 없습니다"}
              </p>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="h-12 rounded-btn bg-accent px-5 text-body font-bold text-bg active:bg-accent-press"
              >
                직접 추가하기
              </button>
            </div>
          )}
        </div>
      </Sheet>

      <CustomExerciseSheet
        open={creating}
        initialName={query}
        onClose={() => setCreating(false)}
        onCreate={(exercise) => {
          update((s) => addCustomExercise(s, exercise));
          setCreating(false);
          choose(exercise);
        }}
      />
    </>
  );
}

/** 목록에 없는 종목을 직접 만든다. 헬스장마다 기구 이름이 다르다. */
function CustomExerciseSheet({
  open,
  initialName,
  onClose,
  onCreate,
}: {
  open: boolean;
  initialName: string;
  onClose: () => void;
  onCreate: (e: ExerciseBrief) => void;
}) {
  const [name, setName] = useState("");
  const [part, setPart] = useState<BodyPart>("가슴");
  const [equipment, setEquipment] = useState("머신");

  const muscles = useMemo(() => targetMusclesOf(part), [part]);
  const [muscle, setMuscle] = useState<string | null>(null);

  return (
    <Sheet open={open} onClose={onClose} title="운동 직접 추가">
      <div className="flex flex-col gap-4 px-4 pb-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-micro font-semibold text-sub">이름</span>
          <input
            autoFocus
            defaultValue={initialName}
            onChange={(e) => setName(e.target.value)}
            placeholder="예) 스미스 인클라인 프레스"
            className="h-12 rounded-btn bg-surface-2 px-3.5 text-body text-ink outline-none placeholder:text-sub focus:ring-2 focus:ring-accent/40"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-micro font-semibold text-sub">부위</span>
          <div className="flex flex-wrap gap-1.5">
            {BODY_PARTS.map((p) => (
              <Chip key={p} active={part === p} onClick={() => { setPart(p); setMuscle(null); }}>
                {p}
              </Chip>
            ))}
          </div>
        </div>

        {muscles.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-micro font-semibold text-sub">세부 부위</span>
            <div className="flex flex-wrap gap-1.5">
              {muscles.map((m) => (
                <Chip key={m} small active={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>
                  {m}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-micro font-semibold text-sub">장비</span>
          <div className="flex flex-wrap gap-1.5">
            {["바벨", "덤벨", "머신", "케이블", "맨몸", "밴드", "케틀벨"].map((q) => (
              <Chip key={q} active={equipment === q} onClick={() => setEquipment(q)}>
                {q}
              </Chip>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={!(name || initialName).trim()}
          onClick={() =>
            onCreate({
              id: newId("custom"),
              nameKo: (name || initialName).trim(),
              nameEn: null,
              bodyPart: part,
              targetMuscles: muscle ? [muscle] : [],
              secondaryMuscles: [],
              equipment,
              defaultRestSec: 90,
              imageUrl: null,
              videoUrl: null,
              posterUrl: null,
            })
          }
          className="h-14 rounded-btn bg-accent text-action font-bold text-bg active:bg-accent-press disabled:bg-surface-2 disabled:text-sub"
        >
          추가하고 넣기
        </button>
      </div>
    </Sheet>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 pb-1 pt-4 text-micro font-semibold tracking-wide text-sub">{children}</p>
  );
}

function Row({ exercise, onClick }: { exercise: ExerciseBrief; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 border-b border-line/60 px-4 py-2.5 text-left active:bg-surface-2"
    >
      <BodyMap
        primary={exercise.targetMuscles}
        secondary={exercise.secondaryMuscles}
        bodyPart={exercise.bodyPart}
        size={30}
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium text-ink">{exercise.nameKo}</span>
        <span className="truncate text-micro text-sub">
          {exercise.targetMuscles.join(" · ") || exercise.bodyPart}
          {exercise.equipment ? ` · ${exercise.equipment}` : ""}
        </span>
      </span>
    </button>
  );
}

function Chip({
  children,
  active,
  small,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  small?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-pill border px-3 font-medium transition-colors ${
        small ? "h-8 text-micro" : "h-9 text-meta"
      } ${
        active ? "border-accent bg-accent-tint text-accent" : "border-line bg-surface-2 text-ink-2"
      }`}
    >
      {children}
    </button>
  );
}
