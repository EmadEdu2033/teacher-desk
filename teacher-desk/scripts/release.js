#!/usr/bin/env node
// Cut a new Teacher Desk release in one command.
//
// Usage:
//   node scripts/release.js <patch|minor|major|X.Y.Z> [options]
//   npm run release -- patch
//   npm run release -- 1.2.3 --no-build
//
// What it does:
//   1. Bumps the "version" field in teacher-desk/package.json.
//   2. Reads commits since the previous v* tag (or all commits if none) and
//      prepends a new section to teacher-desk/CHANGELOG.md.
//   3. Runs `npm run build:win` so the freshly-tagged version ends up baked
//      into the signed installer (build/installer.nsi reads APP_VERSION from
//      package.json via scripts/make-installer.js).
//   4. Commits the version bump + changelog and creates an annotated git tag
//      (e.g. v1.2.3) at the project repo root.
//
// Options:
//   --dry-run     Print every action but do not change files, build, or tag.
//   --no-build    Skip step 3 (useful in CI or when iterating on the script).
//   --no-git      Skip step 4 (no commit, no tag).
//   --yes         Don't prompt; assume "yes" to confirmation.
//
// Environment:
//   WIN_CSC_KEY_PASSWORD must be set if the build step is not skipped.
//   TEACHER_DESK_SKIP_SIGN=1 lets the build succeed without a real cert.

const path = require('path');
const fs = require('fs');
const readline = require('readline');
const { spawnSync, execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const changelogPath = path.join(root, 'CHANGELOG.md');

function parseArgs(argv) {
  const args = { bump: null, dryRun: false, noBuild: false, noGit: false, yes: false };
  for (const a of argv) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--no-build') args.noBuild = true;
    else if (a === '--no-git') args.noGit = true;
    else if (a === '--yes' || a === '-y') args.yes = true;
    else if (!args.bump) args.bump = a;
    else die(`Unexpected argument: ${a}`);
  }
  if (!args.bump) {
    die('Missing bump type. Usage: npm run release -- <patch|minor|major|X.Y.Z>');
  }
  return args;
}

function die(msg) {
  console.error(`[release] ${msg}`);
  process.exit(1);
}

function readPkg() {
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
}

function bumpVersion(current, kind) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!m) die(`Current version "${current}" is not semver X.Y.Z.`);
  const [maj, min, pat] = [Number(m[1]), Number(m[2]), Number(m[3])];
  switch (kind) {
    case 'major': return `${maj + 1}.0.0`;
    case 'minor': return `${maj}.${min + 1}.0`;
    case 'patch': return `${maj}.${min}.${pat + 1}`;
    default:
      if (/^\d+\.\d+\.\d+$/.test(kind)) return kind;
      die(`Unknown bump kind "${kind}". Use patch, minor, major, or X.Y.Z.`);
  }
}

function git(args, opts = {}) {
  const res = spawnSync('git', args, { cwd: root, encoding: 'utf8', ...opts });
  if (res.status !== 0 && !opts.allowFail) {
    die(`git ${args.join(' ')} failed:\n${res.stderr || res.stdout}`);
  }
  return res;
}

function previousTag() {
  // Most recent tag matching v*. Empty string if none exist.
  const res = git(['tag', '--list', 'v*', '--sort=-v:refname'], { allowFail: true });
  if (res.status !== 0) return '';
  const lines = (res.stdout || '').split('\n').map(s => s.trim()).filter(Boolean);
  return lines[0] || '';
}

