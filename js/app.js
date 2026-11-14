// app.js — 인보이스 스튜디오 메인 애플리케이션
import { store } from './store.js';
import { sampleDocs } from './sample.js';
import { calcDocument, nextDocNumber } from './calc.js';
import { fmt, fmtWon, fmtDateKR, todayISO, download, slugify, log } from './util.js';

const $ = (sel) => document.querySelector(sel);

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

function docTitle(doc) {
  return doc.type === 'quote' ? '견적서' : '인보이스';
}

function clientLabel(doc) {
  return doc.clientName || '(클라이언트(공급받는자) 이름을 입력하세요)';
}

// ---------- 토스트 / 모달 ----------
function toast(message, { type = '', actionLabel = '', onAction = null, timeout = 3200 } = {}) {
  const area = $('#toast-area');
  const t = el('div', { class: `toast ${type}` },
    el('span', {}, message),
    actionLabel && onAction ? el('button', { onclick: () => { onAction(); t.remove(); } }, actionLabel) : null
  );
  area.append(t);
  if (timeout > 0) setTimeout(() => t.remove(), timeout);
  return t;
}

function openModal(title, desc, buildContent) {
  const root = $('#modal-root');
  root.innerHTML = '';
  const content = el('div', { class: 'modal-body' });
  const modal = el('div', { class: 'modal', role: 'dialog', 'aria-label': title },
    el('button', { class: 'modal-close', title: '닫기', 'aria-label': '닫기', onclick: () => close() }, '✕'),
    el('h2', {}, title),
    desc ? el('p', { class: 'modal-desc' }, desc) : null,
    content
  );
  root.append(modal);
  const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  buildContent(content, close);
  return close;
}

// ---------- 렌더 ----------
function repaint() {
  renderRail();
  renderPaper();
  renderEditor();
}

function renderRail() {
  const rail = $('#doc-rail');
  rail.innerHTML = '';
  rail.append(el('div', { class: 'rail-label' }, '문서'));

  for (const doc of store.docs) {
    const calc = calcDocument(doc);
    const item = el('div', {
      class: `doc-item ${doc.id === store.selectedId ? 'active' : ''}`,
      onclick: () => store.select(doc.id),
      role: 'button', tabindex: '0',
    },
      el('span', { class: `d-type ${doc.type}` }, docTitle(doc)),
      el('div', { class: 'd-title' }, clientLabel(doc)),
      el('div', { class: 'd-meta' },
        el('span', { class: 'd-no' }, doc.number),
        el('span', {}, fmtDateKR(doc.issueDate)),
      ),
      el('div', { class: 'd-amount' }, fmtWon(calc.grandTotal)),
      el('div', { class: 'doc-actions' },
        el('button', { title: '복제', onclick: (e) => { e.stopPropagation(); store.duplicateDoc(doc.id); toast('문서를 복제했습니다.'); } }, '⧉'),
        el('button', { title: '삭제', onclick: (e) => { e.stopPropagation(); deleteDoc(doc.id); } }, '✕'),
      ),
    );
    rail.append(item);
  }

  rail.append(el('div', { id: 'new-doc-buttons' },
    el('button', { class: 'btn btn-text', onclick: () => { store.addDoc('quote'); toast('새 견적서를 만들었습니다.'); } }, '+ 견적서'),
    el('button', { class: 'btn btn-text', onclick: () => { store.addDoc('invoice'); toast('새 인보이스를 만들었습니다.'); } }, '+ 인보이스'),
  ));
}

function deleteDoc(id) {
  const doc = store.docs.find((d) => d.id === id);
  if (!doc) return;
  if (store.docs.length <= 1) {
    toast('마지막 문서는 삭제할 수 없습니다.', { type: 'warn' });
    return;
  }
  store.deleteDoc(id);
  toast(`${docTitle(doc)}을 삭제했습니다.`, {
    actionLabel: '실행 취소',
    onAction: () => store.restoreDeleted(),
    timeout: 6000,
  });
}

