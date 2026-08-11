/**
 * 배포 경로를 먼저 뚫기 위한 최소 화면. 오늘 화면이 붙으면 대체된다.
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
      <h1 className="text-4xl font-bold tracking-tight">
        헬<span className="text-accent">창</span>
      </h1>
      <p className="text-meta text-sub">루틴을 기록하고 중량이 늘는 것을 본다</p>
      <div className="mt-6 h-1 w-32 overflow-hidden rounded-pill bg-surface-2">
        <div className="h-full w-1/3 rounded-pill bg-accent" />
      </div>
      <p className="text-micro text-sub">준비 중</p>
    </main>
  );
}
