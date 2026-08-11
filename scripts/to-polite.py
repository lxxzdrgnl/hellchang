#!/usr/bin/env python3
"""
동작 설명의 어미를 '~한다' 에서 '~합니다' 로 바꿉니다.

745종목을 다시 번역하는 대신 어미만 고칩니다. 문장 끝의 서술형만 건드리므로
내용은 그대로입니다. 한국어 활용은 불규칙이 많아 규칙으로 전부 덮을 수 없어서,
자주 나오는 형태를 사전으로 두고 나머지는 일반 규칙으로 처리한 뒤 남은 것을
보고합니다.

    python3 scripts/to-polite.py
"""
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 불규칙이거나 규칙으로 만들면 어색해지는 것들입니다.
IRREGULAR = {
    # '자세다' 를 '세다'(→셉니다)로 읽지 않도록 명사+이다 축약형을 먼저 둡니다.
    # dict 는 삽입 순서를 지키므로 여기 있는 것이 먼저 걸립니다.
    "자세다": "자세입니다", "위치다": "위치입니다", "동작이다": "동작입니다",
    "자세이다": "자세입니다", "지점이다": "지점입니다", "부위다": "부위입니다",
    "차이다": "차이입니다", "목표다": "목표입니다", "기본이다": "기본입니다",

    "한다": "합니다", "된다": "됩니다", "이다": "입니다", "아니다": "아닙니다",
    "쓴다": "씁니다", "둔다": "둡니다", "본다": "봅니다", "든다": "듭니다",
    "든다": "듭니다", "펴다": "폅니다", "편다": "폅니다", "선다": "섭니다",
    "만든다": "만듭니다", "누른다": "누릅니다", "오른다": "오릅니다",
    "내린다": "내립니다", "올린다": "올립니다", "당긴다": "당깁니다",
    "민다": "밉니다", "쥔다": "쥡니다", "판다": "팝니다", "간다": "갑니다",
    "온다": "옵니다", "산다": "삽니다", "잔다": "잡니다", "돈다": "돕니다",
    "구른다": "구릅니다", "기른다": "기릅니다", "부른다": "부릅니다",
    "고른다": "고릅니다", "다른다": "다릅니다", "나른다": "나릅니다",
    "않는다": "않습니다", "없다": "없습니다", "있다": "있습니다",
    "낫다": "낫습니다", "좋다": "좋습니다", "같다": "같습니다",
    "많다": "많습니다", "적다": "적습니다", "크다": "큽니다", "작다": "작습니다",
    "쉽다": "쉽습니다", "어렵다": "어렵습니다", "빠르다": "빠릅니다",
    "느리다": "느립니다", "낮다": "낮습니다", "높다": "높습니다",
    "짧다": "짧습니다", "길다": "깁니다", "무겁다": "무겁습니다",
    "가볍다": "가볍습니다", "위험하다": "위험합니다", "충분하다": "충분합니다",
}


def convert_sentence(text: str) -> str:
    """문장 끝의 서술형만 바꿉니다."""
    text = text.rstrip()
    if not text:
        return text

    # 문장부호를 떼어 두고 나중에 붙입니다.
    m = re.match(r"^(.*?)([.!?…\s]*)$", text, re.S)
    body, tail = m.group(1), m.group(2)
    if not body:
        return text

    for old, new in IRREGULAR.items():
        if body.endswith(old):
            return body[: -len(old)] + new + tail

    # 일반 규칙: 받침 있는 어간 + 는다 → 습니다 (잡는다 → 잡습니다)
    if body.endswith("는다"):
        return body[:-2] + "습니다" + tail

    # 받침 없는 어간 + ㄴ다 → ㅂ니다 (편다 → 폅니다). 한글 조합이 필요합니다.
    m2 = re.search(r"([가-힣])다$", body)
    if m2:
        ch = m2.group(1)
        code = ord(ch) - 0xAC00
        if 0 <= code < 11172:
            jong = code % 28
            if jong == 4:  # ㄴ 받침 → ㅂ 받침 + 니다
                base = 0xAC00 + (code - 4) + 17  # 종성 ㅂ = 17
                return body[:-2] + chr(base) + "니다" + tail

    # 형용사 등 그냥 '-다' 로 끝나는 것: 받침 유무로 습니다/ㅂ니다
    if body.endswith("다") and len(body) >= 2:
        prev = body[-2]
        code = ord(prev) - 0xAC00
        if 0 <= code < 11172:
            jong = code % 28
            if jong == 0:
                return body[:-1] + "ㅂ니다".replace("ㅂ니다", "") + chr(0xAC00 + code + 17) + "니다" + tail
            return body[:-1] + "습니다" + tail

    return text


def convert(text: str) -> str:
    """항목 하나에 문장이 여럿 들어 있습니다. 마침표로 끊어 각각 바꿉니다."""
    parts = re.split(r"(?<=[.!?])\s+", text)
    return " ".join(convert_sentence(p) for p in parts if p is not None)


def main() -> None:
    path = ROOT / "lib/mock/instructions-ko.json"
    data = json.load(open(path))

    leftovers = Counter()
    changed = 0
    for _id, steps in data.items():
        for i, s in enumerate(steps):
            out = convert(s)
            if out != s:
                changed += 1
            steps[i] = out
            # 여전히 '~다.' 로 끝나면 규칙이 못 잡은 것입니다.
            tail = re.sub(r"[.!?…\s]*$", "", out)[-3:]
            if tail.endswith("다"):
                leftovers[tail] += 1

    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    total = sum(len(v) for v in data.values())
    print(f"{total}문장 중 {changed}문장 어미 변경")
    if leftovers:
        print(f"\n못 잡은 어미 {sum(leftovers.values())}건:")
        for k, n in leftovers.most_common(15):
            print(f"  {k} × {n}")


if __name__ == "__main__":
    main()
