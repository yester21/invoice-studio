// sample.js — 첫 방문 시 로드되는 시작 템플릿 2건 (견적서·인보이스)
// 실제 내용은 넣지 않고, 각 칸에 "무엇을 입력하는지" 안내 문구를 미리 채워둔다.
// 사용자가 문구를 지우고 입력하면 그대로 문서가 된다.
import { todayISO } from './util.js';

export function sampleDocs() {
  return [
    {
      id: 'tpl-quote',
      type: 'quote',
      number: 'Q' + new Date().getFullYear() + '-001',
      clientName: '',
      clientContact: '',
      issueDate: todayISO(),
      validUntil: todayISO(14),
      vatEnabled: true,
      withholding: false,
      withholdingRate: 3.3,
      bank: '',
      etc: '',
      notes: [
        '견적 유효기간은 발행일로부터 14일입니다. (필요하면 수정하세요)',
        '여기에 참고사항을 적어주세요 — 작업 기간, 수정 요청 횟수, 견적 포함/제외 범위 등.',
      ],
      items: [
        {
          id: 'tpl-quote-item-1',
          name: '품명을 입력하세요 (예: 홈페이지 리뉴얼)',
          details: [
            '1. 상세 내역을 입력하세요 (예: 메인 페이지 1P)',
            '2. 상세 내역을 입력하세요 (예: 서브 페이지 Np)',
            '상세 줄은 자유롭게 추가·삭제할 수 있습니다.',
          ],
          supply: 0,
          qty: 1,
        },
        {
          id: 'tpl-quote-item-2',
          name: '두 번째 품명 (예: 월 유지보수 1개월) — 필요 없으면 이 줄을 삭제하세요',
          details: [],
          supply: 0,
          qty: 1,
        },
      ],
    },
    {
      id: 'tpl-invoice',
      type: 'invoice',
      number: 'I' + new Date().getFullYear() + '-001',
      clientName: '',
      clientContact: '',
      issueDate: todayISO(),
      validUntil: '',
      vatEnabled: true,
      withholding: false,
      withholdingRate: 3.3,
      bank: '은행 / 계좌번호 / 예금주 순서로 입력하세요 (예: 신한 / 100-000-000000 / 홍길동)',
      etc: '여기에 입금 안내 등 필요한 문구를 적어주세요. (비워두면 이 줄만 표시됩니다)',
      notes: [
        '인보이스 참고사항을 적어주세요 — 입금 기한, 세금계산서 발급 안내, 담당자 연락처 등.',
      ],
      items: [
        {
          id: 'tpl-invoice-item-1',
          name: '품명을 입력하세요 (예: 9월 유지보수)',
          details: [
            '1. 상세 내역을 입력하세요 (예: 백업 · 업데이트 · 장애 대응)',
            '상세 줄은 자유롭게 추가·삭제할 수 있습니다.',
          ],
          supply: 0,
          qty: 1,
        },
      ],
    },
  ];
}
