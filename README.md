# 상담 워크스페이스 — 대화 온도계 프로토타입

보험 상담사가 채팅 상담 중 AI가 분석한 고객의 "대화 온도(이탈 위험도)"를 실시간으로 확인하는 어드민 프로토타입.

- 스펙: `_specs/counsel-temperature-workspace.md`
- 고객 목록은 mock 데이터. 고객 답변은 페르소나 기반으로 `POST /api/customer-reply`(Anthropic API)가 생성하고, 온도 분석은 `POST /api/temperature`가 담당. 둘 다 API 키가 없으면 결정적 mock으로 폴백.

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

1. 박윤수 고객 선택(기본). 자유롭게 입력해 전송하면 고객 페르소나가 문맥에 맞게 응답한다 — 보험 상담이든 일상 잡담이든 이어진다.
2. 고객 발화마다 우측 온도 분석이 자동 갱신된다. 성의 있는 안내는 온도를 낮추고, 얼버무리거나 정보만 요구하면 이탈 위험이 올라간다.
3. 우측 하단 근거 인용 칩을 클릭하면 해당 고객 발화로 스크롤·하이라이트된다.

## 구조

- `app/api/customer-reply/route.ts` — 고객 답변 생성. `lib/personas.ts`의 페르소나 템플릿(성격/상황/민감 포인트)을 시스템 프롬프트로 Claude가 고객을 연기. 키가 없거나 호출 실패 시 `lib/mock/replies.ts`의 키워드 템플릿으로 폴백해 고객이 침묵하는 일이 없다.
- `app/api/temperature/route.ts` — 온도 분석. LLM은 4축(관심/신뢰/의향/저항) 평가와 발화 인용만 담당하고, 최종 이탈 위험도는 `lib/score.ts`의 가중합으로 계산. 인용은 `lib/quotes.ts`에서 실제 발화 대조로 검증(환각 가드).
- `store/session.ts` — zustand + sessionStorage persist. 상담사 발화 → 고객 답변 요청, 스냅샷 이력. 새로고침으로 답변 요청이 끊기면 재요청.
- `hooks/useTemperature.ts` — react-query mutation, 고객 발화마다 자동 트리거(latest-wins 중복 방지).
- `lib/mock/` — 고객 4명 + 오프닝 대화 + 키워드 응답 템플릿.
- `components/coach/` — 이탈 확률 게이지, 턴별 추이 차트, AI 코칭 알림, 분석 근거.

가중치 튜닝은 `lib/score.ts`의 `AXIS_WEIGHTS`, 평가 루브릭은 `lib/prompt.ts`.
