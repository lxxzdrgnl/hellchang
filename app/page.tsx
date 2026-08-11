"use client";

/**
 * 로그인. 목업이라 실제 OAuth 를 타지 않고 닉네임만 세워 오늘로 보낸다.
 * 자리와 흐름은 실제와 같아서, 나중에 Auth.js 를 붙일 때 이 화면은 그대로 둔다.
 *
 * 배경의 사다리는 이 앱이 하는 일 그 자체다 — 램핑업 세트가 계단처럼 올라간다.
 */
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArmMark } from "@/components/logo";
import { useStore } from "@/components/app-store";

export default function LoginPage() {
  const router = useRouter();
  const { state, update, ready } = useStore();

  useEffect(() => {
    if (ready && state.user) router.replace("/today");
  }, [ready, state.user, router]);

  function signIn(provider: "kakao" | "google") {
    update((s) => ({ ...s, user: { nickname: "헬창", provider } }));
    router.replace("/today");
  }

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden px-7">
      <LadderBackdrop />

      <div className="relative flex flex-1 flex-col justify-center gap-3">
        <ArmMark size={54} className="text-accent" />
        <h1 className="text-display font-bold leading-none tracking-tight text-ink">헬창</h1>
        <p className="max-w-[16rem] text-body leading-relaxed text-ink-2">
          오늘 몇 kg을 몇 번 들었는지 적어두면
          <br />
          그게 늘고 있는지 보입니다.
        </p>
      </div>

      <div className="relative flex flex-col gap-2.5 pb-10">
        <button
          type="button"
          onClick={() => signIn("kakao")}
          className="h-13 rounded-btn bg-accent text-body font-bold text-bg transition-colors active:bg-accent-press"
        >
          카카오로 시작하기
        </button>
        <button
          type="button"
          onClick={() => signIn("google")}
          className="h-13 rounded-btn border border-line bg-surface text-body font-semibold text-ink transition-colors active:bg-surface-2"
        >
          구글로 시작하기
        </button>
        <p className="pt-1 text-center text-micro text-sub">
          기록은 계정에 저장되어 폰과 PC에서 같이 보입니다
        </p>
      </div>
    </main>
  );
}

/**
 * 램핑업 사다리를 배경으로 깐다. 장식이 아니라 이 앱의 데이터 모양 그대로다 —
 * 80·100·120·140·160kg 이 6세트에 걸쳐 올라간다.
 */
function LadderBackdrop() {
  const rungs = [0.34, 0.46, 0.58, 0.7, 0.86, 0.28];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2 pt-16 opacity-[0.14]">
      {rungs.map((w, i) => (
        <div
          key={i}
          className="h-11 rounded-r-card bg-accent"
          style={{ width: `${w * 100}%` }}
        />
      ))}
    </div>
  );
}
