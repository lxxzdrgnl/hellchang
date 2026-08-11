/**
 * 날짜는 전부 YYYY-MM-DD 문자열로 다룬다. Date 객체를 돌리면 시간대 때문에
 * 하루가 밀린다 — 이 앱에서 날짜는 시각이 아니라 이름표다.
 */

export function todayISO(now: Date = new Date()): string {
  return toISO(now);
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function weekdayKo(iso: string): string {
  return WEEKDAYS[fromISO(iso).getDay()];
}

/** 그 주 월요일. 일요일은 지난 주로 친다 — 헬스 루틴은 월요일에 시작한다. */
export function weekStart(iso: string): string {
  const d = fromISO(iso);
  const day = d.getDay();
  const back = day === 0 ? 6 : day - 1;
  return addDays(iso, -back);
}

export function weekDates(iso: string): string[] {
  const start = weekStart(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function formatKo(iso: string): string {
  const d = fromISO(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdayKo(iso)})`;
}

export function formatShort(iso: string): string {
  const d = fromISO(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** "3일 전", "오늘", "내일" */
export function relativeKo(iso: string, today: string = todayISO()): string {
  const diff = Math.round(
    (fromISO(iso).getTime() - fromISO(today).getTime()) / 86400000,
  );
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff === -1) return "어제";
  return diff < 0 ? `${-diff}일 전` : `${diff}일 후`;
}
