import { randomBytes } from 'node:crypto';
import { createConnection } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

// Pinned to scrcpy 3.3.4: the wire protocol changes between versions.
export class VideoParser {
  constructor(onMetadata, onPacket) {
    this.buffer = Buffer.alloc(0); this.header = false;
    this.onMetadata = onMetadata; this.onPacket = onPacket;
  }
  feed(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    if (!this.header && this.buffer.length >= 76) {
      const header = this.buffer.subarray(0, 76);
      if (header.toString('ascii', 64, 68) !== 'h264') throw new Error('Codec scrcpy inesperado.');
      if (header.readUInt32BE(68) < 1 || header.readUInt32BE(72) < 1 || header.readUInt32BE(68) > 8192 || header.readUInt32BE(72) > 8192) throw new Error('Dimensiones de video invalidas.');
      this.onMetadata({ name: header.subarray(0, 64).toString('utf8').replace(/\0.*$/s, ''),
        width: header.readUInt32BE(68), height: header.readUInt32BE(72) });
      this.buffer = this.buffer.subarray(76); this.header = true;
    }
    while (this.header && this.buffer.length >= 12) {
      const size = this.buffer.readUInt32BE(8);
      if (size > 8 * 1024 * 1024) throw new Error('Paquete de video demasiado grande.');
      if (this.buffer.length < 12 + size) break;
      this.onPacket(this.buffer.subarray(0, 12 + size));
      this.buffer = this.buffer.subarray(12 + size);
    }
    if (this.buffer.length > 9 * 1024 * 1024) throw new Error('Limite del buffer de video.');
  }
}
export function controlMessage(message) {
  if (!message || typeof message !== 'object') throw new Error('Control invalido.');
  if (message.type === 'touch') {
    const { action, x, y, width, height } = message;
    if (![0, 1, 2].includes(action) || ![x, y, width, height].every(Number.isInteger) ||
      width < 1 || height < 1 || width > 8192 || height > 8192 || x < 0 || y < 0 || x >= width || y >= height)
      throw new Error('Coordenadas invalidas.');
    const buffer = Buffer.alloc(32);
    buffer[0] = 2; buffer[1] = action;
    buffer.writeBigUInt64BE(0xffffffffffffffffn, 2);
    buffer.writeUInt32BE(x, 10); buffer.writeUInt32BE(y, 14);
    buffer.writeUInt16BE(width, 18); buffer.writeUInt16BE(height, 20);
    buffer.writeUInt16BE(action === 1 ? 0 : 0xffff, 22);
    buffer.writeUInt32BE(action === 2 ? 0 : 1, 24); buffer.writeUInt32BE(action === 1 ? 0 : 1, 28);
    return buffer;
  }
  if (message.type === 'key') {
    const codes = { back: 4, home: 3, apps: 187, enter: 66, backspace: 67, wake: 224, left: 21, right: 22, up: 19, down: 20 };
    const key = Object.hasOwn(codes, message.key) ? codes[message.key] : undefined;
    if (key === undefined) throw new Error('Tecla no permitida.');
    const down = Buffer.alloc(14); down[0] = 0; down.writeUInt32BE(key, 2);
    const up = Buffer.from(down); up[1] = 1;
    return Buffer.concat([down, up]);
  }
  if (message.type === 'text') {
    if (typeof message.text !== 'string') throw new Error('Texto invalido.');
    const data = Buffer.from(message.text);
    if (!data.length || data.length > 300 || message.text.includes('\0')) throw new Error('Texto: maximo 300 bytes UTF-8.');
    const header = Buffer.alloc(5); header[0] = 1; header.writeUInt32BE(data.length, 1);
    return Buffer.concat([header, data]);
  }
  throw new Error('Control no permitido.');
}
async function videoConnection(port, signal) {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt++) {
    signal.throwIfAborted();
    try {
      return await new Promise((resolve, reject) => {
        const socket = createConnection({ host: '127.0.0.1', port });
        const abort = () => socket.destroy(new Error('Sesion cancelada.'));
        signal.addEventListener('abort', abort, { once: true });
        const timer = setTimeout(() => socket.destroy(new Error('Sin respuesta del tunel ADB.')), 1000);
        const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); };
        socket.once('error', error => { cleanup(); reject(error); });
        socket.once('data', first => {
          cleanup();
          if (first[0] !== 0) { socket.destroy(); reject(new Error('Respuesta scrcpy invalida.')); return; }
          socket.pause();
          if (first.length > 1) socket.unshift(first.subarray(1));
          resolve(socket);
        });
        socket.once('close', () => { cleanup(); reject(new Error('Tunel aun no disponible.')); });
      });
    } catch (error) { lastError = error; await delay(150, undefined, { signal }); }
  }
  throw lastError;
}
export function createSessions({ adb, serverPath, canControl = () => true }) {
  const active = new Map();
  async function attach(target, ws) {
    target = adb.endpoint(target);
    if (active.has(target)) throw new Error('Este equipo ya tiene una sesion abierta.');
    const controller = new AbortController();
    let finishSetup;
    const setupDone = new Promise(resolve => { finishSetup = resolve; });
    const state = { ws, controller, closing: null };
    active.set(target, state);
    const scid = (randomBytes(4).readUInt32BE() & 0x7fffffff).toString(16).padStart(8, '0');
    const remote = '/data/local/tmp/zynerfilmer-' + scid + '.jar';
    async function close() {
      if (state.closing) return state.closing;
      state.closing = (async () => {
        controller.abort(); state.video?.destroy(); state.control?.destroy();
        await setupDone;
        state.video?.destroy(); state.control?.destroy();
        if (state.child && state.child.exitCode === null) state.child.kill();
        if (state.port) await adb.run(['-s', target, 'forward', '--remove', 'tcp:' + state.port]).catch(() => {});
        if (state.pushed) await adb.run(['-s', target, 'shell', 'rm', '-f', remote]).catch(() => {});
        if (active.get(target) === state) active.delete(target);
        if (ws.readyState === 1) ws.close();
      })();
      return state.closing;
    }
    state.close = close;
    ws.once('close', () => { void close(); });
    ws.on('error', () => { void close(); });
    try {
      await adb.connect(target);
      controller.signal.throwIfAborted();
      state.pushed = true;
      await adb.run(['-s', target, 'push', serverPath, remote]);
      controller.signal.throwIfAborted();
      const port = Number((await adb.run(['-s', target, 'forward', 'tcp:0', 'localabstract:scrcpy_' + scid],
        {})).trim());
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('ADB no asigno un puerto de tunel.');
      state.port = port; controller.signal.throwIfAborted();
      state.child = adb.spawn(['-s', target, 'shell', 'CLASSPATH=' + remote, 'app_process', '/',
        'com.genymobile.scrcpy.Server', '3.3.4', 'scid=' + scid, 'log_level=warn', 'tunnel_forward=true',
        'audio=false', 'control=true', 'video_codec=h264', 'max_size=1280', 'max_fps=30',
        'video_bit_rate=8000000', 'clipboard_autosync=false', 'power_on=false']);
      let serverError = '';
      state.child.stdout.on('data', () => {});
      state.child.stderr.on('data', chunk => { serverError = (serverError + chunk.toString()).slice(-1500); });
      state.child.once('error', error => { if (ws.readyState === 1) ws.send(JSON.stringify({ error: error.message })); void close(); });
      state.child.once('exit', () => {
        if (!controller.signal.aborted && ws.readyState === 1) ws.send(JSON.stringify({ error: serverError || 'El servidor scrcpy termino.' }));
        void close();
      });
      state.video = await videoConnection(port, controller.signal);
      controller.signal.throwIfAborted();
      state.control = createConnection({ host: '127.0.0.1', port });
      state.control.on('error', () => { void close(); });
      state.control.on('data', () => {});
      const parser = new VideoParser(metadata => ws.send(JSON.stringify({ metadata })), packet => {
        if (ws.readyState !== 1) return;
        if (ws.bufferedAmount > 4 * 1024 * 1024) { ws.close(1013, 'Conexion lenta; vuelve a abrir.'); return; }
        ws.send(packet, { binary: true });
      });
      state.video.on('data', chunk => {
        try { parser.feed(chunk); } catch (error) { if (ws.readyState === 1) ws.send(JSON.stringify({ error: error.message })); void close(); }
      });
      state.video.on('error', () => { void close(); });
      state.video.on('end', () => { void close(); });
      ws.on('message', (raw, binary) => {
        try {
          if (!canControl(target)) throw new Error('Deten el bot para controlar manualmente este equipo.');
          if (binary || raw.length > 4096) throw new Error('Mensaje de control invalido.');
          if (!state.control || state.control.destroyed) throw new Error('Control no disponible.');
          if (state.control.writableLength > 65536) throw new Error('Demasiados eventos pendientes.');
          state.control.write(controlMessage(JSON.parse(raw.toString())));
        } catch (error) { if (ws.readyState === 1) ws.send(JSON.stringify({ error: error.message })); }
      });
      state.video.resume(); finishSetup();
    } catch (error) {
      finishSetup();
      if (ws.readyState === 1) ws.send(JSON.stringify({ error: controller.signal.aborted ? 'Sesion cerrada.' : error.message }));
      await close();
    }
  }
  return {
    attach, has: target => active.has(target),
    async close(target) { await active.get(target)?.close(); },
    async closeAll() { await Promise.all([...active.values()].map(state => state.close())); }
  };
}
