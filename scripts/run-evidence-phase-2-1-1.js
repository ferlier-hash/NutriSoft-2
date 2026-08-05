import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const cwd = resolve(process.cwd());
const reportsDir = resolve(cwd, 'review/reports/phase-2.1.1');

if (!existsSync(reportsDir)) {
  mkdirSync(reportsDir, { recursive: true });
}

function runCommand(command, args = [], allowFail = false) {
  const startTime = new Date();
  console.log(`[EVIDENCE 2.1.1] Executing: ${command} ${args.join(' ')}`);

  const res = spawnSync(command, args, {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, PAGER: 'cat' }
  });

  const stdout = res.stdout || '';
  const stderr = res.stderr || (res.error ? res.error.message : '');
  const exitCode = res.status !== null ? res.status : 1;
  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();

  const reportData = { command, args, stdout, stderr, exitCode, startTime, endTime, durationMs };

  if (exitCode !== 0 && !allowFail) {
    console.error(`[ERROR] Command '${command} ${args.join(' ')}' failed with exit code ${exitCode}`);
    console.error(stderr || stdout);
  }

  return reportData;
}

function logReport(filename, cmdStr, result) {
  const reportContent = [
    `COMMAND: ${cmdStr}`,
    `CWD: ${cwd}`,
    `START_TIME: ${result.startTime.toISOString()}`,
    `END_TIME: ${result.endTime.toISOString()}`,
    `DURATION_MS: ${result.durationMs}`,
    `EXIT_CODE: ${result.exitCode}`,
    `--- STDOUT ---`,
    result.stdout || '(none)',
    `--- STDERR ---`,
    result.stderr || '(none)'
  ].join('\n');

  writeFileSync(resolve(reportsDir, filename), reportContent, 'utf-8');
}

// 00. Git status before
const r00 = runCommand('git', ['status', '--porcelain=v1', '--branch']);
logReport('00-git-status-before.txt', 'git status --porcelain=v1 --branch', r00);

// 01. Environment
const r01_node = runCommand('node', ['-v']);
const r01_npm = runCommand('npm', ['-v']);
const r01_git = runCommand('git', ['--version']);
const envOut = `node: ${r01_node.stdout.trim()}\nnpm: ${r01_npm.stdout.trim()}\ngit: ${r01_git.stdout.trim()}\n`;
writeFileSync(resolve(reportsDir, '01-environment.txt'), `COMMAND: environment check\nCWD: ${cwd}\nEXIT_CODE: 0\n--- STDOUT ---\n${envOut}`, 'utf-8');

// 02. npm ci
const r02 = runCommand('npm', ['ci']);
logReport('02-npm-ci.txt', 'npm ci', r02);

// 03. npm ls
const r03 = runCommand('npm', ['ls', '--depth=0']);
logReport('03-npm-ls.txt', 'npm ls --depth=0', r03);

// 04. supabase stop before
const r04 = runCommand('npx', ['supabase', 'stop'], true);
logReport('04-supabase-stop-before.txt', 'npx supabase stop', r04);

// 05. supabase start
const r05 = runCommand('npx', ['supabase', 'start']);
logReport('05-supabase-start.txt', 'npx supabase start', r05);

// 06. db reset 1
const r06 = runCommand('npm', ['run', 'db:reset']);
logReport('06-db-reset-first.txt', 'npm run db:reset', r06);

// 07. db reset 2
const r07 = runCommand('npm', ['run', 'db:reset']);
logReport('07-db-reset-second.txt', 'npm run db:reset', r07);

// 08. db test
const r08 = runCommand('npm', ['run', 'db:test']);
logReport('08-db-test.txt', 'npm run db:test', r08);

// 09. db lint
const r09 = runCommand('npm', ['run', 'db:lint']);
logReport('09-db-lint.txt', 'npm run db:lint', r09);

// 10. db types
const r10 = runCommand('npm', ['run', 'db:types']);
logReport('10-db-types.txt', 'npm run db:types', r10);

// 11. db verify-types
const r11 = runCommand('npm', ['run', 'db:verify-types']);
logReport('11-db-verify-types.txt', 'npm run db:verify-types', r11);

// 12. frontend lint
const r12 = runCommand('npm', ['run', 'lint']);
logReport('12-frontend-lint.txt', 'npm run lint', r12);

// 13. frontend typecheck
const r13 = runCommand('npm', ['run', 'typecheck']);
logReport('13-frontend-typecheck.txt', 'npm run typecheck', r13);

// 14. frontend tests
const r14 = runCommand('npm', ['run', 'test']);
logReport('14-frontend-tests.txt', 'npm run test', r14);

// 15. frontend build
const r15 = runCommand('npm', ['run', 'build']);
logReport('15-frontend-build.txt', 'npm run build', r15);

// 16. verify all
const r16 = runCommand('npm', ['run', 'verify:all']);
logReport('16-verify-all.txt', 'npm run verify:all', r16);

// 17. secret scan
const r17 = runCommand('git', ['grep', '-i', '-E', 'service_role|private_key|secret_key'], true);
logReport('17-secret-scan.txt', 'git grep -i -E "service_role|private_key|secret_key"', r17);

// 18. git diff stat
const r18 = runCommand('git', ['diff', '--stat', 'phase-2.1-security-hardening...HEAD']);
logReport('18-git-diff-stat.txt', 'git diff --stat phase-2.1-security-hardening...HEAD', r18);

// 19. file inventory
function getFileInventory(dir, baseDir = dir) {
  let results = [];
  const list = readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.gemini') continue;
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(getFileInventory(filePath, baseDir));
    } else {
      results.push(relative(baseDir, filePath));
    }
  }
  return results;
}

const fileList = getFileInventory(cwd).sort().join('\n');
writeFileSync(resolve(reportsDir, '19-file-inventory.txt'), `FILE INVENTORY:\n${fileList}\n`, 'utf-8');

// 20. supabase stop after
const r20 = runCommand('npx', ['supabase', 'stop'], true);
logReport('20-supabase-stop-after.txt', 'npx supabase stop', r20);

// 21. git status after
const r21 = runCommand('git', ['status', '--porcelain=v1', '--branch']);
logReport('21-git-status-after.txt', 'git status --porcelain=v1 --branch', r21);

console.log('✅ Evidence collector script 2.1.1 sequence execution completed.');
