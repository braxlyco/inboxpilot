import { sampleMessages, triageMessage, summary } from './triage.js';

const STORAGE_KEY = 'braxly-inboxpilot-v1';
const $ = selector => document.querySelector(selector);
const filterNav = $('#filters');
const list = $('#message-list');
const detail = $('#detail-pane');
const dialog = $('#new-dialog');
const search = $('#search');
const filters = ['All messages', 'Critical', 'Needs review', 'Reviewed'];
let activeFilter = 'All messages';
let messages = loadMessages();
let selectedId = messages[0]?.id;

function loadMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.every(item => item && typeof item.id === 'string' && typeof item.subject === 'string' && typeof item.body === 'string')) return saved;
  } catch { /* Reset malformed local data to the safe sample set. */ }
  return sampleMessages.map(item => ({ ...item }));
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); }
function el(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text != null) node.textContent = text; return node; }
function priorityRank(priority) { return { Critical: 0, High: 1, Normal: 2 }[priority]; }
function filteredMessages() {
  const query = search.value.trim().toLowerCase();
  return messages.filter(message => {
    const triage = triageMessage(message);
    const match = `${message.from} ${message.company} ${message.subject} ${message.body}`.toLowerCase().includes(query);
    const inFilter = activeFilter === 'All messages' || activeFilter === 'Critical' && triage.priority === 'Critical' && message.status !== 'Reviewed' || activeFilter === 'Needs review' && message.status !== 'Reviewed' || activeFilter === 'Reviewed' && message.status === 'Reviewed';
    return match && inFilter;
  }).sort((a, b) => priorityRank(triageMessage(a).priority) - priorityRank(triageMessage(b).priority));
}

function renderFilters() {
  const counts = summary(messages);
  const values = [counts.total, counts.critical, counts.pending, counts.reviewed];
  filterNav.replaceChildren(...filters.map((label, index) => {
    const button = el('button', `filter-button ${activeFilter === label ? 'active' : ''}`);
    button.type = 'button'; button.append(el('span', 'filter-icon', ['▦', '◆', '◷', '✓'][index]), el('span', '', label), el('strong', '', String(values[index])));
    button.addEventListener('click', () => { activeFilter = label; render(); });
    return button;
  }));
}

function renderStats() {
  const counts = summary(messages);
  for (const key of ['total', 'pending', 'critical', 'reviewed']) $(`#stat-${key}`).textContent = counts[key];
}

function renderList() {
  const visible = filteredMessages();
  if (!visible.some(item => item.id === selectedId)) selectedId = visible[0]?.id;
  if (!visible.length) { list.replaceChildren(el('p', 'no-results', 'No messages match this view.')); return; }
  list.replaceChildren(...visible.map(message => {
    const triage = triageMessage(message);
    const button = el('button', `message-item ${selectedId === message.id ? 'selected' : ''}`);
    button.type = 'button';
    const head = el('div', 'message-head'); head.append(el('span', 'avatar', (message.from || '?').slice(0, 1).toUpperCase()), el('strong', '', message.from || 'Unknown'), el('time', '', message.received || 'Now'));
    button.append(head, el('div', 'message-subject', message.subject), el('p', '', message.body), el('div', `priority-chip ${triage.priority.toLowerCase()}`, triage.priority), el('span', 'category-chip', triage.category));
    if (message.status === 'Reviewed') button.append(el('span', 'reviewed-dot', '✓ Reviewed'));
    button.addEventListener('click', () => { selectedId = message.id; render(); if (innerWidth < 900) detail.scrollIntoView({ behavior: 'smooth' }); });
    return button;
  }));
}

function renderDetail() {
  const message = messages.find(item => item.id === selectedId);
  if (!message) { detail.replaceChildren(el('div', 'detail-empty', 'Select a message to review its route.')); return; }
  const triage = triageMessage(message);
  detail.replaceChildren();
  const meta = el('div', 'detail-meta'); meta.append(el('span', '', message.id), el('span', '', message.received || 'Now'));
  const title = el('h3', '', message.subject);
  const sender = el('div', 'sender-line'); sender.append(el('span', 'avatar large', (message.from || '?').slice(0, 1).toUpperCase()), el('div'));
  sender.lastChild.append(el('strong', '', message.from || 'Unknown'), el('small', '', message.company || 'No company provided'));
  const body = el('p', 'message-body', message.body);
  const result = el('div', 'analysis-card');
  const resultHead = el('div', 'analysis-head'); resultHead.append(el('span', '', 'TRIAGE RECOMMENDATION'), el('span', 'rule-label', 'RULES V1.0'));
  const resultGrid = el('div', 'analysis-grid');
  for (const [label, value, type] of [['Category', triage.category], ['Priority', triage.priority], ['Suggested owner', triage.owner]]) { const cell = el('div'); cell.append(el('span', '', label), el('strong', type || '', value)); resultGrid.append(cell); }
  const signals = el('div', 'signals'); signals.append(el('span', '', 'MATCHED SIGNALS'));
  for (const signal of triage.signals) signals.append(el('b', '', signal));
  result.append(resultHead, resultGrid, signals);
  const draftHead = el('div', 'draft-head'); draftHead.append(el('h4', '', 'Suggested reply'), el('span', '', 'HUMAN REVIEW REQUIRED'));
  const draft = el('textarea', 'draft'); draft.rows = 8; draft.value = message.draft ?? triage.suggestedReply; draft.setAttribute('aria-label', 'Suggested reply draft');
  draft.addEventListener('input', () => { message.draft = draft.value; save(); });
  const actions = el('div', 'detail-actions');
  const copy = el('button', 'outline-button', 'Copy draft'); copy.type = 'button'; copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(draft.value); copy.textContent = 'Copied ✓'; } catch { copy.textContent = 'Copy unavailable'; } });
  const review = el('button', 'primary-button', message.status === 'Reviewed' ? 'Reviewed ✓' : 'Mark reviewed'); review.type = 'button'; review.disabled = message.status === 'Reviewed';
  review.addEventListener('click', () => { message.status = 'Reviewed'; message.draft = draft.value; message.reviewedAt = new Date().toISOString(); save(); render(); });
  actions.append(copy, review);
  const foot = el('p', 'detail-footnote', 'Reviewing saves the decision locally. This demo never sends an email.');
  detail.append(meta, title, sender, body, result, draftHead, draft, actions, foot);
}

function render() { renderStats(); renderFilters(); renderList(); renderDetail(); }
search.addEventListener('input', render);
$('#new-button').addEventListener('click', () => dialog.showModal());
$('#close-dialog').addEventListener('click', () => dialog.close());
$('#new-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form).entries());
  const message = { id: `M-${Date.now().toString().slice(-8)}`, from: data.from.trim(), company: data.company.trim(), subject: data.subject.trim(), body: data.body.trim(), received: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'New' };
  messages.unshift(message); selectedId = message.id; activeFilter = 'All messages'; search.value = ''; save(); form.reset(); dialog.close(); render();
});
$('#reset-button').addEventListener('click', () => { if (!confirm('Reset the local demo to its sample messages?')) return; messages = sampleMessages.map(item => ({ ...item })); selectedId = messages[0].id; activeFilter = 'All messages'; search.value = ''; save(); render(); });
$('#export-button').addEventListener('click', () => {
  const report = { exportedAt: new Date().toISOString(), mode: 'rule-based-local-demo', messages: messages.map(message => ({ ...message, triage: triageMessage(message) })) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'braxly-inboxpilot-audit.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
render();
