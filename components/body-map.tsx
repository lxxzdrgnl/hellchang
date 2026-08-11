"use client";

/**
 * 인체 근육 지도.
 *
 * 실사 사진 대신 이것을 쓴다. 종목 목록에서 사진은 저마다 조명·각도·배경이 달라
 * 훑을 때 시끄럽고, 정작 "어디를 쓰는 운동인지"는 안 보인다. 부위를 칠한 그림은
 * 스타일이 하나로 통일되고 그 질문에 바로 답한다.
 *
 * 좌표는 순수 SVG 라 RN(react-native-svg)으로 그대로 옮긴다.
 */

type Side = "front" | "back";

/** 근육 이름(한국어) → 어느 면의 어느 조각인지 */
const MUSCLE_PARTS: Record<string, { side: Side; keys: string[] }> = {
  대흉근: { side: "front", keys: ["chestL", "chestR"] },
  가슴: { side: "front", keys: ["chestL", "chestR"] },
  윗가슴: { side: "front", keys: ["chestUpL", "chestUpR"] },
  아랫가슴: { side: "front", keys: ["chestLowL", "chestLowR"] },
  전면삼각근: { side: "front", keys: ["deltFL", "deltFR"] },
  측면삼각근: { side: "front", keys: ["deltFL", "deltFR"] },
  후면삼각근: { side: "back", keys: ["deltBL", "deltBR"] },
  어깨: { side: "front", keys: ["deltFL", "deltFR"] },
  이두근: { side: "front", keys: ["bicepL", "bicepR"] },
  삼두근: { side: "back", keys: ["tricepL", "tricepR"] },
  전완근: { side: "front", keys: ["foreL", "foreR"] },
  상복부: { side: "front", keys: ["absUp"] },
  하복부: { side: "front", keys: ["absLow"] },
  복근: { side: "front", keys: ["absUp", "absLow"] },
  복사근: { side: "front", keys: ["obliqueL", "obliqueR"] },
  광배근: { side: "back", keys: ["latL", "latR"] },
  승모근: { side: "back", keys: ["trap"] },
  "등 중앙": { side: "back", keys: ["midBack"] },
  기립근: { side: "back", keys: ["erector"] },
  대퇴사두근: { side: "front", keys: ["quadL", "quadR"] },
  햄스트링: { side: "back", keys: ["hamL", "hamR"] },
  둔근: { side: "back", keys: ["gluteL", "gluteR"] },
  종아리: { side: "back", keys: ["calfL", "calfR"] },
  내전근: { side: "front", keys: ["adductorL", "adductorR"] },
  외전근: { side: "front", keys: ["abductorL", "abductorR"] },
  목: { side: "back", keys: ["trap"] },
};

/** 부위 대분류 → 대표 근육. 세부가 없을 때 쓴다. */
const FALLBACK: Record<string, string[]> = {
  가슴: ["가슴"],
  등: ["광배근"],
  어깨: ["어깨"],
  팔: ["이두근"],
  하체: ["대퇴사두근"],
  복근: ["복근"],
};

interface Props {
  /** 주 타겟 — 진하게 */
  primary: string[];
  /** 보조 — 옅게 */
  secondary?: string[];
  bodyPart?: string;
  size?: number;
  /** 한 면만 보여줄지, 앞뒤 모두 보여줄지 */
  both?: boolean;
  /**
   * 근육 이름 → 0~1 강도. 회복도 화면이 쓴다. 주면 primary/secondary 대신
   * 이 값으로 칠한다 — 자극의 세기가 색의 진하기로 보인다.
   */
  levels?: Map<string, number>;
}