function commitsSince(tag) {
  // Only commits that touched teacher-desk/ — keeps the changelog scoped
  // to this app rather than the whole monorepo.
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  const res = git(
    ['log', range, '--pretty=format:%h %s', '--no-merges', '--', '.'],
    { allowFail: true }
  );
  if (res.status !== 0) return [];
  return (res.stdout || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

// Conventional Commit prefix -> changelog section name.
// Anything not in this map (or commits with no recognized prefix) lands in "Other".
const COMMIT_TYPE_TO_SECTION = {
  feat: 'Added',
  feature: 'Added',
  fix: 'Fixed',
  bugfix: 'Fixed',
  chore: 'Changed',
  refactor: 'Changed',
  perf: 'Changed',
  style: 'Changed',
  docs: 'Changed',
  test: 'Changed',
  build: 'Changed',
  ci: 'Changed',
  revert: 'Changed',
};

// Order the sub-sections appear under each version heading.
const SECTION_ORDER = ['Added', 'Fixed', 'Changed', 'Other'];

function classifyCommit(line) {
  // Each line looks like: "<sha> <subject>". Pull the subject out so we can
  // inspect its Conventional Commit prefix (e.g. "feat:", "fix(scope):").
  const m = /^([0-9a-f]{7,})\s+(.*)$/.exec(line);
  if (!m) return { section: 'Other', sha: '', subject: line };
  let sha = m[1];
  let subject = m[2];

  // Drop legacy "Teacher Desk: " prefixes so bullets read clean.
  subject = subject.replace(/^Teacher Desk:\s*/i, '');

  // Conventional Commit format: type(scope)?!?: subject
  const cc = /^([a-zA-Z]+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/.exec(subject);
  if (!cc) return { section: 'Other', sha, subject };
  const type = cc[1].toLowerCase();
  const scope = cc[2] || '';
  const breaking = !!cc[3];
  const rest = cc[4];
  const section = COMMIT_TYPE_TO_SECTION[type] || 'Other';
  // Re-render the bullet without the "type:" prefix but keep scope/breaking
  // signals so the reader still gets the useful context.
  const scopePart = scope ? `**${scope}:** ` : '';
  const breakingPart = breaking ? '**BREAKING:** ' : '';
  const cleanedSubject = `${breakingPart}${scopePart}${rest}`;
  return { section, sha, subject: cleanedSubject };
}

function renderChangelogEntry(version, commits) {
  const date = new Date().toISOString().slice(0, 10);
  const header = `## [${version}] - ${date}\n`;
  if (commits.length === 0) {
    return `${header}\n- No teacher-desk changes recorded since the previous tag.\n`;
  }

  // Bucket commits by section, preserving original (newest-first) order within each.
  const buckets = {};
  for (const line of commits) {
    const { section, sha, subject } = classifyCommit(line);
    if (!buckets[section]) buckets[section] = [];
    const bullet = sha ? `- ${sha} ${subject}` : `- ${subject}`;
    buckets[section].push(bullet);
  }

  const parts = [];
  for (const section of SECTION_ORDER) {
    if (!buckets[section] || buckets[section].length === 0) continue;
    parts.push(`### ${section}\n${buckets[section].join('\n')}\n`);
  }
  return `${header}\n${parts.join('\n')}`;
}

function prependChangelog(entry) {
  const banner =
`# Teacher Desk Changelog

All notable changes to the Teacher Desk app are documented here.
This file is updated automatically by \`npm run release\`.

`;
  let existing = '';
  if (fs.existsSync(changelogPath)) {
    existing = fs.readFileSync(changelogPath, 'utf8');
    // If the banner is already there, splice the entry in just after it so
    // the newest release stays at the top of the list.
    if (existing.startsWith(banner)) {
      const rest = existing.slice(banner.length);
      return banner + entry + '\n' + rest;
    }
    // No recognized banner — keep whatever is there below the new entry.
    return banner + entry + '\n' + existing;
  }
  return banner + entry;
}

function confirm(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${question} [y/N] `, ans => {
      rl.close();
      resolve(/^y(es)?$/i.test(ans.trim()));
    });
  });
}

function assertCleanGit() {
  // Refuse to run when there are already-staged changes or local edits to the
  // files this script is about to rewrite. That keeps the release commit
  // narrowly scoped to the version bump + changelog and prevents accidentally
  // tagging unrelated work-in-progress.
  const res = git(['status', '--porcelain'], { allowFail: true });
  if (res.status !== 0) {
    console.warn('[release] Could not run `git status` (not a git repo?). Skipping clean-tree check.');
    return;
  }
  // Each porcelain line is: XY <path>  where X = staged status, Y = unstaged.
  // X = '?' on both sides means untracked — fine to leave alone.
  const lines = (res.stdout || '').split('\n').filter(l => l.length > 0);
  if (lines.length === 0) return;

  const tracked = lines.filter(l => l.slice(0, 2) !== '??');
  const stagedAnything = tracked.some(l => l[0] !== ' ');
  const dirtyTargets = tracked.filter(l =>
    /(teacher-desk\/package\.json|teacher-desk\/CHANGELOG\.md)$/.test(l.slice(3))
  );

  if (stagedAnything) {
    die('Refusing to release: there are already-staged changes. Commit, stash, or unstage them first.');
  }
  if (dirtyTargets.length > 0) {
    die(`Refusing to release: local edits in ${dirtyTargets.map(l => l.slice(3)).join(', ')}. Commit or revert them first.`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const pkg = readPkg();
  const current = pkg.version;
  const next = bumpVersion(current, args.bump);
  const tag = `v${next}`;
  const prev = previousTag();
  const commits = commitsSince(prev);
  const entry = renderChangelogEntry(next, commits);

  if (!args.dryRun && !args.noGit) {
    assertCleanGit();
  }

  console.log(`[release] Current version: ${current}`);
  console.log(`[release] Next version:    ${next}`);
  console.log(`[release] Previous tag:    ${prev || '(none)'}`);
  console.log(`[release] Commits since previous tag (in teacher-desk/): ${commits.length}`);
  console.log('--- changelog entry preview ---');
  process.stdout.write(entry);
  console.log('-------------------------------');

  if (args.dryRun) {
    console.log('[release] --dry-run: no files written, no build, no git changes.');
    return;
  }

  if (!args.yes) {
    const ok = await confirm(`Proceed with release ${tag}?`);
    if (!ok) {
      console.log('[release] Aborted.');
      process.exit(1);
    }
  }

  // 1. Bump package.json
  pkg.version = next;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`[release] Updated ${path.relative(root, pkgPath)} -> ${next}`);

  // 2. Prepend changelog
  fs.writeFileSync(changelogPath, prependChangelog(entry));
  console.log(`[release] Updated ${path.relative(root, changelogPath)}`);

  // 3. Build (and sign) — bakes the new version into the installer.
  if (args.noBuild) {
    console.log('[release] --no-build: skipping npm run build:win');
  } else {
    if (!process.env.WIN_CSC_KEY_PASSWORD && process.env.TEACHER_DESK_SKIP_SIGN !== '1') {
      die('WIN_CSC_KEY_PASSWORD is not set. Set it (or pass TEACHER_DESK_SKIP_SIGN=1 / --no-build) before releasing.');
    }
    console.log('[release] Running: npm run build:win');
    const res = spawnSync('npm', ['run', 'build:win'], { cwd: root, stdio: 'inherit' });
    if (res.status !== 0) die('Build failed; aborting before tag.');
  }

  // 4. Commit + tag
  if (args.noGit) {
    console.log('[release] --no-git: skipping commit + tag.');
    console.log(`[release] Done. Version is ${next}; remember to commit and tag manually.`);
    return;
  }
  const repoRoot = (() => {
    const r = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' });
    return r.status === 0 ? r.stdout.trim() : root;
  })();
  const relPkg = path.relative(repoRoot, pkgPath);
  const relChangelog = path.relative(repoRoot, changelogPath);
  spawnSync('git', ['add', relPkg, relChangelog], { cwd: repoRoot, stdio: 'inherit' });
  const commitMsg = `Teacher Desk ${tag}`;
  const c = spawnSync('git', ['commit', '-m', commitMsg], { cwd: repoRoot, stdio: 'inherit' });
  if (c.status !== 0) die('git commit failed.');
  const t = spawnSync('git', ['tag', '-a', tag, '-m', commitMsg], { cwd: repoRoot, stdio: 'inherit' });
  if (t.status !== 0) die('git tag failed.');
  console.log(`[release] Tagged ${tag}. Push with: git push && git push --tags`);
}

main().catch(err => die(err.stack || String(err)));
