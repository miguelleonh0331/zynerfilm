import { packager } from '@electron/packager';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const paths = await packager({
  dir: root, name: 'Zynerfilmer', platform: 'win32', arch: 'x64',
  out: resolve(root, 'dist/electron'), overwrite: true, prune: true, asar: false,
  ignore: [/^\/(bin|obj|dist|\.git|data|verification|\.repo-agent-backups|tests)(\/|$)/, /^\/docs\/analysis(\/|$)/, /\.env$/, /\.(cs|csproj)$/]
});
console.log(paths.join('\n'));
