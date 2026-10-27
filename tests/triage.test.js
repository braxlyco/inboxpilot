import test from 'node:test';
import assert from 'node:assert/strict';
import { triageMessage, summary, sampleMessages } from '../src/triage.js';

test('service outage takes incident route even when payment is mentioned', () => {
  const result = triageMessage({ from: 'Maya', subject: 'Checkout down', body: 'Customers cannot pay' });
  assert.equal(result.category, 'Incident');
  assert.equal(result.priority, 'Critical');
  assert.equal(result.owner, 'Incident response');
});

test('billing concern gets finance route', () => {
  const result = triageMessage({ from: 'Omar', subject: 'Duplicate invoice', body: 'Charged twice' });
  assert.equal(result.category, 'Billing');
  assert.match(result.suggestedReply, /Hi Omar/);
});

test('access requests take precedence over generic wording', () => {
  const result = triageMessage({ subject: 'Need help', body: 'Cannot log in after password reset today' });
  assert.equal(result.category, 'Access');
  assert.equal(result.priority, 'High');
});

test('unknown request remains general with visible fallback signal', () => {
  const result = triageMessage({ subject: 'Hello', body: 'Just checking in' });
  assert.equal(result.category, 'General');
  assert.deepEqual(result.signals, ['No specific rule matched']);
});

test('summary excludes reviewed incidents from active count', () => {
  const messages = sampleMessages.map(message => ({ ...message }));
  messages[0].status = 'Reviewed';
  const result = summary(messages);
  assert.equal(result.total, 6);
  assert.equal(result.critical, 0);
  assert.equal(result.reviewed, 1);
});
