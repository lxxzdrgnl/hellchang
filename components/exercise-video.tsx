"use client";

/**
 * 동작 데모 영상.
 *
 * 소리가 없는 짧은 반복 영상이라 자동 재생하고 계속 돌립니다. 헬스장에서
 * 재생 버튼을 찾아 누르게 하면 그 사이에 폼을 잊습니다. 다만 데이터를 아끼려고
 * 화면에 들어왔을 때만 받습니다.
 */
import { useEffect, useRef, useState } from "react";

interface Props {
  src: string;
  poster?: string | null;
  label: string;
}

export function ExerciseVideo({ src, poster, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      className="relative aspect-video w-full shrink-0 overflow-hidden rounded-card bg-surface-2"
    >
      {visible ? (
        <video
          src={src}
          poster={poster ?? undefined}
          aria-label={`${label} 동작 영상`}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="size-full object-contain"
        />
      ) : (
        poster && (
          /* 영상을 받기 전에는 포스터만 띄웁니다. 자리가 비어 있으면 화면이 튑니다. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={poster} alt="" className="size-full object-contain" />
        )
      )}
    </div>
  );
}
