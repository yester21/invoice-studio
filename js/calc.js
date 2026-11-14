// calc.js — 금액 계산 (실제 발행 문서 규칙: 공급가액 → 세액 10% → 합산 → 수량 → 총합산금액)
// 품목 입력은 공급가액만 받고 나머지는 파생된다 — "입력은 사람, 계산은 코드"

export const VAT_RATE = 0.1;
export const WITHHOLDING_RATE = 0.033; // 사업소득 원천징수 3.3%

/**
 * 품목 하나의 금액을 계산한다.
 * @param {{supply: number, qty: number}} item supply = 공급가액(단가), qty = 수량
 * @param {boolean} vatEnabled 부가세 포함 여부
 */
export function calcItem(item, vatEnabled) {
  const supply = Math.max(0, Math.round(Number(item.supply) || 0));
  const qty = Math.max(0, Number(item.qty) || 0);
  const supplyTotal = supply * qty;
  const vat = vatEnabled ? Math.round(supplyTotal * VAT_RATE) : 0;
  const lineSum = supplyTotal + vat;       // 합산 (공급가액 + 세액)
  return { supplyTotal, vat, lineSum };
}

/**
 * 문서 전체 금액 계산.
 * @returns {{
 *   items: Array, supplyTotal: number, vatTotal: number,
 *   grandTotal: number, withholding: number, payout: number
 * }}
 */
export function calcDocument(doc) {
  const vatEnabled = doc.vatEnabled !== false;
  const items = (doc.items || []).map((it) => ({ ...it, ...calcItem(it, vatEnabled) }));
  const supplyTotal = items.reduce((s, i) => s + i.supplyTotal, 0);
  const vatTotal = items.reduce((s, i) => s + i.vat, 0);
  const grandTotal = supplyTotal + vatTotal;

  // 원천징수는 "공급가액 기준 3.3%"가 원칙이지만 3.3%법정율은 (공급가액+세액)에 대해
  // 3.3/1.1을 적용하는 경우도 있다 — 여기서는 실무 통행 방식(공급가액 기준 3.3%)으로 계산하고 표기한다.
  const whRate = Number(doc.withholdingRate) > 0 ? Number(doc.withholdingRate) : 3.3;
  const withholding = doc.withholding ? Math.round(supplyTotal * (whRate / 100)) : 0;
  const payout = grandTotal - withholding;

  return { items, supplyTotal, vatTotal, grandTotal, withholding, payout, whRate };
}

/**
 * 문서번호 자동 생성: 2026-001 형식 (연도 + 해당 연도 순번)
 */
export function nextDocNumber(docs, type) {
  const year = new Date().getFullYear();
  const prefix = (type === 'quote' ? 'Q' : 'I') + year + '-';
  const seq = docs
    .filter((d) => (d.number || '').startsWith(prefix))
    .map((d) => Number((d.number || '').split('-')[1]) || 0)
    .reduce((a, b) => Math.max(a, b), 0) + 1;
  return `${prefix}${String(seq).padStart(3, '0')}`;
}
