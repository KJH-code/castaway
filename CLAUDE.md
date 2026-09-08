# castaway

브라우저 게임. TypeScript + Vite + Canvas 2D. 협업 프로젝트.

## 스택

- TypeScript (strict), Vite 8, Canvas 2D
- 프레임워크·게임엔진 라이브러리 없음. 렌더링은 `CanvasRenderingContext2D` 직접 사용
- 라이선스 GPL-3.0

## 명령

| | |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | `src/*.test.ts` 자체 검사 (tsx로 직접 실행, 테스트 프레임워크 없음) |
| `npm run build` | `tsc && vite build` → `dist/` |
| `npm run preview` | 빌드 결과 확인 |

## 구조

```
index.html      캔버스 하나
src/main.ts     엔트리 — 리사이즈, 게임 상태, update/render
src/loop.ts     고정 스텝 루프 (60Hz update, 보간 render)
src/loop.test.ts
src/input.ts    키 눌림 상태
src/style.css
```

## 규칙

- **update는 고정 스텝, render는 보간.** `update(dt)`에서 `dt`는 항상 `1/60`이다.
  물리·게임 로직에 프레임 시간을 직접 쓰지 말 것. 화면에 그리는 위치만
  `render(alpha)`에서 이전 상태와 현재 상태를 `alpha`로 섞는다.
  협업자가 이 규칙을 깨면 기기마다 게임이 달라진다.
- **캔버스 좌표는 CSS 픽셀.** 백킹 스토어는 `devicePixelRatio`로 스케일되고
  `ctx.setTransform`이 이미 보정한다. 로직에서 `canvas.width`를 읽지 말고
  `main.ts`의 `width`/`height`를 쓸 것.
- 새 상태를 추가하면 이전 프레임 값(`px`/`py` 같은)도 같이 두어 보간이 유지되게 한다.
- 비자명한 로직(분기·루프·파서)에는 `src/*.test.ts` 자체 검사를 하나 남긴다.
  프레임워크는 쓰지 않는다. `assert` + `npm test`로 충분하다.
- 사용자 눈에 보이는 변경은 실제 브라우저에서 확인하고 커밋한다.

## 함정

- `tsconfig.json`의 `noUnusedLocals`/`noUnusedParameters`가 켜져 있다.
  쓰지 않는 변수는 빌드를 깬다.
- `npm install` 후 esbuild postinstall이 npm 11의 allow-scripts 게이트에 막힌다.
  빌드가 esbuild를 못 찾으면 `npm approve-scripts esbuild`.
