# 워커 역할 설명

워커별 역할 설명(머리말)은 각 에이전트 파일 본문에 들어 있다. 모델·노력도 그 파일 머리말에 고정돼 있다.

| 워커 | 파일 | model | effort | 쓰는 모드 |
|---|---|---|---|---|
| 설계 | `agents/w-design.md` | opus | xhigh | 기본·강화 |
| 증명 작성 | `agents/w-proof-write.md` | opus | xhigh | 절약·기본 |
| 증명 작성 (Fable) | `agents/prover-fable.md` | fable | max | 극한 |
| 증명 검증 | `agents/w-proof-verify.md` | opus | xhigh | 전부 |
| 구현 (Haiku) | `agents/w-implement-lite.md` | haiku | max | 절약(기본 구현), 기본(쉬운 단위) |
| 구현 (Sonnet) | `agents/w-implement.md` | sonnet | medium | 절약(어려운 단위), 기본(기본 구현) |
| 구현 (Opus) | `agents/w-implement-opus.md` | opus | medium | 기본(까다로운 단위), 강화(기본 구현, worktree) |
| 데이터 처리 | `agents/w-data.md` | haiku | max | 절약·기본·강화 |
| 실험 실행 | `agents/w-experiment.md` | haiku | max | 절약·기본·강화 |
| 잡일 | `agents/w-chore.md` | haiku | medium | 절약·기본·강화 |

코드 검증은 워커가 아니라 check 스킬 + `checker-test`(test) / `checker`(review·debug) / `checker-lite`(절약 모드의 가벼운 review) 에이전트가 맡는다. SKILL.md 4단계 참고. 강화·최대·극한 모드의 구현·리뷰 에이전트(`su-*`, `w-implement-opus`, `*-fable`)는 각 스킬 표에 있다.

역할 설명을 바꾸려면 해당 에이전트 파일 본문을 고친다. 모델·노력을 바꾸면 이 표와 SKILL.md 3단계 표, `lite`·`plus` 스킬 표, README도 같이 고친다. 훅과 한도 추정기는 agents/ 폴더를 직접 읽으므로 따로 고칠 필요가 없다.
