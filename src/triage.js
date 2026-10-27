export const sampleMessages = [
  { id: 'M-1042', from: 'Maya Chen', company: 'Northstar Retail', subject: 'Checkout unavailable', body: 'Our store checkout is down and customers cannot pay. Please help urgently.', received: '09:12', status: 'New' },
  { id: 'M-1043', from: 'Omar Ali', company: 'Horizon Supply', subject: 'Duplicate invoice charge', body: 'We appear to have been charged twice for invoice 3408. Can someone review the billing?', received: '09:36', status: 'New' },
  { id: 'M-1044', from: 'Sara Malik', company: 'Atlas Services', subject: 'Automation for onboarding', body: 'We want to automate new client onboarding across our CRM and email. Could we discuss a pilot?', received: '10:04', status: 'New' },
  { id: 'M-1045', from: 'Daniel Brooks', company: 'Fieldline', subject: 'Export report question', body: 'How can our team export the weekly activity report as a CSV?', received: '10:21', status: 'New' },
  { id: 'M-1046', from: 'Priya Shah', company: 'Cedar Health', subject: 'Account access issue', body: 'Two team members cannot log in after a password reset. We need access today.', received: '11:08', status: 'New' },
  { id: 'M-1047', from: 'Lena Ortiz', company: 'Summit Foods', subject: 'New customer portal', body: 'We are looking for a quote for a customer ordering portal connected to inventory.', received: '11:30', status: 'New' }
];

const terms = {
  incident: ['down', 'outage', 'unavailable', 'cannot pay', 'security breach', 'offline'],
  billing: ['invoice', 'refund', 'charged', 'billing', 'payment error'],
  sales: ['quote', 'pricing', 'pilot', 'proposal', 'new portal', 'automate', 'automation'],
  access: ['log in', 'login', 'password', 'account access', 'locked out']
};
const priorityTerms = ['urgent', 'today', 'cannot pay', 'outage', 'down', 'security breach'];

function matched(text, words) { return words.filter(word => text.includes(word)); }
function clean(value) { return String(value ?? '').trim(); }

export function triageMessage(message) {
  if (!message || typeof message !== 'object') throw new Error('Message is required');
  const text = `${clean(message.subject)} ${clean(message.body)}`.toLowerCase();
  const matches = Object.fromEntries(Object.entries(terms).map(([key, words]) => [key, matched(text, words)]));
  const category = matches.incident.length ? 'Incident' : matches.billing.length ? 'Billing' : matches.access.length ? 'Access' : matches.sales.length ? 'Sales' : 'General';
  const urgent = matched(text, priorityTerms);
  const priority = category === 'Incident' ? 'Critical' : urgent.length ? 'High' : 'Normal';
  const owner = { Incident: 'Incident response', Billing: 'Finance support', Access: 'Account support', Sales: 'Solutions team', General: 'Customer support' }[category];
  const name = clean(message.from).split(/\s+/)[0] || 'there';
  const intro = `Hi ${name},\n\nThanks for reaching out.`;
  const reply = {
    Incident: `${intro} We understand this is affecting your service. A teammate will review the impact and follow up with the next update.\n\nBest,\nSupport team`,
    Billing: `${intro} We will check the invoice and transaction details before confirming any adjustment. A billing teammate will follow up.\n\nBest,\nBilling team`,
    Access: `${intro} We will review the account access issue and share the next steps after verifying the affected users.\n\nBest,\nSupport team`,
    Sales: `${intro} Your project sounds interesting. A solutions teammate will review the requirements and reach out with useful next questions.\n\nBest,\nSolutions team`,
    General: `${intro} A teammate will review your question and get back to you with a clear answer.\n\nBest,\nSupport team`
  }[category];
  const signals = [...(matches[category.toLowerCase()] ?? []), ...urgent].filter((value, index, values) => values.indexOf(value) === index);
  return { category, priority, owner, signals: signals.length ? signals : ['No specific rule matched'], suggestedReply: reply, ruleVersion: '1.0' };
}

export function summary(messages) {
  return {
    total: messages.length,
    pending: messages.filter(item => item.status !== 'Reviewed').length,
    critical: messages.filter(item => item.status !== 'Reviewed' && triageMessage(item).priority === 'Critical').length,
    reviewed: messages.filter(item => item.status === 'Reviewed').length
  };
}
