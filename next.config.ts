import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 폰에서 개발 서버에 붙어 확인한다. 이게 없으면 Next 가 다른 호스트의
  // JS 청크 요청을 막아서, 화면은 뜨는데 버튼이 하나도 안 먹는다.
  allowedDevOrigins: ["192.168.0.12", "localhost", "127.0.0.1"],
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
