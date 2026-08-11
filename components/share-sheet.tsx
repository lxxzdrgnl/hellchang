"use client";

/**
 * 루틴 공유. 링크 자체에 루틴이 담겨 서버가 없어도 열린다.
 */
import { useEffect, useState } from "react";
import { Sheet } from "./sheet";
import { shareUrl } from "@/lib/share";
import type { RoutinePreset } from "@/lib/types";

export function ShareSheet({
  preset,
  onClose,
}: {
  preset: RoutinePreset | null;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!preset) return;
    setUrl(shareUrl(preset, window.location.origin));
    setCopied(false);
  }, [preset]);

  if (!preset) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // 클립보드를 못 쓰는 브라우저도 있다. 그때는 주소를 직접 골라 복사한다.
      setCopied(false);
    }
  }

  async function shareNative() {
    if (!navigator.share) return copy();
    try {
      await navigator.share({ title: `${preset!.name} · 헬창`, url });
    } catch {
      // 사용자가 취소한 것. 아무것도 하지 않는다.
    }
  }

  return (
    <Sheet open onClose={onClose} title="루틴 공유">
      <div className="flex flex-col gap-3 px-4 pb-5">
        <p className="text-meta leading-relaxed text-ink-2">
          <b className="text-ink">{preset.name}</b> 을 링크로 보낸다. 받은 사람은 로그인 없이
          열어보고, 담으면 자기 루틴으로 복사된다.
        </p>

        <p className="selectable break-all rounded-btn bg-surface-2 p-3 font-mono text-micro text-ink-2">
          {url}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="h-13 flex-1 rounded-btn border border-line text-body font-semibold text-ink active:bg-surface-2"
          >
            {copied ? "복사됨" : "링크 복사"}
          </button>
          <button
            type="button"
            onClick={shareNative}
            className="h-13 flex-1 rounded-btn bg-accent text-body font-bold text-bg active:bg-accent-press"
          >
            공유하기
          </button>
        </div>
      </div>
    </Sheet>
  );
}
