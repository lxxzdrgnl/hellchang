import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "헬창",
  description: "루틴을 기록하고 중량이 늘는 것을 본다",
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
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full bg-black">
        <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-bg">
          {children}
        </div>
      </body>
    </html>
  );
}
