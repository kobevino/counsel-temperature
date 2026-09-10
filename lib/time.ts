/** wall-clock label for a message offset, anchored to the session start */
export function formatClock(startedAt: string, at: number): string {
  const [h, m] = startedAt.split(":").map(Number);
  const total = h * 60 + m + Math.floor(at / 60_000);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** "14:18" → "오늘 오후 2:18" */
export function formatDateLabel(startedAt: string): string {
  const [h, m] = startedAt.split(":").map(Number);
  const meridiem = h < 12 ? "오전" : "오후";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `오늘 ${meridiem} ${hour12}:${String(m).padStart(2, "0")}`;
}