export function BodyMap({ primary, secondary = [], bodyPart, size = 52, both, levels }: Props) {
  const marks = new Map<string, "primary" | "secondary">();
  const intensities = new Map<string, number>();

  if (levels) {
    for (const [muscle, value] of levels) {
      const hit = MUSCLE_PARTS[muscle];
      if (!hit || value <= 0.02) continue;
      for (const k of hit.keys) {
        intensities.set(k, Math.max(intensities.get(k) ?? 0, value));
      }
    }
  }

  const resolve = (names: string[], level: "primary" | "secondary") => {
    for (const n of names) {
      const hit = MUSCLE_PARTS[n];
      if (!hit) continue;
      for (const k of hit.keys) {
        if (level === "primary" || !marks.has(k)) marks.set(k, level);
      }
    }
  };

  resolve(primary, "primary");
  resolve(secondary, "secondary");
  if (marks.size === 0 && bodyPart) resolve(FALLBACK[bodyPart] ?? [], "primary");

  // 한 면만 그릴 때는 표시할 것이 있는 쪽을 고른다.
  const frontCount = [...marks.keys()].filter((k) => FRONT_KEYS.has(k)).length;
  const backCount = marks.size - frontCount;
  const side: Side = frontCount >= backCount ? "front" : "back";

  const h = size * (150 / 64);

  if (both || levels) {
    return (
      <span className="flex items-center gap-1">
        <Figure side="front" marks={marks} intensities={intensities} width={size} height={h} />
        <Figure side="back" marks={marks} intensities={intensities} width={size} height={h} />
      </span>
    );
  }

  return <Figure side={side} marks={marks} intensities={intensities} width={size} height={h} />;
}

function fill(marks: Map<string, string>, intensities: Map<string, number>, key: string): string {
  const intensity = intensities.get(key);
  if (intensity !== undefined) {
    // 자극이 셀수록 진해진다. 30% 아래로는 안 내려가야 칠해진 것이 보인다.
    const pct = Math.round(30 + intensity * 70);
    return `color-mix(in srgb, var(--accent) ${pct}%, var(--line))`;
  }
  const level = marks.get(key);
  if (level === "primary") return "var(--accent)";
  if (level === "secondary") return "var(--accent-tint-solid)";
  return "var(--body-idle)";
}

