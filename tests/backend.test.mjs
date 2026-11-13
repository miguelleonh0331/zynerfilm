import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { endpoint, parseDevices } from '../src/features/conexion_adb/api/index.mjs';
import { createEquipmentStore } from '../src/features/equipos/api/index.mjs';
import { controlMessage, VideoParser, createSessions } from '../src/features/sesiones_scrcpy/api/index.mjs';
import { createWebServer } from '../src/features/web_backend/api/index.mjs';
import { WebSocket } from 'ws';

test('IP/puerto y estados ADB', () => {
  assert.equal(endpoint(' 192.0.2.10:5555 '), '192.0.2.10:5555');
  assert.equal(endpoint('[::1]:5555'), '[::1]:5555');
  for (const value of ['x:5555','1.2.3.4:0','1.2.3.4:65536','1.2.3.4:5555;calc', null]) assert.throws(() => endpoint(value));
  assert.equal(parseDevices('List of devices attached\nip:55 device model:Galaxy_S10\nx unauthorized\nz offline\n').length, 3);
});
test('SQLite migra JSON una vez, persiste modelos y no resucita eliminados', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zyner-sqlite-'));
  const path = join(directory, 'devices.sqlite'); const legacyPath = join(directory, 'equipos.json');
  let store = createEquipmentStore(path, { legacyPath });
  try {
    const original = JSON.stringify(['1.2.3.4:5', '1.2.3.4:5']);
    await writeFile(legacyPath, original);
    assert.deepEqual(await store.list(), ['1.2.3.4:5']);
    await Promise.all([store.add('1.2.3.4:6', 'Galaxy'), store.add('1.2.3.4:7'), store.add('1.2.3.4:6', "Phone ' SQL;--")]);
    assert.equal((await store.all()).length, 3);
    assert.equal((await readFile(path)).subarray(0, 15).toString(), 'SQLite format 3');
    assert.equal(await store.remove('1.2.3.4:5'), true);
    assert.equal(await store.remove('1.2.3.4:5'), false);
    await store.close(); store = createEquipmentStore(path, { legacyPath });
    assert.deepEqual(await store.list(), ['1.2.3.4:6', '1.2.3.4:7']);
    assert.equal((await store.all())[0].model, "Phone ' SQL;--");
    assert.match((await store.all())[0].createdAt, /^\d{4}-/);
    assert.equal(await readFile(legacyPath, 'utf8'), original);
    const backupPath = join(directory, 'backup.sqlite');
    await store.backup(backupPath);
    await assert.rejects(store.backup(backupPath));
    const restored = createEquipmentStore(backupPath);
    try { assert.deepEqual(await restored.list(), await store.list()); } finally { await restored.close(); }
  } finally { await store.close(); await rm(directory, { recursive: true }); }
});
test('JSON corrupto cancela migracion y permite recuperarla sin sobrescribir origen', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zyner-migration-'));
  const path = join(directory, 'devices.sqlite'); const legacyPath = join(directory, 'equipos.json');
  let store = createEquipmentStore(path, { legacyPath });
  try {
    await writeFile(legacyPath, 'broken');
    await assert.rejects(store.list(), /invalido/);
    assert.equal(await readFile(legacyPath, 'utf8'), 'broken');
    await store.close();
    await writeFile(legacyPath, '["1.2.3.4:5"]');
    store = createEquipmentStore(path, { legacyPath });
    assert.deepEqual(await store.list(), ['1.2.3.4:5']);
  } finally { await store.close(); await rm(directory, { recursive: true }); }
});
test('control scrcpy serializa touch, teclado y UTF8; rechaza comandos libres', () => {
  const touch = controlMessage({ type: 'touch', action: 0, x: 15, y: 40, width: 720, height: 1280 });
  assert.equal(touch.length, 32); assert.equal(touch[0], 2);
  assert.equal(touch.readUInt32BE(10), 15); assert.equal(touch.readUInt16BE(20), 1280);
  const key = controlMessage({ type: 'key', key: 'home' });
  assert.equal(key.length, 28); assert.equal(key.readUInt32BE(2), 3); assert.equal(key[15], 1);
  const text = controlMessage({ type: 'text', text: 'hola ñ' });
  assert.equal(text.readUInt32BE(1), Buffer.byteLength('hola ñ')); assert.equal(text.subarray(5).toString(), 'hola ñ');
  assert.throws(() => controlMessage({ type: 'shell', command: 'rm -rf /' }));
  assert.throws(() => controlMessage({ type: 'touch', action: 0, x: -1, y: 5, width: 720, height: 1280 }));
  assert.throws(() => controlMessage({ type: 'text', text: 'x'.repeat(301) }));
});
test('video scrcpy conserva paquetes fragmentados y limita memoria', () => {
  const header = Buffer.alloc(76); header.write('Phone'); header.write('h264', 64); header.writeUInt32BE(720, 68); header.writeUInt32BE(1280, 72);
  const packet = Buffer.alloc(16); packet.writeBigUInt64BE(1n << 62n); packet.writeUInt32BE(4, 8); packet.writeUInt32BE(0x12345678, 12);
  let metadata; const packets = [];
  const parser = new VideoParser(value => { metadata = value; }, value => packets.push(Buffer.from(value)));
  const input = Buffer.concat([header, packet, packet]);
  for (let i = 0; i < input.length; i += 3) parser.feed(input.subarray(i, i + 3));
  assert.equal(metadata.width, 720); assert.equal(packets.length, 2); assert.deepEqual(packets[0], packet);
  const bad = Buffer.alloc(12); bad.writeUInt32BE(10000000, 8);
  assert.throws(() => parser.feed(bad), /demasiado/);
});
test('API: autenticacion, origen, persistencia y WebSocket protegido', async () => {
  const targets = []; let connected = false; let disconnected = false;
  const adb = { endpoint, list: async () => connected ? [{ endpoint: '1.2.3.4:5555', state: 'device', model: 'Prueba' }] : [],
    connect: async target => { connected = true; return { endpoint: target, state: 'device' }; }, disconnect: async () => { disconnected = true; connected = false; } };
  const store = {
    list: async () => targets,
    all: async () => targets.map(endpoint => ({ endpoint, model: 'Modelo guardado' })),
    add: async value => { if (!targets.includes(value)) targets.push(value); },
    remove: async value => { const index = targets.indexOf(value); if (index < 0) return false; targets.splice(index, 1); return true; }
  };
  const sessions = { has: () => false, close: async () => {}, closeAll: async () => {}, attach: async (_target, ws) => { ws.send(JSON.stringify({ metadata: { width: 720, height: 1280 } })); } };
  const backend = await createWebServer({ adb, store, sessions, token: 'test-token-for-automated-check', webDir: new URL('../src/features/panel/web', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), port: 0 });
  try {
    const call = (path, options) => fetch(backend.origin + '/api/' + path, options);
    assert.equal((await call('devices')).status, 401);
    for (const headers of [{}, { Origin: 'https://foreign.example' }]) {
      await new Promise((resolve, reject) => {
        const ws = new WebSocket(backend.origin.replace('http:', 'ws:') + '/api/stream?endpoint=1.2.3.4:5555', { headers });
        ws.once('open', () => { ws.close(); reject(new Error('Unauthorized WebSocket accepted')); });
        ws.once('error', error => { try { assert.match(error.message, /403/); resolve(); } catch (failure) { reject(failure); } });
      });
    }

    assert.equal((await call('login', { method: 'POST', body: '{}' })).status, 403);
    assert.equal((await call('login', { method: 'POST', headers: { Origin: backend.origin }, body: '{"token":"bad"}' })).status, 401);
    const response = await call('login', { method: 'POST', headers: { Origin: backend.origin }, body: '{"token":"test-token-for-automated-check"}' });
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie').split(';')[0];
    const headers = { Origin: backend.origin, Cookie: cookie };
    assert.equal((await call('devices', { method: 'POST', headers, body: '{"endpoint":"1.2.3.4:5555"}' })).status, 201);
    assert.equal((await (await call('devices', { headers })).json()).devices[0].model, 'Prueba');
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(backend.origin.replace('http:', 'ws:') + '/api/stream?endpoint=1.2.3.4:5555', { headers });
      ws.once('message', data => { assert.equal(JSON.parse(data).metadata.width, 720); ws.close(); resolve(); });
      ws.on('error', reject);
    });
    const live = new WebSocket(backend.origin.replace('http:', 'ws:') + '/api/stream?endpoint=1.2.3.4:5555', { headers });
    await new Promise((resolve, reject) => { live.once('message', resolve); live.once('error', reject); });
    const otherLogin = await call('login', { method: 'POST', headers: { Origin: backend.origin }, body: '{"token":"test-token-for-automated-check"}' });
    const otherHeaders = { Origin: backend.origin, Cookie: otherLogin.headers.get('set-cookie').split(';')[0] };
    assert.equal((await call('devices', { method: 'DELETE', headers: otherHeaders, body: '{"endpoint":"1.2.3.4:5555"}' })).status, 409);
    await new Promise(resolve => { live.once('close', resolve); live.close(); });
    assert.equal((await call('disconnect', { method: 'POST', headers, body: '{"endpoint":"1.2.3.4:5555"}' })).status, 200);
    assert.equal(disconnected, true);
    assert.equal((await (await call('devices', { headers })).json()).devices[0].model, 'Modelo guardado');
    assert.equal((await call('devices', { method: 'DELETE', headers: { Origin: backend.origin }, body: '{"endpoint":"1.2.3.4:5555"}' })).status, 401);
    assert.equal((await call('devices', { method: 'DELETE', headers, body: '{"endpoint":"1.2.3.4:5555"}' })).status, 200);
    assert.equal((await (await call('devices', { headers })).json()).devices.length, 0);
    assert.equal((await call('devices', { method: 'DELETE', headers, body: '{"endpoint":"1.2.3.4:5555"}' })).status, 404);
    assert.equal((await call('logout', { method: 'POST', headers })).status, 200);
    assert.equal((await call('devices', { headers })).status, 401);
  } finally { await backend.close(); }
});
test('sesion no autorizada libera reserva sin iniciar servidor', async () => {
  const messages = [];
  const ws = { readyState: 1, once() {}, on() {}, send(value) { messages.push(JSON.parse(value)); }, close() { this.readyState = 3; } };
  const sessions = createSessions({ adb: { endpoint, connect: async () => { throw new Error('Unauthorized'); } }, serverPath: 'missing' });
  await sessions.attach('1.2.3.4:5555', ws);
  assert.equal(sessions.has('1.2.3.4:5555'), false);
  assert.equal(messages[0].error, 'Unauthorized');
});
test('cerrar durante preparacion no deja reserva ni archivo remoto propio', async () => {
  const { EventEmitter } = await import('node:events');
  const ws = new EventEmitter(); ws.readyState = 1; ws.send = () => {}; ws.close = () => { ws.readyState = 3; };
  let release; const gate = new Promise(resolve => { release = resolve; });
  let pushed; const started = new Promise(resolve => { pushed = resolve; });
  const calls = [];
  const adb = { endpoint, connect: async () => {}, run: async args => {
    calls.push(args);
    if (args.includes('push')) { pushed(); await gate; }
    return '';
  } };
  const sessions = createSessions({ adb, serverPath: 'fixture' });
  const task = sessions.attach('1.2.3.4:5555', ws);
  await started; ws.emit('close'); release(); await task;
  assert.equal(sessions.has('1.2.3.4:5555'), false);
  assert(calls.some(args => args.includes('rm')));
});
test('no acepta token persistido vacio ni teclas heredadas del prototipo', async () => {
  const { accessToken } = await import('../src/features/web_backend/api/index.mjs');
  const directory = await mkdtemp(join(tmpdir(), 'zyner-token-'));
  try {
    await writeFile(join(directory, 'access-token'), '');
    await assert.rejects(accessToken(directory), /invalido/);
    assert.throws(() => controlMessage({ type: 'key', key: '__proto__' }), /permitida/);
    assert.throws(() => controlMessage({ type: 'key', key: 'constructor' }), /permitida/);
  } finally { await rm(directory, { recursive: true }); }
});
test('configuracion de despliegue genera clave privada y no sobrescribe archivos', async () => {
  const { execFileSync, spawnSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const directory = await mkdtemp(join(tmpdir(), 'zyner-config-'));
  const destination = join(directory, 'config.env');
  const script = fileURLToPath(new URL('../scripts/configure.py', import.meta.url));
  const python = process.platform === 'win32' ? 'python' : 'python3';
  try {
    const output = execFileSync(python, [script, '--origin', 'https://panel.example.test', '--output', destination], { encoding: 'utf8' });
    const config = await readFile(destination, 'utf8');
    const token = config.match(/ZYNER_TOKEN=([a-f0-9]{64})/)[1];
    assert(!output.includes(token));
    assert(config.includes('PUBLIC_ORIGIN=https://panel.example.test'));
    assert.notEqual(spawnSync(python, [script, '--origin', 'https://other.example.test', '--output', destination]).status, 0);
    assert.equal(await readFile(destination, 'utf8'), config);
    assert.notEqual(spawnSync(python, [script, '--origin', 'http://invalid.example.test', '--output', join(directory, 'bad.env')]).status, 0);
  } finally { await rm(directory, { recursive: true }); }
});
