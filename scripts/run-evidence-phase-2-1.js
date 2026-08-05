import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const cwd = resolve(process.cwd());
const reportsDir = resolve(cwd, 'review/reports/phase-2.1');

if (!existsSync(reportsDir)) {
  mkdirSync(reportsDir, { recursive: true });
}

function runAndLog(filename, command, allowFail = false) {
  const startTime = new Date();
  let stdout = '';
  let stderr = '';
  let exitCode = 0;

  console.log(`[EVIDENCE] Running: ${command} -> ${filename}`);

  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PAGER: 'cat' }
    });
    stdout = output;
  } catch (err) {
    stdout = err.stdout ? err.stdout.toString() : '';
    stderr = err.stderr ? err.stderr.toString() : err.message;
    exitCode = err.status !== undefined ? err.status : 1;
    if (!allowFail) {
      console.warn(`[WARN] Command '${command}' returned exit code ${exitCode}`);
    }
  }

  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();

  const reportContent = [
    `COMMAND: ${command}`,
    `CWD: ${cwd}`,
    `START_TIME: ${startTime.toISOString()}`,
    `END_TIME: ${endTime.toISOString()}`,
    `DURATION_MS: ${durationMs}`,
    `EXIT_CODE: ${exitCode}`,
    `--- STDOUT ---`,
    stdout || '(none)',
    `--- STDERR ---`,
    stderr || '(none)'
  ].join('\n');

  writeFileSync(resolve(reportsDir, filename), reportContent, 'utf-8');
  return { exitCode, stdout, stderr };
}

// 00. Git Status Before
runAndLog('00-git-status-before.txt', 'git status --short');

// 01. Environment
runAndLog('01-environment.txt', 'node -v && npm -v && git --version');

// 02. NPM CI (DEPS-04)
runAndLog('02-npm-ci.txt', 'npm ci');

// 03. NPM LS (DEPS-07)
runAndLog('03-npm-ls.txt', 'npm ls --depth=0');

// 04. Secret Scan (SECRET-06)
runAndLog('16-secret-scan.txt', 'git grep -i -E "service_role|private_key|secret_key" || true');

// 18. File Inventory
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
writeFileSync(resolve(reportsDir, '18-file-inventory.txt'), `FILE INVENTORY:\n${fileList}\n`, 'utf-8');

console.log('✅ Base evidence collector script initialized.');
