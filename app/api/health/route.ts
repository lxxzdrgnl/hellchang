import { NextResponse } from "next/server";

// 배포 직후 컨테이너가 실제로 응답하는지 확인하는 용도. DB 는 아직 건드리지 않는다 —
// 여기서 DB 를 물면 DB 지연이 헬스체크 실패로 둔갑한다.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
