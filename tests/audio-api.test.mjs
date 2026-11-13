import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWebServer } from '../src/features/web_backend/api/index.mjs';
import { createHearing } from '../src/features/audio_groq/api/index.mjs';
import { endpoint } from '../src/features/conexion_adb/api/index.mjs';

const TOKEN = 'test-only-token-not-for-production';
const KEY = 'gsk_' + 'T'.repeat(44);
const webDir = fileURLToPath(new URL('../src/features/panel/web', import.meta.url));

async function harness({ hearing, bots, store } = {}) {
  const app = await createWebServer({
    adb: { endpoint },
    store: store || { list: async () => ['192.0.2.1:5555'], all: async () => [{ endpoint: '192.0.2.1:5555', model: 'Pixel de prueba' }] },
    sessions: { closeAll: async () => {} },
    agents: { account: async () => ({ connected: false }) },
    bots, hearing, token: TOKEN, webDir, port: 0
  });
  const auth = await fetch(app.origin + '/api/login', { method: 'POST', headers: { Origin: app.origin }, body: JSON.stringify({ token: TOKEN }) });
  const cookie = auth.headers.get('set-cookie').split(';')[0];
  return {
    app,
    request: (path, method = 'GET', input, origin = app.origin) => fetch(app.origin + path, {
      method, headers: { Cookie: cookie, Origin: origin }, body: input ? JSON.stringify(input) : undefined
    })
  };
}

test('rutas de audio exigen login y Origin, y responden 503 sin oido disponible', async () => {
  const { app, request } = await harness({ bots: { any: () => false } });
  try {
    assert.equal((await fetch(app.origin + '/api/audio')).status, 401, 'sin sesion no se consulta el oido');
    assert.equal((await fetch(app.origin + '/api/summary')).status, 401, 'sin sesion no se consulta el resumen');
    assert.equal((await request('/api/audio', 'PUT', { key: KEY }, 'https://other.invalid')).status, 403, 'origen ajeno no guarda claves');
    assert.equal((await request('/api/audio')).status, 503, 'sin modulo de audio la ruta avisa');
    assert.equal((await request('/api/audio', 'POST', { key: KEY })).status, 503);
  } finally { await app.close(); }
});

test('la clave de Groq entra por HTTP, se guarda fuera del repo y nunca vuelve al panel', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'zyner-audio-api-'));
  const previous = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  const hearing = await createHearing({ dataDir, capture: async () => ({ wav: Buffer.alloc(0), silent: true }) });
  const { app, request } = await harness({ hearing, bots: { any: () => false } });
  try {
    const before = await request('/api/audio');
    assert.equal(before.status, 200);
    assert.deepEqual(await before.json(), { configured: false, model: 'whisper-large-v3-turbo' });

    assert.equal((await request('/api/audio', 'PUT', { key: 'no-es-una-clave' })).status, 400, 'rechaza formato invalido');
    assert.equal((await request('/api/audio', 'PUT', {})).status, 400, 'rechaza cuerpo sin clave');

    const saved = await request('/api/audio', 'PUT', { key: KEY });
    assert.equal(saved.status, 200);
    const savedBody = await saved.text();
    assert.ok(!savedBody.includes(KEY), 'la respuesta de guardado no repite la clave');
    assert.deepEqual(JSON.parse(savedBody), { configured: true, model: 'whisper-large-v3-turbo' });

    const after = await request('/api/audio');
    const afterBody = await after.text();
    assert.deepEqual(JSON.parse(afterBody), { configured: true, model: 'whisper-large-v3-turbo' });
    assert.ok(!afterBody.includes(KEY), 'ninguna lectura devuelve la clave');
    assert.equal((await hearing.status()).configured, true, 'quedo persistida en datos privados');

    assert.equal((await request('/api/audio', 'DELETE')).status, 404, 'no hay borrado silencioso de la ruta');
  } finally {
    await app.close();
    if (previous !== undefined) process.env.GROQ_API_KEY = previous;
    await rm(dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

test('no se cambia la clave con bots trabajando', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'zyner-audio-api-'));
  const hearing = await createHearing({ dataDir, capture: async () => ({ wav: Buffer.alloc(0), silent: true }) });
  const { app, request } = await harness({ hearing, bots: { any: () => true } });
  try {
    const blocked = await request('/api/audio', 'PUT', { key: KEY });
    assert.equal(blocked.status, 409);
    assert.match((await blocked.json()).error, /Deten los bots/);
    assert.equal((await request('/api/audio')).status, 200, 'consultar el estado sigue permitido');
  } finally {
    await app.close();
    await rm(dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

test('el resumen suma el acumulado y marca equipos que ya no estan en el panel', async () => {
  const bots = {
    any: () => false,
    summary: () => ({
      devices: [
        { endpoint: '192.0.2.1:5555', watched: 12, likes: 3, heard: 9, tasks: 2, updatedAt: '2026-11-13T12:00:00Z', running: true },
        { endpoint: '192.0.2.9:5555', watched: 4, likes: 0, heard: 1, tasks: 1, updatedAt: '2026-11-13T11:00:00Z', running: false }
      ],
      totals: { watched: 16, likes: 3, heard: 10, tasks: 3, devices: 2 }
    })
  };
  const { app, request } = await harness({ bots });
  try {
    const response = await request('/api/summary');
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.totals, { watched: 16, likes: 3, heard: 10, tasks: 3, devices: 2 });
    const [known, gone] = body.devices;
    assert.equal(known.model, 'Pixel de prueba');
    assert.equal(known.saved, true);
    assert.equal(known.running, true);
    assert.equal(known.watched, 12);
    assert.equal(gone.model, null, 'un equipo eliminado no inventa modelo');
    assert.equal(gone.saved, false);
    assert.equal((await request('/api/summary', 'POST')).status, 404, 'el resumen es de solo lectura');
  } finally { await app.close(); }
});

test('sin bots el resumen avisa en lugar de devolver ceros falsos', async () => {
  const { app, request } = await harness({});
  try {
    const response = await request('/api/summary');
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /Bot no disponible/);
  } finally { await app.close(); }
});
