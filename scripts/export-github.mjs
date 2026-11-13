import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = (args, cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (git(['status', '--porcelain'])) throw new Error('Crea un commit y deja el arbol limpio antes de exportar.');
const commit = git(['rev-parse', 'HEAD']);
const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const name = 'zynerfilmer-' + metadata.version + '-' + commit.slice(0, 7);
const parent = join(root, 'dist', 'github');
const output = join(parent, name);
try { await access(output); throw new Error('La exportacion ya existe: ' + output); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(output, { recursive: true });
const files = git(['ls-files', '-z']).split('\0').filter(Boolean);
const excluded = [];
for (const relative of files) {
  if (relative.startsWith('.repo-agent-backups/') || relative.startsWith('docs/analysis/') ||
      (relative.startsWith('docs/requests/') && relative !== 'docs/requests/README.md') ||
      relative === 'LICENSES/motor-origen.json') {
    excluded.push(relative); continue;
  }
  if (/(^|\/)(access-token|\.env|id_rsa|id_ed25519)$|\.(sqlite|db|pem|key)(-|$)/i.test(relative))
    throw new Error('Archivo de runtime no permitido en distribucion: ' + relative);
  const target = resolve(output, relative);
  if (!target.startsWith(output + '\\') && !target.startsWith(output + '/')) throw new Error('Ruta de exportacion invalida.');
  await mkdir(dirname(target), { recursive: true });
  await copyFile(join(root, relative), target);
}
await writeFile(join(output, 'RELEASE_SOURCE.json'), JSON.stringify({
  version: metadata.version, sourceCommit: commit, excluded, note: 'Snapshot sin historial privado, datos de dispositivos ni claves.'
}, null, 2) + '\n');
git(['init', '--initial-branch=main'], output);
git(['add', '.'], output);
git(['commit', '-m', 'Initial source release ' + metadata.version + ' from ' + commit.slice(0, 7)], output);
const zip = join(parent, name + '.zip');
git(['archive', '--format=zip', '--output=' + zip, 'HEAD'], output);
console.log('Repositorio limpio: ' + output);
console.log('ZIP: ' + zip);
console.log('No se ha publicado en GitHub.');
