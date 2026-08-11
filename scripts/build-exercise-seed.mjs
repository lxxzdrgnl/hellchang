/**
 * data/ko/part-*.json (서브에이전트가 만든 한국어 변환)과 data/exercises-raw.json
 * (free-exercise-db 원본)을 합쳐 data/exercises.ko.json 하나로 만든다.
 *
 * 원본에서 가져오는 것은 이미지 URL 과 동작 설명이다. 이미지 파일 자체는
 * 커밋하지 않고 원본 URL 을 참조한다 — 레포가 수백 MB 로 붓는다.
 *
 *   node scripts/build-exercise-seed.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const RAW = join(ROOT, "data/exercises-raw.json");
const KO_DIR = join(ROOT, "data/ko");
const OUT = join(ROOT, "data/exercises.ko.json");

const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

const raw = JSON.parse(readFileSync(RAW, "utf8"));
const rawById = new Map(raw.map((x) => [x.id, x]));

const koFiles = readdirSync(KO_DIR).filter((f) => /^part-\d+\.json$/.test(f)).sort();
if (koFiles.length === 0) throw new Error("data/ko/part-*.json 이 없다");

const seen = new Set();
const out = [];
const problems = [];

for (const file of koFiles) {
  const rows = JSON.parse(readFileSync(join(KO_DIR, file), "utf8"));
  for (const r of rows) {
    if (!r.id || !r.nameKo || !r.bodyPart) {
      problems.push(`${file}: 필수 필드 누락 ${JSON.stringify(r).slice(0, 80)}`);
      continue;
    }
    if (seen.has(r.id)) {
      problems.push(`${file}: id 중복 ${r.id}`);
      continue;
    }
    const src = rawById.get(r.id);
    if (!src) {
      problems.push(`${file}: 원본에 없는 id ${r.id}`);
      continue;
    }
    seen.add(r.id);

    out.push({
      sourceId: r.id,
      nameKo: r.nameKo,
      nameEn: r.nameEn ?? src.name,
      bodyPart: r.bodyPart,
      targetMuscles: fixPushupIncline(r),
      secondaryMuscles: r.secondaryMuscles ?? [],
      equipment: r.equipment ?? null,
      mechanic: r.mechanic ?? null,
      force: r.force ?? null,
      level: r.level ?? null,
      category: koCategory(src.category),
      instructions: src.instructions ?? [],
      // 첫 장이 시작 자세, 둘째가 마무리 자세다. 목록에는 첫 장만 쓴다.
      imageUrl: src.images?.[0] ? `${IMAGE_BASE}/${src.images[0]}` : null,
      videoUrl: null,
      defaultRestSec: restSec(r),
    });
  }
}

/**
 * 푸시업은 벤치프레스와 각도의 의미가 반대다. 벤치프레스는 상체를 세울수록
 * (인클라인) 윗가슴이지만, 푸시업은 손을 높일수록(인클라인) 부하가 아래로 간다.
 * 이름만 보고 매핑하면 여기서 뒤집힌다.
 */
function fixPushupIncline(r) {
  const t = r.targetMuscles ?? [];
  if (!/푸시업|푸쉬업/.test(r.nameKo)) return t;
  if (/인클라인/.test(r.nameKo)) return t.map((m) => (m === "윗가슴" ? "아랫가슴" : m));
  if (/디클라인/.test(r.nameKo)) return t.map((m) => (m === "아랫가슴" ? "윗가슴" : m));
  return t;
}

/**
 * 복합 종목은 세트 사이가 길다 — 주운동으로 쓰일 확률이 높다. 다만 복근과
 * 맨몸 운동은 복합이어도 3분을 쉬지 않는다. 종목별로 바꿀 수 있으니
 * 여기서는 대충 맞기만 하면 된다.
 */
function restSec(r) {
  if (r.bodyPart === "복근") return 60;
  if (r.equipment === "맨몸") return 90;
  return r.mechanic === "복합" ? 180 : 90;
}

function koCategory(c) {
  return (
    {
      strength: "근력",
      "olympic weightlifting": "역도",
      powerlifting: "파워리프팅",
      strongman: "스트롱맨",
      plyometrics: "플라이오",
      cardio: "유산소",
      stretching: "스트레칭",
    }[c] ?? null
  );
}

const BODY_PARTS = new Set(["등", "하체", "가슴", "어깨", "팔", "복근"]);
for (const e of out) {
  if (!BODY_PARTS.has(e.bodyPart)) problems.push(`부위 값이 이상하다: ${e.nameKo} → ${e.bodyPart}`);
}

writeFileSync(OUT, JSON.stringify(out, null, 1));

const byPart = out.reduce((a, e) => ((a[e.bodyPart] = (a[e.bodyPart] ?? 0) + 1), a), {});
console.log(`${out.length}개 → ${OUT}`);
console.log(byPart);
if (problems.length) {
  console.log(`\n문제 ${problems.length}건:`);
  for (const p of problems.slice(0, 20)) console.log("  " + p);
  if (problems.length > 20) console.log(`  ... 외 ${problems.length - 20}건`);
}
