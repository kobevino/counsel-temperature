const DAY_MIN = 24 * 60;

/** 무응답 계산에서 빼는 야간 구간 — 자는 동안 전 고객이 차가워지지 않도록 */
const NIGHT_START = 22 * 60;
const NIGHT_END = 8 * 60;
const ACTIVE_PER_DAY = NIGHT_START - NIGHT_END;

/** day0 00:00부터 t(분)까지 쌓인 활동 시간 */
function activeBefore(t: number): number {
  const days = Math.floor(t / DAY_MIN);
  const mod = t - days * DAY_MIN;
  const partial = Math.min(Math.max(mod - NIGHT_END, 0), ACTIVE_PER_DAY);
  return days * ACTIVE_PER_DAY + partial;
}

/**
 * 두 메시지 오프셋 사이의 실 경과 분 — 22:00~08:00은 빠진다.
 * 예: 13:44 → 익일 09:10 은 19시간 26분이 아니라 9시간 26분.
 */
export function activeMinutesBetween(
  startedAt: string,
  fromAt: number,
  toAt: number,
): number {
  const [h, m] = startedAt.split(":").map(Number);
  const base = h * 60 + m;
  const from = base + Math.floor(fromAt / 60_000);
  const to = base + Math.floor(toAt / 60_000);
  return Math.max(0, activeBefore(to) - activeBefore(from));
}

/** wall-clock label for a message offset, anchored to the session start */
export function formatClock(startedAt: string, at: number): string {
  const [h, m] = startedAt.split(":").map(Number);
  const total = h * 60 + m + Math.floor(at / 60_000);
  const day = Math.floor(total / DAY_MIN);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  const clock = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  if (day === 0) return clock;
  return day === 1 ? `익일 ${clock}` : `${day}일 후 ${clock}`;
}

/** elapsed consultation span in minutes → "19시간 32분" / "16분" */
export function formatElapsed(minutes: number): string {
  const total = Math.max(1, Math.floor(minutes));
  const hour = Math.floor(total / 60);
  const min = total % 60;
  if (hour === 0) return `${min}분`;
  return `${hour}시간 ${min}분`;
}

/** "14:18" → "오늘 오후 2:18" */
export function formatDateLabel(startedAt: string): string {
  const [h, m] = startedAt.split(":").map(Number);
  const meridiem = h < 12 ? "오전" : "오후";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `오늘 ${meridiem} ${hour12}:${String(m).padStart(2, "0")}`;
}
