/**
 * 메모장 표기를 세트 배열로, 세트 배열을 메모장 표기로.
 *
 *   80-14,100-12,120-10,140-8,160-6,60-12
 *   (25-14)x3
 *   47-20, 55-18, 62-16
 *
 * 여기가 깨지면 기록이 날아간다. 순수 함수로 두고 촘촘히 테스트한다.
 */

export interface ParsedSet {
  weight: number;
  reps: number;
}

export interface ParseResult {
  sets: ParsedSet[];
  /** 사람이 읽을 수 있는 실패 사유. 비어 있으면 성공. */
  errors: string[];
}

/** 전각 숫자·전각 쉼표·여러 종류의 하이픈이 섞여 들어온다. 먼저 편다. */
function normalize(input: string): string {
  return input
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[，、]/g, ",")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[‐-―−－]/g, "-")
    .replace(/[xX×ｘ]/g, "x")
    .replace(/\s+/g, "");
}

/**
 * `(25-14)x3` 처럼 묶음 반복을 펼친다. 괄호 없이 `25-14x3` 로 써도 같게 읽는다 —
 * 메모를 옮겨 붙일 때 괄호가 빠지는 일이 잦다.
 */
function expand(token: string): { text: string; times: number } {
  const grouped = /^\((.+)\)x(\d+)$/.exec(token);
  if (grouped) return { text: grouped[1], times: Number(grouped[2]) };
  const bare = /^(.+?)x(\d+)$/.exec(token);
  if (bare) return { text: bare[1], times: Number(bare[2]) };
  return { text: token, times: 1 };
}

export function parseSetNotation(input: string): ParseResult {
  const sets: ParsedSet[] = [];
  const errors: string[] = [];

  const text = normalize(input);
  if (!text) return { sets, errors };

  // 괄호 묶음 안의 쉼표는 구분자가 아니다. 깊이를 세면서 자른다.
  const tokens: string[] = [];
  let depth = 0;
  let buf = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      if (buf) tokens.push(buf);
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf) tokens.push(buf);

  for (const token of tokens) {
    const { text: body, times } = expand(token);
    if (times < 1 || times > 50) {
      errors.push(`${token}: 반복 횟수가 이상하다`);
      continue;
    }

    // 묶음 안에 여러 세트가 들어올 수 있다: (80-14,100-12)x2
    const inner = body.split(",").filter(Boolean);
    const parsed: ParsedSet[] = [];
    let bad = false;

    for (const one of inner) {
      const m = /^(\d+(?:\.\d+)?)-(\d+)$/.exec(one);
      if (!m) {
        errors.push(`${one}: 중량-횟수 형식이 아니다`);
        bad = true;
        break;
      }
      const weight = Number(m[1]);
      const reps = Number(m[2]);
      if (reps < 1 || reps > 999) {
        errors.push(`${one}: 횟수가 이상하다`);
        bad = true;
        break;
      }
      if (weight > 1000) {
        errors.push(`${one}: 중량이 이상하다`);
        bad = true;
        break;
      }
      parsed.push({ weight, reps });
    }

    if (bad) continue;
    for (let i = 0; i < times; i++) sets.push(...parsed);
  }

  return { sets, errors };
}

/** 세트 배열을 다시 메모장 표기로. 같은 값이 이어지면 묶는다. */
export function formatSetNotation(sets: ParsedSet[]): string {
  if (sets.length === 0) return "";

  const parts: string[] = [];
  let i = 0;
  while (i < sets.length) {
    let n = 1;
    while (
      i + n < sets.length &&
      sets[i + n].weight === sets[i].weight &&
      sets[i + n].reps === sets[i].reps
    ) {
      n++;
    }
    const one = `${trimNum(sets[i].weight)}-${sets[i].reps}`;
    parts.push(n >= 3 ? `(${one})x${n}` : Array(n).fill(one).join(","));
    i += n;
  }
  return parts.join(",");
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}