function Figure({
  side,
  marks,
  intensities,
  width,
  height,
}: {
  side: Side;
  marks: Map<string, string>;
  intensities: Map<string, number>;
  width: number;
  height: number;
}) {
  const f = (k: string) => fill(marks, intensities, k);

  return (
    <svg
      viewBox="0 0 64 150"
      width={width}
      height={height}
      aria-hidden="true"
      className="shrink-0"
      style={
        {
          "--body-idle": "var(--line)",
          "--accent-tint-solid": "color-mix(in srgb, var(--accent) 38%, var(--line))",
        } as React.CSSProperties
      }
    >
      {/* 머리·목은 늘 같은 색이다. 방향을 알려주는 역할만 한다. */}
      <circle cx="32" cy="11" r="8" fill="var(--body-idle)" />
      <rect x="28" y="18" width="8" height="6" rx="2" fill="var(--body-idle)" />

      {side === "front" ? (
        <>
          {/* 어깨 */}
          <ellipse cx="17" cy="31" rx="7.5" ry="6.5" fill={f("deltFL")} />
          <ellipse cx="47" cy="31" rx="7.5" ry="6.5" fill={f("deltFR")} />
          {/* 가슴 — 위·아래로 나눠 인클라인/디클라인을 구분한다 */}
          <path d="M24 27h7v6h-7z" fill={f("chestUpL")} opacity={marks.has("chestUpL") || intensities.has("chestUpL") ? 1 : 0} />
          <path d="M33 27h7v6h-7z" fill={f("chestUpR")} opacity={marks.has("chestUpR") || intensities.has("chestUpR") ? 1 : 0} />
          <rect x="23" y="27" width="8" height="12" rx="3" fill={f("chestL")} />
          <rect x="33" y="27" width="8" height="12" rx="3" fill={f("chestR")} />
          <rect x="23" y="34" width="8" height="6" rx="3" fill={f("chestLowL")} opacity={marks.has("chestLowL") || intensities.has("chestLowL") ? 1 : 0} />
          <rect x="33" y="34" width="8" height="6" rx="3" fill={f("chestLowR")} opacity={marks.has("chestLowR") || intensities.has("chestLowR") ? 1 : 0} />
          {/* 복근 */}
          <rect x="27" y="41" width="10" height="9" rx="2.5" fill={f("absUp")} />
          <rect x="27" y="51" width="10" height="9" rx="2.5" fill={f("absLow")} />
          <rect x="21" y="42" width="5" height="16" rx="2.5" fill={f("obliqueL")} />
          <rect x="38" y="42" width="5" height="16" rx="2.5" fill={f("obliqueR")} />
          {/* 팔 */}
          <rect x="11" y="38" width="8" height="16" rx="4" fill={f("bicepL")} />
          <rect x="45" y="38" width="8" height="16" rx="4" fill={f("bicepR")} />
          <rect x="9" y="55" width="7" height="15" rx="3.5" fill={f("foreL")} />
          <rect x="48" y="55" width="7" height="15" rx="3.5" fill={f("foreR")} />
          {/* 다리 */}
          <rect x="23" y="62" width="8" height="10" rx="3" fill={f("abductorL")} />
          <rect x="33" y="62" width="8" height="10" rx="3" fill={f("abductorR")} />
          <rect x="29" y="64" width="3" height="14" rx="1.5" fill={f("adductorL")} />
          <rect x="32" y="64" width="3" height="14" rx="1.5" fill={f("adductorR")} />
          <rect x="22" y="72" width="10" height="28" rx="5" fill={f("quadL")} />
          <rect x="32" y="72" width="10" height="28" rx="5" fill={f("quadR")} />
          <rect x="23" y="102" width="8" height="22" rx="4" fill="var(--body-idle)" />
          <rect x="33" y="102" width="8" height="22" rx="4" fill="var(--body-idle)" />
        </>
      ) : (
        <>
          {/* 승모 */}
          <path d="M22 25h20l-4 12H26z" fill={f("trap")} />
          <ellipse cx="17" cy="31" rx="7.5" ry="6.5" fill={f("deltBL")} />
          <ellipse cx="47" cy="31" rx="7.5" ry="6.5" fill={f("deltBR")} />
          {/* 광배 */}
          <path d="M22 36h9v18l-9-6z" fill={f("latL")} />
          <path d="M42 36h-9v18l9-6z" fill={f("latR")} />
          <rect x="28" y="36" width="8" height="10" rx="2" fill={f("midBack")} />
          <rect x="29" y="48" width="6" height="12" rx="2" fill={f("erector")} />
          {/* 삼두 */}
          <rect x="11" y="38" width="8" height="16" rx="4" fill={f("tricepL")} />
          <rect x="45" y="38" width="8" height="16" rx="4" fill={f("tricepR")} />
          <rect x="9" y="55" width="7" height="15" rx="3.5" fill="var(--body-idle)" />
          <rect x="48" y="55" width="7" height="15" rx="3.5" fill="var(--body-idle)" />
          {/* 둔근·햄스트링·종아리 */}
          <rect x="22" y="62" width="10" height="12" rx="4" fill={f("gluteL")} />
          <rect x="32" y="62" width="10" height="12" rx="4" fill={f("gluteR")} />
          <rect x="22" y="75" width="10" height="25" rx="5" fill={f("hamL")} />
          <rect x="32" y="75" width="10" height="25" rx="5" fill={f("hamR")} />
          <rect x="23" y="102" width="8" height="22" rx="4" fill={f("calfL")} />
          <rect x="33" y="102" width="8" height="22" rx="4" fill={f("calfR")} />
        </>
      )}
    </svg>
  );
}

const FRONT_KEYS = new Set([
  "deltFL", "deltFR", "chestL", "chestR", "chestUpL", "chestUpR", "chestLowL", "chestLowR",
  "absUp", "absLow", "obliqueL", "obliqueR", "bicepL", "bicepR", "foreL", "foreR",
  "quadL", "quadR", "adductorL", "adductorR", "abductorL", "abductorR",
]);
