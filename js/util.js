// util.js — 공용 유틸 (세트 공통 컨벤션)
export const log = {
  info: (...a) => console.info('[invoice]', ...a),
  warn: (...a) => console.warn('[invoice]', ...a),
  error: (...a) => console.error('[invoice]', ...a),
};

export function uid(prefix = 'd') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

// 200000 -> "200,000"
export function fmt(n) {
  return Math.round(Number(n) || 0).toLocaleString('ko-KR');
}

// 200000 -> "₩220,000" 스타일
export function fmtWon(n) {
  return `₩${fmt(n)}`;
}

export function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// 2026-07-02 -> 2026년 7월 2일
export function fmtDateKR(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${y}년 ${m}월 ${d}일`;
}

export function slugify(s) {
  return (s || 'document')
    .trim()
    .replace(/[\s/\\]+/g, '-')
    .replace(/[^가-힣a-zA-Z0-9_-]/g, '')
    .slice(0, 50) || 'document';
}

export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
