"use client";

/**
 * 동작 데모 영상.
 *
 * 소리가 없는 짧은 반복 영상이라 자동 재생하고 계속 돌립니다. 헬스장에서
 * 재생 버튼을 찾아 누르게 하면 그 사이에 폼을 잊습니다.
 *
 * 한때 IntersectionObserver 로 화면에 들어올 때만 받게 했는데, 탭을 눌러
 * 마운트되는 순간에는 레이아웃이 잡히기 전이라 "안 보인다"고 판정되고 그 뒤로
 * 스크롤하지 않으면 영영 안 떴습니다. 어차피 한 번에 한 종목만 띄우므로
 * 그냥 렌더하고 preload 로 조절합니다.
 */
import { useState } from "react";

interface Props {
  src: string;
  poster?: string | null;
  label: string;
}

export function ExerciseVideo({ src, poster, label }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return poster ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={poster}
        alt={`${label} 자세`}
        className="aspect-video w-full shrink-0 rounded-card bg-surface-2 object-contain"
      />
    ) : null;
  }

  return (
    <video
      key={src}
      src={src}
      poster={poster || undefined}
      aria-label={`${label} 동작 영상`}
      autoPlay
      loop
      muted
      playsInline
      controls={false}
      preload="auto"
      onError={() => setFailed(true)}
      className="aspect-video w-full shrink-0 rounded-card bg-surface-2 object-contain"
    />
  );
}
