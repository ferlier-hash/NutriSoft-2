import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(projectRoot, 'dist/index.html'), 'utf8');
const entryMatch = html.match(/<script[^>]+type="module"[^>]+src="([^"]+\.js)"/);

if (!entryMatch) throw new Error('No se encontró el JavaScript inicial en dist/index.html.');

const entryPath = resolve(projectRoot, 'dist', entryMatch[1].replace(/^\//, ''));
const bytes = statSync(entryPath).size;
const limit = 500 * 1024;

if (bytes > limit) {
  throw new Error(`El bundle inicial ocupa ${(bytes / 1024).toFixed(2)} kB y supera el presupuesto de 500 kB.`);
}

console.log(`Presupuesto de bundle inicial: PASS (${(bytes / 1024).toFixed(2)} kB / 500 kB)`);
