"use client";

/**
 * 하단 시트. 종목 선택·세트 편집·확인이 전부 이걸 쓴다.
 *
 * 손이 닿는 화면 아래쪽에서 올라온다 — 운동 중에는 위쪽에 손이 안 간다.
 */
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** 종목 선택처럼 목록이 긴 시트는 화면을 거의 다 쓴다 */
  tall?: boolean;
}

export function Sheet({ open, onClose, title, children, tall }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // 시트가 열린 동안 뒤 화면이 같이 스크롤되면 어디를 만지는지 알 수 없다.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative mt-auto flex w-full max-w-[420px] flex-col rounded-t-[20px] border-t border-line bg-surface ${
          tall ? "h-[88dvh]" : "max-h-[80dvh]"
        }`}
        style={{ animation: "sheet-up .26s var(--ease-out)" }}
      >
        <div className="flex shrink-0 flex-col items-center pt-2.5">
          <div className="h-1 w-9 rounded-pill bg-line" />
        </div>
        {title && (
          <div className="flex shrink-0 items-center justify-between px-4 py-3">
            <h2 className="text-title font-semibold text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 text-meta text-sub active:text-ink"
            >
              닫기
            </button>
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </div>
    </div>
  );
}
