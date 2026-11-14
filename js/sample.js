// sample.js — 실제 발행 문서 구조를 그대로 옮긴 샘플 2건 (견적서·인보이스 각 1)
// 문구·금액은 [샘플]로 치환했다.
import { todayISO } from './util.js';

export function sampleDocs() {
  return [
    {
      id: 'sample-quote',
      type: 'quote',
      number: 'Q' + new Date().getFullYear() + '-001',
      clientName: '[샘플] 주식회사 홈델리',
      clientContact: '담당자 홍길동 / 010-0000-0000',
      issueDate: todayISO(),
      validUntil: todayISO(14),
      vatEnabled: true,
      withholding: false,
      withholdingRate: 3.3,
      bank: '',
      etc: '작업 시작 전 카페24 로그인 아이디 비번이 필요합니다. [샘플 문구]',
      notes: [
        '견적 유효기간은 발행일로부터 14일입니다.',
        '작업 기간은 착수일 기준 총 5영업일입니다. [샘플]',
        '수정 요청은 납품 후 2주 이내 2회까지 포함되며, 초과분은 별도 비용이 발생할 수 있습니다.',
        '도메인·호스팅 비용은 본 견적에 포함되지 않습니다.',
      ],
      items: [
        {
          id: 'sample-item-1',
          name: '홈페이지 업데이트 및 보안점검',
          details: [
            '1. PHP 업데이트 및 호환성 점검',
            '2. 워드프레스 코어 업데이트',
            '3. 테마 및 주요 플러그인 업데이트',
            '4. 안티 멀웨어 업데이트 및 보안 점검',
            '5. 서버 사이드 보안 설정 점검 및 조정',
          ],
          supply: 200000,
          qty: 1,
        },
        {
          id: 'sample-item-2',
          name: '월 유지보수 (1개월)',
          details: ['* 백업 · 업데이트 · 장애 대응 포함'],
          supply: 90000,
          qty: 1,
        },
      ],
    },
    {
      id: 'sample-invoice',
      type: 'invoice',
      number: 'I' + new Date().getFullYear() + '-001',
      clientName: '[샘플] 주식회사 연우무대',
      clientContact: '담당자 홍길동 / 010-0000-0000',
      issueDate: todayISO(),
      validUntil: '',
      vatEnabled: true,
      withholding: false,
      withholdingRate: 3.3,
      bank: '신한 / 000-000000-000000 / [샘플] 홍길동',
      etc: '',
      notes: [
        '입금 확인 후 세금계산서를 발행합니다. [샘플]',
        '입금 시 문서번호를 송금 메모에 함께 적어주세요.',
      ],
      items: [
        {
          id: 'sample-item-3',
          name: '홈페이지 유지보수',
          details: ['* 멤버십 안내문구 오류 수정 등'],
          supply: 90000,
          qty: 1,
        },
      ],
    },
  ];
}
