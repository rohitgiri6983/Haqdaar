import test from 'node:test';
import assert from 'node:assert/strict';
import { validate, computeDeadlines, clientEscalation, isoOf } from '../core.js';

test('validate: flags Section 420B, case citations, reporters, and outdated laws', () => {
  const v1 = validate('You can claim under Section 420B of the Act.');
  assert.equal(v1.clean, false);
  assert.ok(v1.flags.some(f => f.type === 'section' && f.text.includes('420B') && f.level === 'bad'));

  const v2 = validate('See Sharma v. Union of India for details.');
  assert.equal(v2.clean, false);
  assert.ok(v2.flags.some(f => f.type === 'case' && f.text.includes('Sharma v. Union of India')));

  const v3 = validate('Reported in (2010) 3 SCC 12.');
  assert.equal(v3.clean, false);
  assert.ok(v3.flags.some(f => f.type === 'reporter' && f.text.includes('(2010) 3 SCC')));

  const v4 = validate('File a complaint under IPC Section 420.');
  assert.ok(v4.flags.some(f => f.type === 'outdated' && f.text === 'IPC'));
});

test('validate: accepts verified tokens like [[CPA-69]]', () => {
  const v = validate('Under [[CPA-69]] you have a two-year limit.');
  assert.equal(v.clean, true);
  assert.deepEqual(v.verified, ['CPA-69']);
  assert.equal(v.unknown.length, 0);
  assert.equal(v.flags.length, 0);
});

test('validate: does not flag generic dispute parties as court case', () => {
  const v = validate('The dispute between Complainant vs Opposite Party must be settled.');
  assert.ok(!v.flags.some(f => f.type === 'case'));
});

test('computeDeadlines: cheque dishonour calculates 30-day notice deadline', () => {
  const c = { category: 'cheque', key_dates: { dishonour_date: '2026-10-20' } };
  const d = computeDeadlines(c);
  const notice = d.find(x => x.label.includes('demand notice'));
  assert.ok(notice, 'notice deadline should be computed');
  assert.equal(isoOf(notice.date), '2026-11-19');
});

test('computeDeadlines: salary resignation calculates 2 working days for final dues', () => {
  const c = { category: 'salary', key_dates: { exit_date: '2026-09-30' } };
  const d = computeDeadlines(c);
  const dues = d.find(x => x.label.includes('Final dues were due by'));
  assert.ok(dues, 'final dues deadline should be computed');
  assert.equal(isoOf(dues.date), '2026-10-02');
});

test('computeDeadlines: fraud incident calculates 3 working days bank reporting', () => {
  const c = { category: 'fraud', key_dates: { incident_date: '2026-11-06' } };
  const d = computeDeadlines(c);
  const report = d.find(x => x.label.includes('Report to your bank by'));
  assert.ok(report, 'fraud bank reporting deadline should be computed');
  assert.equal(isoOf(report.date), '2026-11-11');
});

test('clientEscalation: flags arrest and court hearing', () => {
  const hits = clientEscalation(['Police arrested my brother kal court me pesh karenge']);
  assert.ok(hits.length > 0, 'should escalate for arrest / court peshi');
  assert.ok(hits.some(h => /arrest|custody|court/i.test(h)));
});

test('clientEscalation: does not flag normal deposit dispute', () => {
  const hits = clientEscalation(['society maintenance charges deducted from deposit']);
  assert.equal(hits.length, 0, 'routine maintenance dispute should not escalate');
});