// ---------- A4 문서 렌더 (실제 발행 문서 레이아웃 재현) ----------
function renderPaper() {
  const paper = $('#paper');
  paper.innerHTML = '';
  const doc = store.current;
  if (!doc) return;
  const calc = calcDocument(doc);
  const S = store.sender;
  const isQuote = doc.type === 'quote';

  // 상단: 타이틀/클라이언트/날짜 + 공급자 테이블
  const headLeft = el('div', { class: 'doc-head-left' },
    el('h1', { class: 'doc-title' }, docTitle(doc)),
    el('div', { class: 'doc-client' }, clientLabel(doc)),
    el('div', { class: 'doc-date' },
      el('span', { class: 'lab' }, '발송일'),
      el('span', {}, fmtDateKR(doc.issueDate)),
    ),
  );

  const senderTable = el('table', { class: 'sender-table' },
    el('tr', {}, el('th', { colspan: '2' }, '공급자')),
    el('tr', {}, el('td', { class: 'k' }, '상호'), el('td', {}, S.name || '')),
    el('tr', {}, el('td', { class: 'k' }, '등록번호'), el('td', {}, S.bizNo || '')),
    el('tr', {}, el('td', { class: 'k' }, '주소'), el('td', {}, S.address || '')),
    el('tr', {}, el('td', { class: 'k' }, '전화'), el('td', {}, S.phone || '')),
    el('tr', {}, el('td', { class: 'k' }, '이메일'),
      el('td', {}, S.email ? el('a', { href: `mailto:${S.email}` }, S.email) : '')),
  );

  paper.append(el('div', { class: 'doc-head' }, headLeft, senderTable));

  // 금액 밴드
  paper.append(el('div', { class: 'amount-band' },
    el('div', { class: 'ab-label' },
      isQuote ? '견적금액' : '금액',
      el('small', {}, '(공급가액 + 세액)'),
    ),
    el('div', { class: 'ab-total' }, fmtWon(calc.grandTotal)),
  ));

  // 품목 테이블
  const tbody = el('tbody', {});
  for (const it of calc.items) {
    const cellName = el('td', {},
      el('div', { class: 'item-name' }, it.name || '(품명 미입력)'),
      it.details && it.details.length
        ? el('div', { class: 'item-details' }, it.details.map((d) => el('div', {}, d)))
        : null,
    );
    cellName.className = 'col-name';
    tbody.append(el('tr', {},
      cellName,
      el('td', { class: 'num col-supply' }, fmt(it.supplyTotal)),
      el('td', { class: 'num col-vat' }, doc.vatEnabled ? fmt(it.vat) : '—'),
      el('td', { class: 'num col-sum' }, fmt(it.lineSum)),
      el('td', { class: 'num col-qty' }, String(it.qty)),
      el('td', { class: 'num col-total' }, el('span', { class: 't' }, fmt(it.lineSum))),
    ));
  }
  if (!calc.items.length) {
    tbody.append(el('tr', {}, el('td', { colspan: '6', style: 'text-align:center;color:#999;padding:30px' }, '품목을 추가해 주세요.')));
  }

  const itemsTable = el('table', { class: 'items-table' },
    el('thead', {},
      el('tr', {},
        el('th', { class: 'col-name' }, '품명'),
        el('th', { class: 'num col-supply' }, '공급가액'),
        el('th', { class: 'num col-vat' }, '세액'),
        el('th', { class: 'num col-sum' }, '합산'),
        el('th', { class: 'num col-qty' }, '수량'),
        el('th', { class: 'num col-total' }, '총합산금액'),
      ),
    ),
    tbody,
  );
  paper.append(itemsTable);

  // 원천징수 라인
  if (calc.withholding > 0) {
    paper.append(el('table', { class: 'sum-extra' },
      el('tbody', {},
        el('tr', {},
          el('td', { class: 'lab' }, `사업소득 원천징수 (${calc.whRate}%)`),
          el('td', { class: 'num' }, `−${fmt(calc.withholding)}`),
        ),
        el('tr', { class: 'payout' },
          el('td', { class: 'lab' }, '실 수령액'),
          el('td', { class: 'num' }, fmtWon(calc.payout)),
        ),
      ),
    ));
  }

  // 유효기간 (견적서)
  if (isQuote && doc.validUntil) {
    paper.append(el('div', { class: 'doc-block' },
      el('div', { class: 'bb-head' }, '견적 유효기간'),
      el('div', { class: 'bb-body' }, `${fmtDateKR(doc.validUntil)}까지 유효`),
    ));
  }

  // 참고 사항
  const noteLines = (doc.notes || []).filter((n) => n.trim());
  const notesBody = noteLines.length
    ? el('div', { class: 'bb-body' }, noteLines.map((n) => el('div', {}, n)))
    : el('div', { class: 'bb-body dim' }, ' ');
  paper.append(el('div', { class: 'doc-block' },
    el('div', { class: 'bb-head' }, '참고 사항'),
    notesBody,
  ));

  // 기타 (계좌)
  const etcLines = [doc.bank && `계좌 ${doc.bank}`, doc.etc].filter(Boolean);
  const etcBody = etcLines.length
    ? el('div', { class: 'bb-body' }, etcLines.map((n) => el('div', {}, n)))
    : el('div', { class: 'bb-body dim' }, ' ');
  paper.append(el('div', { class: 'doc-block' },
    el('div', { class: 'bb-head' }, '기타'),
    etcBody,
  ));
}

