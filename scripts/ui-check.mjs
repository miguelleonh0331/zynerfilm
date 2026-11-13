// Arnes reproducible para las pruebas *.check.js del panel.
// Uso: node_modules/electron/dist/electron.exe scripts/ui-check.mjs src/features/panel/tests/summary.check.js [...]
// Levanta el backend real en un directorio de datos temporal, abre el panel autenticado
// en una ventana oculta y evalua cada archivo de prueba en la pagina.
import { app, BrowserWindow } from 'electron';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checks = process.argv.slice(2).filter(value => value.endsWith('.js'));
if (!checks.length) {
  console.error('Indica al menos un archivo *.check.js');
  process.exit(2);
}

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');

const deadline = Number(process.env.UI_CHECK_TIMEOUT || 60000);
const timeout = (promise, label) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo agotado: ' + label)), deadline).unref())
]);

let backend, window, dataDir, failures = 0;
try {
  await app.whenReady();
  dataDir = await mkdtemp(join(tmpdir(), 'zyner-ui-check-'));
  process.env.ZYNER_DATA_DIR = dataDir;
  process.env.PORT = '0';
  process.env.HOST = '127.0.0.1';
  const { startBackend } = await import('file:///' + join(root, 'server.mjs').replaceAll('\\', '/'));
  backend = await startBackend();

  window = new BrowserWindow({
    show: false, width: 1400, height: 1000,
    webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false }
  });
  await timeout(window.loadURL(backend.origin + '/#token=' + encodeURIComponent(backend.token)), 'cargar el panel');
  await timeout(window.webContents.executeJavaScript(`new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (!document.getElementById('sidebar-content').hidden) return resolve(true);
      if (Date.now() - start > 30000) return reject(new Error('El panel no inicio sesion: ' + document.getElementById('status').textContent));
      setTimeout(tick, 100);
    };
    tick();
  })`, true), 'autenticar el panel');

  for (const file of checks) {
    const source = await readFile(resolve(root, file), 'utf8');
    try {
      const result = await timeout(window.webContents.executeJavaScript(source, true), file);
      console.log('OK   ' + file + ' ' + JSON.stringify(result));
    } catch (error) {
      failures++;
      console.error('FALLA ' + file + ': ' + (error?.message || error));
    }
  }
} catch (error) {
  failures++;
  console.error('ERROR del arnes: ' + (error?.stack || error));
} finally {
  try { window?.destroy(); } catch {}
  try { await backend?.close(); } catch (error) { console.error('Aviso al cerrar backend: ' + error.message); }
  if (dataDir) await rm(dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }).catch(() => {});
  console.log(failures ? 'Pruebas de UI con ' + failures + ' falla(s).' : 'Pruebas de UI aprobadas: ' + checks.length + '.');
  app.exit(failures ? 1 : 0);
}
