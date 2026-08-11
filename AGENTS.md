<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 헬창

루틴을 기록하고 중량이 늘는 것을 보는 앱. 설계서는
`docs/superpowers/specs/2026-08-11-루틴-기록-design.md` 에 있다. 먼저 읽을 것.

## RN 전환 규칙

나중에 React Native 로 넘어간다. **웹에만 있는 것이 UI 바깥으로 새어나가지 않게** 한다.
전환 시 버려지는 것은 `components/` 와 `app/` 의 JSX 뿐이고 나머지는 그대로 옮겨간다.

- **`lib/` 는 순수 TypeScript 다.** 세트 파서, 1RM·볼륨 계산, 날짜/이월 규칙, API
  클라이언트, 타입. `window`·`document`·DOM 이벤트를 쓰지 않는다.
- **데이터 접근은 `lib/api/` 한 곳을 통한다.** 컴포넌트가 `fetch` 를 직접 부르지 않는다.
- **레이아웃은 flexbox 만.** `grid`·`float`·`position: sticky` 는 RN 에 없다.
- **Tailwind 는 NativeWind 지원 부분집합만.** 색·spacing·radius·타이포는 전부
  `app/globals.css` 의 CSS 변수 토큰으로 두고, 클래스에 값을 직접 박지 않는다
  (`bg-[#141715]` 금지). `hover:` 에 동작을 의존하지 않는다 — 터치에는 hover 가 없다.

## 커밋 규칙

### 형식

```
feat: 간단한 요약

- 바뀐 것 1
- 바뀐 것 2

필요한 경우 이렇게 구현한 이유
```

제목은 `타입: 요약` 한 줄. 본문은 `-` 불릿으로 무엇이 바뀌었는지 나열하고,
**판단이 필요했던 부분만** 그 아래에 이유를 적는다. 자명한 변경에 이유를 붙이느라
늘어질 필요는 없다.

**타입** — `feat` 기능 · `fix` 버그 · `refactor` 동작 변화 없는 구조 개선 ·
`perf` 성능 · `docs` 문서 · `test` 테스트 · `build` 빌드·의존성 ·
`ci` 워크플로 · `chore` 그 외

### 커밋 단위

**하나의 커밋은 하나의 완결된 변경이다.** 파일을 고칠 때마다 커밋하지 않는다.
반대로 서로 관계없는 변경을 한 커밋에 몰아넣지도 않는다 — 되돌릴 때 같이 딸려온다.

- 빌드가 깨진 상태로 커밋하지 않는다. 각 커밋에서 앱이 떠야 한다.
- 포맷팅·리네임 같은 잡음은 기능 변경과 분리한다.

### 브랜치와 병합

`main` 에 푸시하면 **바로 배포된다.** 작업은 브랜치에서 하고 PR 로 합친다.

```
feat/session-timer    기능
fix/parser-fullwidth  버그
```

**머지 전에 커밋을 병합한다.** 작업 중의 시행착오(`wip`, `오타 수정`, `되돌림`)가
`main` 히스토리에 남으면 나중에 무엇을 왜 바꿨는지 읽을 수 없다.

## 배포

- 도메인 `hellchang.rheon.kr` · 미니 PC · `~/servers/docker-compose.yml` 공유
- Nginx Proxy Manager 가 `npm_data/nginx/proxy_host/hellchang.conf` 로 프록시한다.
  이 파일은 NPM UI 목록에 보이지 않으므로 수정은 파일을 직접 고칠 것.
- TLS 는 Cloudflare 가 종단한다. nginx 는 80 만 받는다.
