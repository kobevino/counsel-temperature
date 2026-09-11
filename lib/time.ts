const DAY_MIN = 24 * 60;

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
