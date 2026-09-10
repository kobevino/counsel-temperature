# 상담 워크스페이스 — 대화 온도계 프로토타입

보험 상담사가 채팅 상담 중 AI가 분석한 고객의 "대화 온도(이탈 위험도)"를 실시간으로 확인하는 어드민 프로토타입.

- 스펙: `_specs/counsel-temperature-workspace.md`
- 고객 목록·대화는 mock 데이터 + 대본 재생 방식. 유일한 실 백엔드는 `POST /api/temperature`(Anthropic API).

## 실행

```sh
pnpm install

# 1) API 키 없이 데모 (결정적 mock 분석)
TEMPERATURE_MOCK=1 pnpm dev

# 2) 실제 Claude 분석
cp .env.example .env.local   # ANTHROPIC_API_KEY 입력
pnpm dev
```

http://localhost:3000 접속. `ANTHROPIC_API_KEY`가 없으면 자동으로 mock 분석으로 동작한다.

## 데모 방법

1. 박윤수 고객 선택(기본). 입력창 위 **힌트**가 다음 대본이 기대하는 상담사 발화를 보여준다.
2. 자유롭게 입력해 전송하면 고객이 대본 순서대로 응답하고, 고객 발화마다 우측 온도 분석이 자동 갱신된다.
3. 분기 스텝에서는 고객 반응(관심/보류)을 선택할 수 있다 — 온도 추이가 갈라진다.
4. 우측 하단 근거 인용 칩을 클릭하면 해당 고객 발화로 스크롤·하이라이트된다.

## 구조

- `app/api/temperature/route.ts` — 온도 분석. LLM은 4축(관심/신뢰/의향/저항) 평가와 발화 인용만 담당하고, 최종 이탈 위험도는 `lib/score.ts`의 가중합으로 계산. 인용은 `lib/quotes.ts`에서 실제 발화 대조로 검증(환각 가드).
- `store/session.ts` — zustand + sessionStorage persist. 대본 재생, 분기, 스냅샷 이력.
- `hooks/useTemperature.ts` — react-query mutation, 고객 발화마다 자동 트리거(latest-wins 중복 방지).
- `lib/mock/` — 고객 4명 + 상담 대본.
- `components/coach/` — 이탈 확률 게이지, 턴별 추이 차트, AI 코칭 알림, 분석 근거.

가중치 튜닝은 `lib/score.ts`의 `AXIS_WEIGHTS`, 평가 루브릭은 `lib/prompt.ts`.
