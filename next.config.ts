import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 미니 PC 컨테이너에 node_modules 를 통째로 넣지 않기 위해 트레이싱된
  // 산출물만 옮긴다. Dockerfile 런타임 스테이지가 이것을 전제한다.
  output: "standalone",
  images: {
    // 운동 이미지는 free-exercise-db 원본을 참조한다. 저장소에 커밋하면
    // 레포가 수백 MB 로 붓는다.
    remotePatterns: [
      { protocol: "https", hostname: "raw.githubusercontent.com", pathname: "/yuhonas/free-exercise-db/**" },
    ],
  },
};

export default nextConfig;
