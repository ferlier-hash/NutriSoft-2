import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const outputPath = resolve(process.cwd(), 'src/types/database.types.ts');
const generated = execFileSync(
  'npx',
  ['supabase', 'gen', 'types', 'typescript', '--local'],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
);

writeFileSync(outputPath, `${generated.trimEnd()}\n`, 'utf8');
console.log('Tipos TypeScript generados desde Supabase local.');