// ---------- 편집기 ----------
function renderEditor() {
  const pane = $('#editor-pane');
  pane.innerHTML = '';
  const doc = store.current;
  if (!doc) {
    pane.append(el('p', { style: 'color:var(--ui-sub)' }, '문서를 선택하거나 추가해 주세요.'));
    return;
  }
  const upd = (fn) => store.updateCurrent(fn);

  // 문서 유형 + 기본 정보
  const typeToggle = el('div', { class: 'toggle-row' },
    el('div', {},
      el('div', { class: 't-label' }, '유형'),
      el('div', { class: 't-sub' }, '견적서 = 유효기간 포함 / 인보이스 = 계좌 강조'),
    ),
    toggle(doc.type === 'invoice', (v) => {
      const wasQuote = doc.type === 'quote';
      upd((d) => {
        d.type = v ? 'invoice' : 'quote';
        if (v && !d.validUntil) d.validUntil = '';
        if (!v && !d.validUntil) d.validUntil = todayISO(14);
      });
      renderEditor();
      // 유형 전환 시 참고사항 점검 안내 — 견적 전용 문구가 인보이스에 남지 않게 (자동 삭제는 하지 않음)
      const noteText = (doc.notes || []).join(' ');
      if (v && wasQuote && /유효기간|견적/.test(noteText)) {
        toast('유형이 인보이스로 바뀌었습니다. 참고사항에 견적 전용 문구(유효기간 등)가 남아 있지 않은지 확인해 주세요.', { timeout: 6500 });
      }
    }),
  );
  pane.append(section('문서', el('div', {},
    typeToggle,
    textField('문서번호', doc.number, 'Q2026-001', (v) => upd((d) => { d.number = v; })),
    el('div', { class: 'form-grid' },
      el('div', { class: 'field' }, el('label', {}, '발송일'),
        dateInput(doc.issueDate, (v) => upd((d) => { d.issueDate = v; }))),
      doc.type === 'quote'
        ? el('div', { class: 'field' }, el('label', {}, '유효기간'),
            dateInput(doc.validUntil, (v) => upd((d) => { d.validUntil = v; })))
        : el('div', { class: 'field' }, el('label', {}, ''), el('div', { class: 'hint' }, '')),
    ),
    textField('클라이언트 (공급받는자)', doc.clientName, '주식회사 예시', (v) => upd((d) => { d.clientName = v; })),
    textField('클라이언트 연락처 (선택)', doc.clientContact, '담당자 / 전화', (v) => upd((d) => { d.clientContact = v; })),
  )));

  // 금액 옵션
  const calc = calcDocument(doc);
  pane.append(section('금액', el('div', {},
    el('div', { class: 'toggle-row' },
      el('div', {},
        el('div', { class: 't-label' }, '부가세 포함 (10%)'),
        el('div', { class: 't-sub' }, '끄면 공급가액 = 합계'),
      ),
      toggle(doc.vatEnabled, (v) => upd((d) => { d.vatEnabled = v; })),
    ),
    el('div', { class: 'toggle-row' },
      el('div', {},
        el('div', { class: 't-label' }, '원천징수 (3.3%)'),
        el('div', { class: 't-sub' }, '프리랜서 사업소득 — 실 수령액 표시'),
      ),
      toggle(doc.withholding, (v) => upd((d) => { d.withholding = v; })),
    ),
    el('div', { class: 'ic-amount', style: 'margin-top:6px' },
      el('span', {}, `합계 (공급가액 ${fmt(calc.supplyTotal)} + 세액 ${fmt(calc.vatTotal)})`),
      el('strong', {}, calc.withholding ? `실 ${fmtWon(calc.payout)}` : fmtWon(calc.grandTotal)),
    ),
  )));

  // 품목
  const itemsBox = el('div', {});
  doc.items.forEach((it, i) => {
    const c = calc.items[i];
    const nameInput = el('input', { type: 'text', value: it.name, placeholder: '품명 (예: 홈페이지 리뉴얼)' });
    nameInput.addEventListener('input', () => upd((d) => { d.items[i].name = nameInput.value; }));

    const supplyInput = el('input', { type: 'number', min: '0', step: '1000', value: it.supply || '' , placeholder: '공급가액' });
    supplyInput.addEventListener('input', () => upd((d) => { d.items[i].supply = Math.max(0, Number(supplyInput.value) || 0); }));

    const qtyInput = el('input', { type: 'number', min: '1', step: '1', value: it.qty, placeholder: '수량' });
    qtyInput.addEventListener('input', () => upd((d) => { d.items[i].qty = Math.max(1, Number(qtyInput.value) || 1); }));

    const details = el('div', {});
    const rebuildDetails = () => {
      details.innerHTML = '';
      (it.details || []).forEach((dt, j) => {
        const input = el('input', { type: 'text', value: dt, placeholder: `상세 ${j + 1} (예: 1. 메인 페이지)` });
        input.addEventListener('input', () => upd((d) => { d.items[i].details[j] = input.value; }));
        details.append(el('div', { class: 'detail-row' }, input,
          el('button', { class: 'row-x', title: '상세 삭제', onclick: () => {
            upd((d) => { d.items[i].details.splice(j, 1); });
            rebuildDetails();
          } }, '✕'),
        ));
      });
      details.append(el('button', { class: 'lines-add', onclick: () => {
        upd((d) => { d.items[i].details.push(''); });
        rebuildDetails();
      } }, '+ 상세 줄 추가'));
    };
    rebuildDetails();

    itemsBox.append(el('div', { class: 'item-card' },
      el('div', { class: 'ic-head' },
        el('span', { class: 'ic-no' }, String(i + 1)),
        nameInput,
        el('button', { class: 'ic-del', title: '품목 삭제', onclick: () => {
          upd((d) => {
            d.items.splice(i, 1);
            if (!d.items.length) d.items = [{ id: uid(), name: '', details: [], supply: 0, qty: 1 }];
          });
        } }, '✕'),
      ),
      el('div', { class: 'ic-grid' }, supplyInput, qtyInput),
      details,
      el('div', { class: 'ic-amount' },
        el('span', {}, `공급가액 ${fmt(c.supplyTotal)} + 세액 ${doc.vatEnabled ? fmt(c.vat) : 0}`),
        el('strong', {}, fmtWon(c.lineSum)),
      ),
    ));
  });
  itemsBox.append(el('button', { class: 'lines-add', onclick: () => {
    upd((d) => { d.items.push({ id: uid(), name: '', details: [], supply: 0, qty: 1 }); });
  } }, '+ 품목 추가'));
  pane.append(section('품목', itemsBox));

  // 참고 사항
  const notesBox = el('div', {});
  const rebuildNotes = () => {
    notesBox.innerHTML = '';
    (doc.notes || []).forEach((n, i) => {
      const ta = el('textarea', { placeholder: `참고사항 ${i + 1}` });
      ta.value = n;
      ta.addEventListener('input', () => upd((d) => { d.notes[i] = ta.value; }));
      notesBox.append(el('div', { class: 'note-row' }, ta,
        el('button', { class: 'row-x', title: '삭제', onclick: () => {
          upd((d) => { d.notes.splice(i, 1); });
          rebuildNotes();
        } }, '✕'),
      ));
    });
    notesBox.append(el('button', { class: 'lines-add', onclick: () => {
      upd((d) => { d.notes.push(''); });
      rebuildNotes();
    } }, '+ 참고사항 추가'));
  };
  rebuildNotes();
  pane.append(section('참고 사항', notesBox));

  // 기타 (계좌)
  pane.append(section('기타 · 계좌', el('div', {},
    textField('계좌 (은행 / 계좌번호 / 예금주)', doc.bank, store.sender.bank || '신한 / 000-0000-000000 / 홍길동', (v) => upd((d) => { d.bank = v; })),
    el('div', { class: 'field' },
      el('label', {}, '기타 문구'),
      (() => {
        const ta = el('textarea', { placeholder: '입금 안내 등' });
        ta.value = doc.etc || '';
        ta.addEventListener('input', () => upd((d) => { d.etc = ta.value; }));
        return ta;
      })(),
    ),
  )));
}

