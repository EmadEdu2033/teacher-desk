#!/usr/bin/env node
// Lightweight assert-based tests for scripts/release.js.
// Run with: node scripts/release.test.js
//
// These cover the changelog rendering rules so the with-hash and
// without-hash bullet shapes don't regress (e.g. accidentally going
// back to leading the bullet with a raw SHA).

const assert = require('assert');
const { classifyCommit, renderChangelogEntry } = require('./release');

let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL ${name}`);
    console.error(err && err.stack ? err.stack : err);
  }
}

console.log('classifyCommit');

test('extracts sha + section from a feat commit', () => {
  const r = classifyCommit('a1b2c3d feat: add reminders');
  assert.strictEqual(r.section, 'Added');
  assert.strictEqual(r.sha, 'a1b2c3d');
  assert.strictEqual(r.subject, 'add reminders');
});

test('preserves scope and routes fix to Fixed', () => {
  const r = classifyCommit('1234567 fix(notes): stop drift');
  assert.strictEqual(r.section, 'Fixed');
  assert.strictEqual(r.sha, '1234567');
  assert.strictEqual(r.subject, '**notes:** stop drift');
});

test('flags breaking changes', () => {
  const r = classifyCommit('deadbee feat(api)!: rewrite endpoints');
  assert.strictEqual(r.section, 'Added');
  assert.strictEqual(r.subject, '**BREAKING:** **api:** rewrite endpoints');
});

test('falls back to Other when there is no recognized prefix', () => {
  const r = classifyCommit('abcdef0 random thought');
  assert.strictEqual(r.section, 'Other');
  assert.strictEqual(r.sha, 'abcdef0');
  assert.strictEqual(r.subject, 'random thought');
});

test('handles a line with no sha at all', () => {
  const r = classifyCommit('feat: add reminders');
  assert.strictEqual(r.section, 'Other');
  assert.strictEqual(r.sha, '');
  assert.strictEqual(r.subject, 'feat: add reminders');
});

console.log('renderChangelogEntry');

test('with-hash bullets put the sha at the end, not the start', () => {
  const out = renderChangelogEntry('1.2.3', [
    'a1b2c3d feat: add reminders',
    '1234567 fix(notes): stop drift',
    'deadbee chore: bump electron',
  ]);
  // No bullet should LEAD with a raw 7+ char hex sha.
  for (const line of out.split('\n')) {
    if (!line.startsWith('- ')) continue;
    assert.ok(
      !/^- [0-9a-f]{7,}\s/.test(line),
      `bullet still leads with a sha: ${JSON.stringify(line)}`
    );
  }
  assert.ok(out.includes('- add reminders (a1b2c3d)'), 'feat bullet missing trailing sha');
  assert.ok(out.includes('- **notes:** stop drift (1234567)'), 'fix bullet missing trailing sha');
  assert.ok(out.includes('- bump electron (deadbee)'), 'chore bullet missing trailing sha');
  assert.ok(out.includes('### Added'), 'Added section missing');
  assert.ok(out.includes('### Fixed'), 'Fixed section missing');
  assert.ok(out.includes('### Changed'), 'Changed section missing');
});

test('without-hash bullets render cleanly with no trailing parens', () => {
  const out = renderChangelogEntry('0.1.0', [
    'feat: add reminders',
    'fix(notes): stop drift',
  ]);
  assert.ok(out.includes('- feat: add reminders'), 'plain feat bullet missing');
  assert.ok(out.includes('- fix(notes): stop drift'), 'plain fix bullet missing');
  // No trailing "(sha)" should sneak in when the input had no hash.
  assert.ok(!/\([0-9a-f]{7,}\)/.test(out), 'unexpected trailing sha-like token in output');
});

test('empty commit list still renders a placeholder bullet', () => {
  const out = renderChangelogEntry('9.9.9', []);
  assert.ok(out.includes('## [9.9.9]'), 'version header missing');
  assert.ok(out.includes('- No teacher-desk changes recorded'), 'placeholder bullet missing');
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log('\nAll release.js tests passed.');
