// store.js — 문서 컬렉션 상태 + 자동저장
// 공급자(내 정보)는 세트 공용 키에 저장한다 — 나중에 세트 통합 시 cardnews/blogpost의 브랜드 설정과 합친다.
import { uid, todayISO } from './util.js';
import { nextDocNumber } from './calc.js';

const STORAGE_KEY = 'invoice-studio-v1';
const SENDER_KEY = 'studio-suite-sender-v1'; // 세트 공용: 공급자(발행자) 정보

class Store {
  constructor() {
    this.listeners = new Map();
    this.docs = [];
    this.selectedId = null;
    this.sender = defaultSender();
    this.lastDeleted = null;
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return () => this.listeners.get(event).delete(fn);
  }

  emit(event, payload) {
    const set = this.listeners.get(event);
    if (set) for (const fn of set) fn(payload);
  }

  load() {
    try {
      const rawSender = localStorage.getItem(SENDER_KEY);
      if (rawSender) this.sender = { ...defaultSender(), ...JSON.parse(rawSender) };
    } catch { /* ignore */ }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.docs) && data.docs.length) {
          this.docs = data.docs.map(normalizeDoc);
          this.selectedId = this.docs[0].id;
          return true;
        }
      }
    } catch (e) {
      console.warn('[invoice] 복원 실패:', e);
    }
    return false;
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ docs: this.docs }));
      this.emit('saved');
      return true;
    } catch {
      this.emit('quota-exceeded');
      return false;
    }
  }

  saveSender() {
    try {
      localStorage.setItem(SENDER_KEY, JSON.stringify(this.sender));
    } catch { /* ignore */ }
  }

  get current() {
    return this.docs.find((d) => d.id === this.selectedId) || null;
  }

  select(id) {
    this.selectedId = id;
    this.emit('selection');
  }

  addDoc(type) {
    const doc = blankDoc(type, this.docs);
    this.docs.unshift(doc);
    this.selectedId = doc.id;
    this.save();
    this.emit('docs');
    this.emit('selection');
    return doc;
  }

  duplicateDoc(id) {
    const src = this.docs.find((d) => d.id === id);
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = uid();
    copy.number = nextDocNumber(this.docs, src.type);
    this.docs.unshift(copy);
    this.selectedId = copy.id;
    this.save();
    this.emit('docs');
    this.emit('selection');
  }

  deleteDoc(id) {
    const doc = this.docs.find((d) => d.id === id);
    if (!doc) return;
    this.lastDeleted = doc;
    this.docs = this.docs.filter((d) => d.id !== id);
    this.selectedId = this.docs[0]?.id || null;
    this.save();
    this.emit('docs');
    this.emit('selection');
  }

  restoreDeleted() {
    if (!this.lastDeleted) return;
    this.docs.unshift(this.lastDeleted);
    this.selectedId = this.lastDeleted.id;
    this.lastDeleted = null;
    this.save();
    this.emit('docs');
    this.emit('selection');
  }

  updateDoc(id, mutator) {
    const doc = this.docs.find((d) => d.id === id);
    if (!doc) return;
    mutator(doc);
    this.save();
    this.emit('docs');
  }

  updateCurrent(mutator) {
    this.updateDoc(this.selectedId, mutator);
  }

  setDocs(docs) {
    this.docs = docs.map(normalizeDoc);
    this.selectedId = this.docs[0]?.id || null;
    this.save();
    this.emit('docs');
    this.emit('selection');
  }
}

export function blankDoc(type = 'quote', existing = []) {
  return {
    id: uid(),
    type, // 'quote' | 'invoice'
    number: nextDocNumber(existing, type),
    clientName: '',
    clientContact: '',
    issueDate: todayISO(),
    validUntil: type === 'quote' ? todayISO(14) : '',
    vatEnabled: true,
    withholding: false,
    withholdingRate: 3.3,
    items: [blankItem()],
    notes: [],
    bank: '',
    etc: '',
  };
}

export function blankItem() {
  return { id: uid(), name: '', details: [], supply: 0, qty: 1 };
}

function defaultSender() {
  return {
    name: '[샘플] 가람스튜디오',
    bizNo: '000-00-00000',
    address: '서울시 ○○구 ○○로 00, 00층',
    phone: '010-0000-0000',
    email: 'sample@example.com',
    bank: '신한 / 000-000000-000000 / [샘플] 홍길동',
  };
}

export function normalizeDoc(d) {
  const doc = blankDoc(d.type === 'invoice' ? 'invoice' : 'quote', []);
  doc.id = typeof d.id === 'string' ? d.id : doc.id;
  doc.number = typeof d.number === 'string' ? d.number : doc.number;
  doc.clientName = typeof d.clientName === 'string' ? d.clientName : '';
  doc.clientContact = typeof d.clientContact === 'string' ? d.clientContact : '';
  doc.issueDate = typeof d.issueDate === 'string' ? d.issueDate : doc.issueDate;
  doc.validUntil = typeof d.validUntil === 'string' ? d.validUntil : '';
  doc.vatEnabled = d.vatEnabled !== false;
  doc.withholding = !!d.withholding;
  doc.withholdingRate = Number(d.withholdingRate) > 0 ? Number(d.withholdingRate) : 3.3;
  doc.bank = typeof d.bank === 'string' ? d.bank : '';
  doc.etc = typeof d.etc === 'string' ? d.etc : '';
  doc.notes = Array.isArray(d.notes) ? d.notes.filter((n) => typeof n === 'string') : [];
  doc.items = Array.isArray(d.items) && d.items.length
    ? d.items.map((it) => ({
        id: typeof it?.id === 'string' ? it.id : uid(),
        name: typeof it?.name === 'string' ? it.name : '',
        details: Array.isArray(it?.details) ? it.details.filter((x) => typeof x === 'string') : [],
        supply: Math.max(0, Number(it?.supply) || 0),
        qty: Math.max(0, Number(it?.qty) || 1),
      }))
    : [blankItem()];
  return doc;
}

export const store = new Store();
