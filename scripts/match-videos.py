#!/usr/bin/env python3
"""
free-exercise-db-with-videos(MIT)의 영상을 우리 750종목에 이름으로 붙입니다.

두 데이터셋은 id 체계가 달라서 이름으로 맞춰야 합니다. 정확히 같은 이름은
드물고("Barbell Bench Press - Medium Grip" vs "Barbell Bench Press"), 대신
저쪽에 aliases 가 있어 그것까지 훑습니다.

    python3 scripts/match-videos.py /tmp/fedbv/data/exercises.json
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 이름에 붙어 다니지만 같은 운동인지 가르지 않는 말들입니다. 빼고 비교합니다.
NOISE = {
    "exercise", "the", "a", "with", "and", "or", "on", "in", "to", "for",
    "medium", "grip", "standard", "regular", "classic", "basic", "version",
    "male", "female", "variation", "alternative",
}

# 이 말이 다르면 다른 운동입니다. 하나라도 어긋나면 매칭하지 않습니다.
DISCRIMINATORS = {
    "incline", "decline", "flat", "seated", "standing", "lying", "kneeling",
    "close", "wide", "narrow", "neutral", "reverse", "underhand", "overhand",
    "single", "one", "alternating", "smith", "machine", "cable", "barbell",
    "dumbbell", "kettlebell", "band", "bodyweight", "assisted", "front", "back",
    "romanian", "sumo", "bulgarian", "hack", "goblet", "pause", "deficit",
}

# 장비 이름은 구분어에서 뺍니다 — 대신 equipment 필드로 대조합니다.
EQUIPMENT_WORDS = {
    "smith", "machine", "cable", "barbell", "dumbbell", "kettlebell", "band",
    "bodyweight", "lever", "leverage", "sled", "ez", "bar",
}
DISCRIMINATORS -= EQUIPMENT_WORDS

# 우리 장비 표기 → 저쪽 표기에 들어 있을 만한 말
EQUIP_KO_EN = {
    "바벨": {"barbell", "ez", "bar"},
    "덤벨": {"dumbbell"},
    "머신": {"machine", "lever", "leverage", "smith", "sled"},
    "케이블": {"cable"},
    "맨몸": {"body", "bodyweight"},
    "밴드": {"band", "resistance"},
    "케틀벨": {"kettlebell"},
    "이지바": {"ez", "barbell", "bar"},
}


def equipment_ok(ko_equip: str | None, their_equip: str | None) -> bool:
    """장비가 어긋나면 다른 운동입니다. 한쪽이 비어 있으면 통과시킵니다."""
    if not ko_equip or not their_equip:
        return True
    want = EQUIP_KO_EN.get(ko_equip)
    if not want:
        return True
    theirs = set(re.split(r"[^a-z]+", their_equip.lower()))
    return bool(want & theirs)


def singular(word: str) -> str:
    """rows→row, extensions→extension, flyes→fly. 복수형을 갈라 두면
    같은 운동이 다른 이름으로 잡힙니다."""
    if word.endswith("ies") and len(word) > 4:
        return word[:-3] + "y"
    if word.endswith("es") and word[:-2].endswith(("s", "x", "z", "ch", "sh")):
        return word[:-2]
    if word.endswith("s") and not word.endswith("ss") and len(word) > 3:
        return word[:-1]
    return word


def norm(name: str) -> set[str]:
    words = re.split(r"[^a-z0-9]+", name.lower())
    return {
        singular(w) for w in words
        if w and w not in NOISE and w not in EQUIPMENT_WORDS
    }


# 동작 그 자체를 가리키는 말입니다. 이것이 어긋나면 아예 다른 운동입니다 —
# "레그 레이즈"에 "케이블 플라이" 영상을 붙이면 없는 것만 못합니다.
MOVEMENTS = {
    "press", "curl", "row", "raise", "fly", "flye", "extension", "extensions",
    "pulldown", "pullup", "pullover", "pull", "push", "pushup", "pushdown",
    "squat", "deadlift", "lunge", "crunch", "situp", "dip", "shrug", "thrust",
    "bridge", "twist", "plank", "kickback", "jack", "slam", "clean", "snatch",
    "jerk", "swing", "hyperextension", "abduction", "adduction", "calf", "climber",
    "carry", "hold", "throw", "jump", "step", "kick", "pulldowns", "rows",
}


def score(ours: set[str], theirs: set[str]) -> float:
    """자카드 유사도. 구분어나 동작 명사가 어긋나면 0 입니다."""
    if not ours or not theirs:
        return 0.0
    # 한두 단어짜리 alias 는 우연히 100% 로 잡힙니다. 신뢰하지 않습니다.
    if len(theirs) < 3:
        return 0.0
    if (ours & DISCRIMINATORS) != (theirs & DISCRIMINATORS):
        return 0.0
    ours_mv = ours & MOVEMENTS
    theirs_mv = theirs & MOVEMENTS
    # 양쪽 다 동작 명사가 있는데 하나도 안 겹치면 다른 운동입니다.
    if ours_mv and theirs_mv and not (ours_mv & theirs_mv):
        return 0.0
    if bool(ours_mv) != bool(theirs_mv):
        return 0.0

    inter = ours & theirs
    # 우리 이름이 저쪽 이름에 통째로 들어 있으면 같은 운동으로 봅니다
    # ("Leg Press" ⊂ "Lever Horizontal Leg Press"). 다만 저쪽에만 있는 수식어가
    # 많으면 다른 변형일 수 있어 깎습니다.
    base = len(inter) / len(ours)
    extra = len(theirs - ours)
    return base * (1.0 if extra <= 1 else 0.85 if extra == 2 else 0.6)


def main() -> None:
    src_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/fedbv/data/exercises.json"
    raw = json.load(open(src_path))
    theirs = raw if isinstance(raw, list) else raw.get("exercises", raw)

    # alias 는 쓰지 않습니다. 이 데이터셋의 alias 에는 다른 운동의 이름이
    # 섞여 있습니다 — "Flat Bench Cable Fly" 의 alias 에 "lying leg raise flat
    # bench" 가 들어 있는 식입니다. 저쪽이 free-exercise-db 와 매핑을 시도하다
    # 잘못 붙인 흔적으로 보이는데, 하필 그게 우리 이름이라 그대로 믿으면
    # 레그 레이즈에 케이블 플라이 영상이 붙습니다.
    candidates: list[tuple[set[str], dict]] = [(norm(row["name"]), row) for row in theirs]

    ours = json.load(open(ROOT / "data/exercises.ko.json"))
    matched: dict[str, dict] = {}
    hits = 0

    for e in ours:
        if not e.get("nameEn"):
            continue
        mine = norm(e["nameEn"])
        best, best_score = None, 0.0
        for cand_words, row in candidates:
            if not equipment_ok(e.get("equipment"), row.get("equipment")):
                continue
            s = score(mine, cand_words)
            if s > best_score:
                best, best_score = row, s

        # 1.0(우리 이름이 저쪽 이름에 그대로 들어 있고 군더더기가 없는 경우)만
        # 받습니다. 문턱을 조금만 낮춰도 "크런치"에 "Jackknife Split Crunch" 가
        # 붙습니다 — 짧은 이름은 아무 변형에나 걸립니다. 엉뚱한 영상은 없는
        # 것만 못하므로 커버리지 대신 정확도를 택합니다.
        if best and best_score >= 1.0:
            # 남자 영상이 없는 종목이 27개 있습니다. 그때는 여자 영상을 씁니다 —
            # 동작을 보여주는 것이 목적이라 어느 쪽이든 상관없습니다.
            videos = best.get("videos") or {}
            posters = best.get("thumbnails") or {}
            video = videos.get("male") or videos.get("female")
            if not video:
                continue
            side = "male" if videos.get("male") else "female"
            matched[e["sourceId"]] = {
                "video": video,
                "poster": posters.get(side) or posters.get("male") or posters.get("female"),
                "matchedName": best["name"],
                "score": round(best_score, 2),
            }
            hits += 1

    out = ROOT / "lib/mock/videos.json"
    slim = {k: {"v": v["video"], "p": v["poster"]} for k, v in matched.items()}
    out.write_text(json.dumps(slim, ensure_ascii=False, separators=(",", ":")))

    print(f"우리 종목 {len(ours)}개 중 {hits}개에 영상을 붙였습니다 ({hits * 100 // len(ours)}%)")
    print(f"→ {out.relative_to(ROOT)}  {out.stat().st_size // 1024}KB")

    by_name = {e["sourceId"]: e["nameKo"] for e in ours}
    print("\n붙은 것 일부:")
    for sid, v in list(matched.items())[:12]:
        print(f"  {by_name[sid]:<28} ← {v['matchedName']}  ({v['score']})")


if __name__ == "__main__":
    main()
