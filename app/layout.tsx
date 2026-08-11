import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";
import { AppStoreProvider } from "@/components/app-store";

/**
 * 한글 데이터 앱에서 흔치 않은 얼굴이면서 숫자 판독이 정확하다. 이 앱은 사람이
 * 숫자를 보러 오는 앱이라 그 점이 제일 중요하다. 위계는 굵기와 크기로만 낸다.
 */
const plex = IBM_Plex_Sans_KR({
  variable: "--font-pretendard",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "헬창",
  description: "루틴을 기록하고 중량이 늘는 것을 봅니다",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "헬창" },
};

export const viewport: Viewport = {
  themeColor: "#0b0d0c",
  width: "device-width",
  initialScale: 1,
  // 세트 행을 연타하다 확대되면 운동이 끊긴다.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

/**
 * PC 에서도 모바일 뷰를 본다. 창이 넓으면 가운데 440px 프레임으로 렌더하고
 * 바깥은 배경으로 둔다. 반응형으로 늘리지 않는 이유는, 늘려봐야 RN 에서 쓸 일이
 * 없는 레이아웃을 따로 유지해야 하기 때문이다.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${plex.variable} h-full`}>
      <body className="antialiased">
        <div className="stage">
          <div className="app">
            <AppStoreProvider>{children}</AppStoreProvider>
          </div>
        </div>
      </body>
    </html>
  );
}