function section(titleText, ...children) {
  return el('div', { class: 'editor-section' }, el('h3', {}, titleText), ...children);
}

function textField(labelText, value, placeholder, onChange) {
  const input = el('input', { type: 'text', value: value || '', placeholder: placeholder || '' });
  input.addEventListener('input', () => onChange(input.value));
  return el('div', { class: 'field' }, el('label', {}, labelText), input);
}

function dateInput(value, onChange) {
  const input = el('input', { type: 'date', value: value || '' });
  input.addEventListener('input', () => onChange(input.value));
  return input;
}

function toggle(checked, onChange) {
  const input = el('input', { type: 'checkbox', class: 'tgl' });
  input.checked = !!checked;
  input.addEventListener('change', () => onChange(input.checked));
  return input;
}

function uid() {
  return `i-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------- 공급자 정보 모달 ----------
function openSender() {
  const S = store.sender;
  openModal('공급자 정보', '문서 우측 상단 공급자 테이블에 들어가는 내 정보입니다. 모든 문서에 공통 적용되며 브라우저에 따로 저장됩니다.', (box, close) => {
    const fields = [
      ['상호', 'name', '가람스튜디오'],
      ['사업자등록번호', 'bizNo', '000-00-00000'],
      ['주소', 'address', '서울시 ○○구 ○○로 00'],
      ['전화', 'phone', '010-0000-0000'],
      ['이메일', 'email', 'sample@example.com'],
      ['기본 계좌 (기타 칸 기본값)', 'bank', '신한 / 000-0000-000000 / 홍길동'],
    ].map(([label, key, ph]) => {
      const input = el('input', { type: 'text', value: S[key] || '', placeholder: ph });
      input.addEventListener('input', () => { S[key] = input.value; store.saveSender(); repaint(); });
      return { label, node: el('div', { class: 'field' }, el('label', {}, label), input) };
    });

    box.append(...fields.map((f) => f.node));
    box.append(el('div', { class: 'modal-actions' },
      el('button', { class: 'btn btn-primary', onclick: close }, '완료'),
    ));
  });
}

// ---------- 헤더 ----------
function wireHeader() {
  $('#btn-sender').addEventListener('click', openSender);

  $('#btn-json-save').addEventListener('click', () => {
    const data = { sender: store.sender, docs: store.docs };
    download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      `${slugify(store.current?.clientName || 'documents')}-documents.json`);
    toast('문서 JSON을 저장했습니다.');
  });

  $('#btn-json-load').addEventListener('click', () => $('#file-json').click());
  $('#file-json').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (Array.isArray(parsed.docs) && parsed.docs.length) {
        if (parsed.sender) {
          Object.assign(store.sender, parsed.sender);
          store.saveSender();
        }
        store.setDocs(parsed.docs);
        toast(`${parsed.docs.length}개 문서를 불러왔습니다.`);
      } else if (Array.isArray(parsed) && parsed.length) {
        store.setDocs(parsed);
        toast(`${parsed.length}개 문서를 불러왔습니다.`);
      } else {
        throw new Error('docs 배열이 없습니다.');
      }
    } catch (err) {
      toast('불러오기 실패: ' + err.message, { type: 'warn', timeout: 5000 });
    }
    e.target.value = '';
  });

  $('#btn-duplicate').addEventListener('click', () => {
    if (store.current) {
      store.duplicateDoc(store.current.id);
      toast('복제했습니다. 문서번호는 자동으로 새로 부여됩니다.');
    }
  });

  $('#btn-print').addEventListener('click', () => window.print());
}

// ---------- 스토어 이벤트 ----------
function wireStore() {
  store.on('docs', () => repaint());
  store.on('selection', () => repaint());
  store.on('quota-exceeded', () => {
    toast('브라우저 저장 공간 부족 — 자동저장 실패. JSON으로 백업해 주세요.', { type: 'warn', timeout: 6000 });
  });
}

function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      // 브라우저 기본 인쇄가 문서만 인쇄하도록 그대로 통과 (print CSS가 처리)
      return;
    }
  });
}

// ---------- 부트 ----------
(async function boot() {
  const restored = store.load();
  if (!restored) {
    store.docs = sampleDocs().map((d) => d);
    store.selectedId = store.docs[0]?.id;
    store.save();
  }
  wireHeader();
  wireStore();
  wireKeyboard();
  repaint();
  if (restored) toast('마지막 작업을 복원했습니다.', { timeout: 2200 });
  log.info('인보이스 스튜디오 시작');
})();
