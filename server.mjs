import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { createAdb } from './src/features/conexion_adb/api/index.mjs';
import { createEquipmentStore } from './src/features/equipos/api/index.mjs';
import { createSessions } from './src/features/sesiones_scrcpy/api/index.mjs';
import { accessToken, createWebServer } from './src/features/web_backend/api/index.mjs';
import { createBots, createAndroidObserver } from './src/features/bot_tiktok/api/index.mjs';
import { createAgents } from './src/features/agentes_ia/api/index.mjs';
import { createAudioCapture, createHearing } from './src/features/audio_groq/api/index.mjs';
const root = dirname(fileURLToPath(import.meta.url));
export async function startBackend(overrides = {}) {
  const dataDir = process.env.ZYNER_DATA_DIR || (process.platform === 'win32'
    ? join(process.env.LOCALAPPDATA || homedir(), 'Zynerfilmer') : join(homedir(), '.local', 'share', 'zynerfilmer'));
  const token = await accessToken(dataDir, process.env.ZYNER_TOKEN);
  const adb = createAdb(process.env.ADB_PATH || (process.platform === 'win32' ? join(root, 'motor', 'adb.exe') : 'adb'));
  const store = createEquipmentStore(join(dataDir, 'zynerfilmer.sqlite'), { legacyPath: join(dataDir, 'equipos.json'), validateEndpoint: adb.endpoint });
  await store.list();
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 4317);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT invalido.');
  const agents = await createAgents({ dataDir });
  const serverPath = process.env.SCRCPY_SERVER_PATH || join(root, 'motor', 'scrcpy-server');
  const hearing = await createHearing({ dataDir, capture: createAudioCapture({ adb, serverPath }) });
  let bots, result;
  try { bots = await createBots({ dataDir, agents, hearing, observer: createAndroidObserver(adb) }); }
  catch (error) { await agents.close(); await store.close(); throw error; }
  const sessions = createSessions({ adb, serverPath, canControl: target => !bots.has(target) });
  try { result = await createWebServer({ adb, store, sessions, agents, bots, hearing, token,
    webDir: join(root, 'src', 'features', 'panel', 'web'), host, port,
    publicOrigin: process.env.PUBLIC_ORIGIN, secureCookies: process.env.PUBLIC_ORIGIN?.startsWith('https:'),
    ...overrides }); }
  catch (error) { await bots.close(); await agents.close(); await store.close(); throw error; }
  return { ...result, token, dataDir, async close() { try { await bots.close(); await result.close(); } finally { try { await agents.close(); } finally { await store.close(); } } } };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const backend = await startBackend();
  console.log('Zynerfilmer: ' + backend.origin);
  console.log('Clave de acceso: archivo ' + join(backend.dataDir, 'access-token') + ' (o ZYNER_TOKEN si fue definido).');
  let stopping = false;
  async function stop() { if (stopping) return; stopping = true; await backend.close(); process.exit(0); }
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
