import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, resolve } from 'node:path';

const cwd = resolve(process.cwd());
const reportsDir = resolve(cwd, 'review/reports/phase-2.1.1');
mkdirSync(reportsDir, { recursive: true });

const results = [];

function execute(filename, command, args = [], { acceptedExitCodes = [0] } = {}) {
  const startedAt = new Date();
  console.log(`[EVIDENCE 2.1.1] ${command} ${args.join(' ')}`);

  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, PAGER: 'cat' },
  });

  const finishedAt = new Date();
  const exitCode = result.status ?? 1;
  const record = {
    filename,
    command: [command, ...args].join(' '),
    exitCode,
    passed: acceptedExitCodes.includes(exitCode),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? result.error?.message ?? '',
  };
  results.push(record);

  writeFileSync(
    resolve(reportsDir, filename),
    [
      `COMMAND: ${record.command}`,
      `CWD: ${cwd}`,
      `START_TIME: ${record.startedAt}`,
      `END_TIME: ${record.finishedAt}`,
      `DURATION_MS: ${record.durationMs}`,
      `EXIT_CODE: ${record.exitCode}`,
      '--- STDOUT ---',
      record.stdout || '(none)',
      '--- STDERR ---',
      record.stderr || '(none)',
    ].join('\n'),
    'utf8',
  );

  if (!record.passed) {
    throw new Error(`Falló el paso obligatorio: ${record.command} (exit ${exitCode})`);
  }
  return record;
}

function inventory(directory, base = directory) {
  const ignored = new Set([
    '.git',
    '.gemini',
    '.temp_worktree',
    'node_modules',
    'dist',
  ]);
  const files = [];
  for (const name of readdirSync(directory)) {
    if (ignored.has(name)) continue;
    const path = join(directory, name);
    const relativePath = relative(base, path);
    if (relativePath.startsWith('review/reports')) continue;
    if (relativePath.startsWith('supabase/.temp')) continue;
    if (relativePath.startsWith('supabase/.branches')) continue;
    if (statSync(path).isDirectory()) files.push(...inventory(path, base));
    else files.push(relativePath);
  }
  return files;
}

let failure;

try {
  execute('00-git-status-before.txt', 'git', ['status', '--porcelain=v1', '--branch']);

  const environment = {
    generatedAt: new Date().toISOString(),
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
  };
  writeFileSync(
    resolve(reportsDir, '01-environment.json'),
    JSON.stringify(environment, null, 2),
    'utf8',
  );

  execute('02-npm-ci.txt', 'npm', ['ci', '--no-audit', '--no-fund']);
  execute('03-npm-ls.txt', 'npm', ['ls', '--depth=0']);
  execute('04-supabase-stop-before.txt', 'npx', ['supabase', 'stop'], {
    acceptedExitCodes: [0, 1],
  });
  execute('05-supabase-start.txt', 'npx', ['supabase', 'start']);
  execute('06-db-reset-first.txt', 'npm', ['run', 'db:reset']);
  execute('07-db-reset-second.txt', 'npm', ['run', 'db:reset']);
  execute('08-db-test.txt', 'npm', ['run', 'db:test']);
  execute('09-db-lint.txt', 'npm', ['run', 'db:lint']);
  execute('10-db-types.txt', 'npm', ['run', 'db:types']);
  execute('11-db-verify-types.txt', 'npm', ['run', 'db:verify-types']);
  execute('12-frontend-lint.txt', 'npm', ['run', 'lint']);
  execute('13-frontend-typecheck.txt', 'npm', ['run', 'typecheck']);
  execute('14-frontend-tests.txt', 'npm', ['run', 'test']);
  execute('15-frontend-build.txt', 'npm', ['run', 'build']);
  execute('16-verify-all.txt', 'npm', ['run', 'verify:all']);
  execute('17-npm-audit-high.txt', 'npm', ['audit', '--audit-level=high']);

  const secretScan = execute(
    '18-secret-scan.txt',
    'git',
    [
      'grep',
      '-nE',
      'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|sb_secret_|ghp_[A-Za-z0-9]{20,}|github_pat_|sk_live_|APP_USR-',
      '--',
      '.',
      ':(exclude)scripts/run-evidence-phase-2-1-1.js',
      ':(exclude)review/reports/**',
    ],
    { acceptedExitCodes: [0, 1] },
  );
  if (secretScan.exitCode === 0) {
    throw new Error('El escaneo encontró candidatos a secretos en archivos versionados');
  }

  execute(
    '19-git-diff-stat.txt',
    'git',
    ['diff', '--stat', 'phase-2.1-security-hardening...HEAD'],
  );

  writeFileSync(
    resolve(reportsDir, '20-file-inventory.txt'),
    `${inventory(cwd).sort().join('\n')}\n`,
    'utf8',
  );
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
  console.error(`[EVIDENCE 2.1.1] ${failure}`);
} finally {
  try {
    execute('21-supabase-stop-after.txt', 'npx', ['supabase', 'stop'], {
      acceptedExitCodes: [0, 1],
    });
  } catch {
    // El fallo queda registrado en su reporte; no oculta el fallo original.
  }

  try {
    execute('22-git-status-after.txt', 'git', ['status', '--porcelain=v1', '--branch']);
  } catch {
    // El resumen final conserva el resultado.
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    status: failure ? 'FAIL' : 'PASS',
    failure: failure ?? null,
    steps: results.map(({ filename, command, exitCode, passed, durationMs }) => ({
      filename,
      command,
      exitCode,
      passed,
      durationMs,
    })),
  };
  writeFileSync(
    resolve(reportsDir, '23-summary.json'),
    JSON.stringify(summary, null, 2),
    'utf8',
  );
}

if (failure) process.exit(1);
console.log('Evidence collector 2.1.1: PASS');
