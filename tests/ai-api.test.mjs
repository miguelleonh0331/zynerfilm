import test from 'node:test';
import assert from 'node:assert/strict';
import { createWebServer } from '../src/features/web_backend/api/index.mjs';
import { endpoint } from '../src/features/conexion_adb/api/index.mjs';
import { fileURLToPath } from 'node:url';

test('rutas IA requieren login, Origin y equipo guardado; no cruzan endpoints', async () => {
  const calls = []; let botRunning = false;
  const bots = { configure: (target,options)=>({endpoint:target,options}), snapshot: target => ({endpoint:target,running:botRunning}), has:()=>botRunning, any:()=>botRunning, start: target=>{botRunning=true;return {endpoint:target,running:true};}, stop:async target=>{botRunning=false;return {endpoint:target,running:false};} };
  const agents = {
    models: async () => [{model:'fixture-vision',efforts:['low']}],
    configure: async (target,config) => ({endpoint:target,...config}),
    account: async () => ({ connected: false }),
    login: async () => ({ verificationUrl: 'https://auth.openai.com/codex/device', userCode: 'TEST-ONLY' }),
    snapshot: target => ({ endpoint: target, preferences: '', messages: [], busy: false }),
    preferences: (target, text) => { calls.push([target, text]); return { endpoint: target }; },
    send: async (target, text) => { calls.push([target, text]); return { endpoint: target, busy: true }; }
  };
  const app = await createWebServer({ adb: { endpoint }, store: { list: async () => ['192.0.2.1:5555', '192.0.2.2:5555'] },
    sessions: { closeAll: async () => {} }, agents, bots, token: 'test-only-token-not-for-production',
    webDir: fileURLToPath(new URL('../src/features/panel/web', import.meta.url)), port: 0 });
  try {
    assert.equal((await fetch(app.origin + '/api/ai/account')).status, 401);
    const auth = await fetch(app.origin + '/api/login', { method: 'POST', headers: { Origin: app.origin }, body: JSON.stringify({ token: 'test-only-token-not-for-production' }) });
    const cookie = auth.headers.get('set-cookie').split(';')[0];
    const request = (path, method = 'GET', input, origin = app.origin) => fetch(app.origin + path, { method,
      headers: { Cookie: cookie, Origin: origin }, body: input ? JSON.stringify(input) : undefined });
    assert.equal((await request('/api/ai/login', 'POST', {}, 'https://other.invalid')).status, 403);
    assert.equal((await request('/api/ai/login', 'POST')).status, 200);
    assert.equal((await request('/api/ai/agent?endpoint=192.0.2.9:5555')).status, 404);
    for (const target of ['192.0.2.1:5555', '192.0.2.2:5555']) {
      assert.equal((await request('/api/ai/agent', 'PUT', { endpoint: target, preferences: target })).status, 200);
      const response = await request('/api/ai/message', 'POST', { endpoint: target, text: target });
      assert.equal(response.status, 202); assert.equal((await response.json()).endpoint, target);
    }
    assert.deepEqual(calls.map(c => c[0]), ['192.0.2.1:5555', '192.0.2.1:5555', '192.0.2.2:5555', '192.0.2.2:5555']);
    assert.equal((await request('/api/bots')).status,200);
    assert.equal((await request('/api/bot','PUT',{endpoint:'192.0.2.1:5555',options:{watchSeconds:30}})).status,200);
    assert.equal((await request('/api/ai/models')).status, 200);
    assert.equal((await request('/api/ai/config', 'PUT', {endpoint:'192.0.2.1:5555',model:'fixture-vision',effort:'low'})).status, 200);
    assert.equal((await request('/api/bot', 'POST', {endpoint:'192.0.2.9:5555'})).status, 404);
    assert.equal((await request('/api/bot', 'POST', {endpoint:'192.0.2.1:5555'})).status, 202);
    assert.equal((await request('/api/ai/config', 'PUT', {endpoint:'192.0.2.1:5555',model:'fixture-vision',effort:'low'})).status, 409);
    assert.equal((await request('/api/ai/message', 'POST', {endpoint:'192.0.2.1:5555',text:'hola'})).status, 409);
    assert.equal((await request('/api/ai/logout','POST')).status, 409);
    assert.equal((await request('/api/bot','DELETE',{endpoint:'192.0.2.1:5555'},'https://other.invalid')).status, 403);
    assert.equal((await request('/api/bot','DELETE',{endpoint:'192.0.2.1:5555'})).status, 200);

  } finally { await app.close(); }
});

test('/api/bots publica el progreso para que el panel detecte tareas sin avance', async () => {
  const task = { endpoint: '192.0.2.1:5555', running: true, status: 'running', current: 7, total: 50, updatedAt: '2026-11-13T17:00:00Z' };
  const bots = { snapshot: target => (target === task.endpoint ? task : { endpoint: target, running: false, status: 'idle' }),
    has: () => false, any: () => false };
  const app = await createWebServer({ adb: { endpoint }, store: { list: async () => ['192.0.2.1:5555', '192.0.2.2:5555'] },
    sessions: { closeAll: async () => {} }, agents: { account: async () => ({ connected: false }) }, bots,
    token: 'test-only-token-not-for-production',
    webDir: fileURLToPath(new URL('../src/features/panel/web', import.meta.url)), port: 0 });
  try {
    const auth = await fetch(app.origin + '/api/login', { method: 'POST', headers: { Origin: app.origin }, body: JSON.stringify({ token: 'test-only-token-not-for-production' }) });
    const cookie = auth.headers.get('set-cookie').split(';')[0];
    const response = await fetch(app.origin + '/api/bots', { headers: { Cookie: cookie, Origin: app.origin } });
    assert.equal(response.status, 200);
    const { bots: list } = await response.json();
    const working = list.find(item => item.endpoint === '192.0.2.1:5555');
    assert.deepEqual([working.current, working.total], [7, 50]);
    assert.equal(working.updatedAt, '2026-11-13T17:00:00Z');
    const idle = list.find(item => item.endpoint === '192.0.2.2:5555');
    assert.deepEqual([idle.current, idle.total, idle.updatedAt], [0, 0, null], 'sin tarea no inventa progreso');
    assert.ok(!JSON.stringify(list).includes('profile'), 'el progreso no arrastra la memoria aprendida');
  } finally { await app.close(); }
});
