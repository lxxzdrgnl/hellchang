import { NextResponse } from "next/server";
import instructions from "@/lib/mock/instructions-ko.json";

/**
 * 종목 동작 설명. 464KB 라 클라이언트 번들에 싣지 않고 필요할 때만 가져온다 —
 * 종목 상세를 열어야 보는 것이라 목록 화면에는 필요 없다.
 *
 * DB 가 붙으면 이 파일의 몸통만 Prisma 조회로 바뀌고 호출부는 그대로다.
 */
const byId = instructions as Record<string, string[]>;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const steps = byId[id];
  if (!steps) return NextResponse.json({ steps: [] });
  return NextResponse.json(
    { steps },
    // 종목 설명은 바뀌지 않는다. 한 번 받으면 계속 쓴다.
    { headers: { "Cache-Control": "public, max-age=86400, immutable" } },
  );
}
