"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArmMark } from "./logo";

const TABS = [
  { href: "/today", label: "오늘" },
  { href: "/routines", label: "루틴" },
  { href: "/history", label: "기록" },
  { href: "/settings", label: "설정" },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom,0px)]">
      <ul className="flex">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-[54px] flex-col items-center justify-center gap-0.5 text-micro font-medium transition-colors ${
                  active ? "text-accent" : "text-sub"
                }`}
              >
                <TabIcon name={tab.label} active={active} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * 아이콘은 각 탭이 하는 일에서 왔다 — 오늘은 굽힌 팔(운동 그 자체),
 * 루틴은 주간 격자, 기록은 올라가는 선, 설정은 사람.
 */
function TabIcon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? 2.2 : 1.8;
  if (name === "오늘") return <ArmMark size={19} />;
  if (name === "루틴")
    return (
      <svg viewBox="0 0 24 24" width={19} height={19} fill="none" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth={stroke} />
        <path d="M3.5 10h17M9 3.5v3M15 3.5v3" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      </svg>
    );
  if (name === "기록")
    return (
      <svg viewBox="0 0 24 24" width={19} height={19} fill="none" aria-hidden="true">
        <path
          d="M4 16.5l4.5-5 3.5 3 7.5-8"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M4 20h16" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" width={19} height={19} fill="none" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.8" stroke="currentColor" strokeWidth={stroke} />
      <path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  );
}
