import { execSync } from 'node:child_process';
import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const currentTypesPath = resolve(process.cwd(), 'src/types/database.types.ts');
const tempTypesPath = resolve(process.cwd(), 'src/types/database.types.temp.ts');

console.log('Verificando sincronización de tipos TypeScript de Supabase...');

try {
  // 1. Generar tipos temporales
  execSync(`npx supabase gen types typescript --local > "${tempTypesPath}"`, {
    stdio: 'pipe',
  });

  if (!existsSync(currentTypesPath)) {
    console.error('ERROR: El archivo src/types/database.types.ts no existe.');
    if (existsSync(tempTypesPath)) unlinkSync(tempTypesPath);
    process.exit(1);
  }

  const normalize = (content) => `${content.trimEnd()}\n`;
  const currentContent = normalize(readFileSync(currentTypesPath, 'utf-8'));
  const tempContent = normalize(readFileSync(tempTypesPath, 'utf-8'));

  // 4. Eliminar temporal
  unlinkSync(tempTypesPath);

  // 2. Comparar contenidos
  if (currentContent !== tempContent) {
    console.error('ERROR: src/types/database.types.ts desincronizado de las migraciones.');
    console.error('Ejecuta `npm run db:types` para regenerar los tipos.');
    process.exit(1);
  }

  console.log('✅ Tipos TypeScript sincronizados con éxito.');
  process.exit(0);
} catch (err) {
  if (existsSync(tempTypesPath)) unlinkSync(tempTypesPath);
  console.error('ERROR al verificar tipos:', err.message || err);
  process.exit(1);
}
