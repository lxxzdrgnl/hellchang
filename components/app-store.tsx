"use client";

/**
 * 상태를 들고 브라우저에 저장하는 얇은 층. 실제 로직은 전부 lib/store.ts 에 있다.
 * RN 으로 갈 때 여기만 AsyncStorage 로 바꾸면 된다.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { buildSeedState } from "@/lib/mock/seed";
import { registerCustomExercises } from "@/lib/exercises";
import { defaultSettings, emptyState, type AppState } from "@/lib/store";

const KEY = "hellchang.state.v1";

interface Store {
  state: AppState;
  /** 상태를 바꾸는 유일한 통로. 순수 함수를 받아 적용하고 저장한다. */
  update: (fn: (s: AppState) => AppState) => void;
  ready: boolean;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const raw = localStorage.getItem(KEY);
      const next = raw ? (JSON.parse(raw) as AppState) : buildSeedState();
      // 오래된 저장본에는 없던 필드가 있다. 목업이라 마이그레이션 대신 채운다.
      next.deferred ??= [];
      next.customExercises ??= [];
      next.settings ??= defaultSettings;
      registerCustomExercises(next.customExercises);
      setState(next);
    } catch {
      // 저장된 것이 깨졌으면 시드로 되돌린다. 목업에서 복구를 고민할 이유가 없다.
      setState(buildSeedState());
    }
    setReady(true);
  }, []);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState((prev) => {
      const next = fn(prev);
      registerCustomExercises(next.customExercises);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // 용량 초과 등. 화면은 계속 돌아야 한다.
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const next = buildSeedState();
    localStorage.setItem(KEY, JSON.stringify(next));
    setState(next);
  }, []);

  return <Ctx.Provider value={{ state, update, ready, reset }}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AppStoreProvider 안에서만 쓸 수 있다");
  return ctx;
}
