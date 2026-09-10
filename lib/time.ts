/** wall-clock label for a message offset, anchored to the session start */
export function formatClock(startedAt: string, at: number): string {
  const [h, m] = startedAt.split(":").map(Number);
  const total = h * 60 + m + Math.floor(at / 60_000);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** duration in ms → "3분 12초" / "47초" */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  if (min === 0) return `${sec}초`;
  return `${min}분 ${sec}초`;
}

/** customer-list "N분 전" / "방금" label → offset in ms */
export function agoToMs(label: string): number {
  const match = label.match(/(\d+)\s*분/);
  return match ? Number(match[1]) * 60_000 : 0;
}

/** "14:18" → "오늘 오후 2:18" */
export function formatDateLabel(startedAt: string): string {
  const [h, m] = startedAt.split(":").map(Number);
  const meridiem = h < 12 ? "오전" : "오후";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `오늘 ${meridiem} ${hour12}:${String(m).padStart(2, "0")}`;
}
