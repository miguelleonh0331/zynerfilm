import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { WebSocketServer } from 'ws';
const secureEqual = (a, b) => {
  const left = Buffer.from(a || ''); const right = Buffer.from(b || '');
  return left.length === right.length && timingSafeEqual(left, right);
};
export async function accessToken(dataDir, supplied) {
  if (supplied) {
    if (supplied.length < 24) throw new Error('ZYNER_TOKEN debe tener al menos 24 caracteres.');
    return supplied;
  }
  await mkdir(dataDir, { recursive: true });
  const path = join(dataDir, 'access-token');
  try {
    const saved = (await readFile(path, 'utf8')).trim();
    if (saved.length < 24) throw new Error('Archivo access-token invalido; revisa su contenido.');
    return saved;
  }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const token = randomBytes(32).toString('hex');
  try { await writeFile(path, token, { flag: 'wx', mode: 0o600 }); }
  catch (error) { if (error.code === 'EEXIST') return (await readFile(path, 'utf8')).trim(); throw error; }
  return token;
}
async function body(request) {
  let size = 0; const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 4096) throw new Error('Peticion demasiado grande.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); }
  catch { throw new Error('JSON invalido.'); }
}
export async function createWebServer({ adb, store, sessions, agents, bots, hearing, token, webDir, host = '127.0.0.1', port = 4317, publicOrigin, secureCookies = false }) {
  if (publicOrigin && new URL(publicOrigin).origin !== publicOrigin) throw new Error('PUBLIC_ORIGIN debe ser un origen sin ruta ni barra final.');
  const logins = new Map(); const attempts = new Map();
  const removing = new Set(); const botOwners = new Map();
  let origin = publicOrigin;
  function authorized(request) {
    const cookie = request.headers.cookie?.match(/(?:^|;\s*)zyner_session=([a-f0-9]{64})(?:;|$)/)?.[1];
    if (!cookie) return null;
    const session = logins.get(cookie);
    if (!session || session.expires < Date.now()) { logins.delete(cookie); return null; }
    return cookie;
  }
  function json(response, status, value, headers = {}) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
    response.end(JSON.stringify(value));
  }
  const staticFiles = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const url = new URL(request.url, origin);
      if (!['GET', 'HEAD'].includes(request.method) && request.headers.origin !== origin)
        return json(response, 403, { error: 'Origen no permitido.' });
      if (request.method === 'GET' && url.pathname === '/api/health') return json(response, 200, { ok: true, version: '0.7.1' });
      if (request.method === 'POST' && url.pathname === '/api/login') {
        const ip = request.socket.remoteAddress;
        let rate = attempts.get(ip);
        if (!rate || rate.until < Date.now()) { rate = { count: 0, until: Date.now() + 60000 }; attempts.set(ip, rate); }
        if (++rate.count > 10) return json(response, 429, { error: 'Demasiados intentos. Espera un minuto.' });
        const input = await body(request);
        if (typeof input.token !== 'string' || !secureEqual(input.token, token)) return json(response, 401, { error: 'Clave de acceso incorrecta.' });
        for (const [key, value] of logins) if (value.expires < Date.now()) logins.delete(key);
        if (logins.size > 100) return json(response, 429, { error: 'Limite de sesiones de acceso.' });
        const cookie = randomBytes(32).toString('hex');
        logins.set(cookie, { expires: Date.now() + 8 * 3600000 });
        return json(response, 200, { ok: true }, { 'Set-Cookie': 'zyner_session=' + cookie + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800' + (secureCookies ? '; Secure' : '') });
      }
      if (url.pathname.startsWith('/api/')) {
        const owner = authorized(request);
        if (!owner) return json(response, 401, { error: 'Inicia sesion para administrar los equipos.' });
        if (request.method === 'POST' && url.pathname === '/api/logout') {
          for (const [target, botOwner] of botOwners) if (botOwner === owner) { await bots?.stop(target); botOwners.delete(target); }
          logins.delete(owner);
          for (const client of wss.clients) if (client.owner === owner) client.close();
          return json(response, 200, { ok: true }, { 'Set-Cookie': 'zyner_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
        }
        if (url.pathname.startsWith('/api/ai/')) {
          if (!agents) return json(response, 503, { error: 'Servicio IA no disponible.' });
          if (request.method === 'GET' && url.pathname === '/api/ai/account') return json(response, 200, await agents.account());
          if (request.method === 'POST' && ['/api/ai/login', '/api/ai/logout'].includes(url.pathname) && bots?.any()) return json(response, 409, { error: 'Deten los bots antes de cambiar la cuenta.' });
          if (request.method === 'GET' && url.pathname === '/api/ai/models') return json(response, 200, { models: await agents.models() });
          if (request.method === 'POST' && url.pathname === '/api/ai/login') return json(response, 200, await agents.login());
          if (request.method === 'POST' && url.pathname === '/api/ai/logout') { await agents.logout(); return json(response, 200, { ok: true }); }
          if (['/api/ai/agent', '/api/ai/message', '/api/ai/config'].includes(url.pathname)) {
            const input = request.method === 'GET' ? Object.fromEntries(url.searchParams) : await body(request);
            const target = adb.endpoint(input.endpoint);
            if (removing.has(target) || !(await store.list()).includes(target)) return json(response, 404, { error: 'Equipo no guardado.' });
            if (request.method !== 'GET' && bots?.has(target)) return json(response, 409, { error: 'Deten el bot antes de editar o conversar con este agente.' });
            if (request.method === 'PUT' && url.pathname === '/api/ai/config') return json(response, 200, await agents.configure(target, { model: input.model, effort: input.effort }));
            if (request.method === 'GET' && url.pathname === '/api/ai/agent') return json(response, 200, agents.snapshot(target));
            if (request.method === 'PUT' && url.pathname === '/api/ai/agent') return json(response, 200, agents.preferences(target, input.preferences));
            if (request.method === 'POST' && url.pathname === '/api/ai/message') return json(response, 202, await agents.send(target, input.text));
          }
          return json(response, 404, { error: 'Ruta IA no encontrada.' });
        }
        if (url.pathname === '/api/audio') {
          if (!hearing) return json(response, 503, { error: 'Oido Groq no disponible.' });
          if (request.method === 'GET') return json(response, 200, await hearing.status());
          if (request.method === 'PUT') {
            if (bots?.any()) return json(response, 409, { error: 'Deten los bots antes de cambiar la clave de Groq.' });
            // The key only travels inbound; no route ever returns it.
            return json(response, 200, await hearing.configure((await body(request)).key));
          }
          return json(response, 404, { error: 'Ruta de audio no encontrada.' });
        }
        if (request.method === 'GET' && url.pathname === '/api/summary') {
          if (!bots) return json(response, 503, { error: 'Bot no disponible.' });
          const known = new Map((await store.all()).map(record => [record.endpoint, record.model]));
          const result = bots.summary();
          return json(response, 200, { totals: result.totals, devices: result.devices.map(device => ({
            ...device, model: known.get(device.endpoint) || null, saved: known.has(device.endpoint)
          })) });
        }
        if (request.method === 'GET' && url.pathname === '/api/bots') {
          const targets = await store.list();
          return json(response, 200, { bots: targets.map(endpoint => {
            const task = bots?.snapshot(endpoint);
            return { endpoint, running: Boolean(task?.running), status: task?.status || 'idle',
              current: task?.current || 0, total: task?.total || 0, updatedAt: task?.updatedAt || null };
          }) });
        }
        if (url.pathname === '/api/bot') {
          if (!bots) return json(response, 503, { error: 'Bot no disponible.' });
          const input = request.method === 'GET' ? Object.fromEntries(url.searchParams) : await body(request);
          const target = adb.endpoint(input.endpoint);
          if (removing.has(target) || !(await store.list()).includes(target)) return json(response, 404, { error: 'Equipo no guardado.' });
          if (request.method === 'GET') return json(response, 200, bots.snapshot(target));
          if (request.method === 'PUT') return json(response, 200, bots.configure(target, input.options));
          if (request.method === 'DELETE') { const result = await bots.stop(target); botOwners.delete(target); return json(response, 200, result); }
          if (request.method === 'POST') {
            const live = [...wss.clients].find(client => client.target === target);
            if (live && live.owner !== owner) return json(response, 409, { error: 'Otro panel esta controlando este equipo.' });
            const result = bots.start(target, input.options); botOwners.set(target, owner);
            return json(response, 202, result);
          }
          return json(response, 404, { error: 'Ruta de bot no encontrada.' });
        }
        if (request.method === 'GET' && url.pathname === '/api/devices') {
          const saved = await store.all();
          const devices = await adb.list();
          return json(response, 200, { devices: saved.map(record => {
            const device = devices.find(d => d.endpoint === record.endpoint);
            return { ...record, model: device?.model || record.model, state: device?.state || 'disconnected', streaming: sessions.has(record.endpoint), botRunning: Boolean(bots?.has(record.endpoint)) };
          }) });
        }
        if (request.method === 'POST' && url.pathname === '/api/devices') {
          const input = await body(request);
          const target = adb.endpoint(input.endpoint);
          const device = await adb.connect(target);
          if (removing.has(target)) return json(response, 409, { error: 'Espera a que termine la eliminacion del equipo.' });
          await store.add(target, device.model || 'Android');
          return json(response, 201, { device });
        }
        if (request.method === 'DELETE' && url.pathname === '/api/devices') {
          const input = await body(request); const target = adb.endpoint(input.endpoint);
          if (!(await store.list()).includes(target)) return json(response, 404, { error: 'Equipo no guardado.' });
          const live = [...wss.clients].find(client => client.target === target);
          if (live && live.owner !== owner) return json(response, 409, { error: 'Otro panel esta controlando este equipo.' });
          if (removing.has(target)) return json(response, 409, { error: 'Eliminacion en curso.' });
          if (bots?.has(target) || agents?.snapshot(target).busy) return json(response, 409, { error: 'Espera a que termine el agente de este equipo.' });
          removing.add(target);
          try {
            await sessions.close(target);
            await store.remove(target);
            await agents?.forget(target); bots?.forget(target); botOwners.delete(target);
            return json(response, 200, { ok: true });
          } finally { removing.delete(target); }
        }
        if (request.method === 'POST' && url.pathname === '/api/disconnect') {
          const input = await body(request); const target = adb.endpoint(input.endpoint);
          if (!(await store.list()).includes(target)) return json(response, 404, { error: 'Equipo no guardado.' });
          // A different browser must not disconnect another user's live session.
          const live = [...wss.clients].find(client => client.target === target);
          if (live && live.owner !== owner) return json(response, 409, { error: 'Otro panel esta controlando este equipo.' });
          await bots?.stop(target); botOwners.delete(target);
          await sessions.close(target); await adb.disconnect(target);
          return json(response, 200, { ok: true });
        }
        return json(response, 404, { error: 'Ruta no encontrada.' });
      }
      const entry = staticFiles[url.pathname];
      if (!entry || request.method !== 'GET') return json(response, 404, { error: 'Ruta no encontrada.' });
      const content = await readFile(join(webDir, entry[0]));
      response.writeHead(200, { 'Content-Type': entry[1] + '; charset=utf-8' }); response.end(content);
    } catch (error) { if (!response.headersSent) json(response, 400, { error: error.message }); else response.destroy(); }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
  server.on('upgrade', (request, socket, head) => {
    void (async () => {
      const owner = authorized(request);
      if (!owner || request.headers.origin !== origin) throw new Error('No autorizado');
      const url = new URL(request.url, origin);
      if (url.pathname !== '/api/stream') throw new Error('Ruta invalida');
      const target = adb.endpoint(url.searchParams.get('endpoint'));
      if (!(await store.list()).includes(target) || removing.has(target)) throw new Error('Equipo no guardado');
      wss.handleUpgrade(request, socket, head, ws => {
        ws.owner = owner; ws.target = target;
        ws.expires = logins.get(owner).expires;
        ws.on('pong', () => { ws.alive = true; }); ws.alive = true;
        void sessions.attach(target, ws).catch(error => { ws.send(JSON.stringify({ error: error.message })); ws.close(); });
      });
    })().catch(() => { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); });
  });
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.alive || ws.expires < Date.now() || !logins.has(ws.owner)) { ws.terminate(); continue; }
      ws.alive = false; ws.ping();
    }
  }, 30000);
  heartbeat.unref();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  origin ||= 'http://' + (host.includes(':') ? '[' + host + ']' : host) + ':' + server.address().port;
  return {
    origin, server,
    async close() {
      clearInterval(heartbeat);
      for (const ws of wss.clients) ws.terminate();
      await sessions.closeAll();
      await new Promise(resolve => server.close(resolve));
    }
  };
}
