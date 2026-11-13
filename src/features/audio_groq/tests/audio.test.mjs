import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pcmToWav, createAudioCapture, createHearing } from '../api/index.mjs';

const KEY = 'gsk_' + 'A'.repeat(48);

async function temporaryDir() {
  return mkdtemp(join(tmpdir(), 'zyner-audio-'));
}

class FakeChild extends EventEmitter {
  constructor() {
    super();
    this.stdout = new PassThrough();
    this.stderr = new PassThrough();
    this.exitCode = null;
    this.killed = false;
  }
  kill() { this.killed = true; this.exitCode = 0; }
}

function fakeAdb({ sdk = 34, port, onSpawn } = {}) {
  const runs = [];
  const spawns = [];
  const adb = {
    runs, spawns,
    endpoint: value => value,
    async run(args) {
      runs.push(args.join(' '));
      if (args.includes('getprop')) return String(sdk) + '\n';
      if (args.includes('forward') && args.includes('tcp:0')) return String(port) + '\n';
      return '';
    },
    spawn(args) {
      spawns.push(args.join(' '));
      const child = new FakeChild();
      onSpawn?.(child);
      return child;
    }
  };
  return adb;
}

function loudPcm(seconds) {
  const pcm = Buffer.alloc(48000 * 4 * seconds);
  for (let i = 0; i + 1 < pcm.length; i += 2) pcm.writeInt16LE(6000, i);
  return pcm;
}

test('pcmToWav produce WAV PCM16 mono 16 kHz con cabecera valida', () => {
  const { wav, silent } = pcmToWav(Buffer.alloc(19200));
  assert.equal(wav.length, 44 + 1600 * 2);
  assert.equal(wav.subarray(0, 4).toString(), 'RIFF');
  assert.equal(wav.readUInt32LE(4), wav.length - 8);
  assert.equal(wav.subarray(8, 12).toString(), 'WAVE');
  assert.equal(wav.subarray(12, 16).toString(), 'fmt ');
  assert.equal(wav.readUInt32LE(16), 16);
  assert.equal(wav.readUInt16LE(20), 1, 'formato PCM');
  assert.equal(wav.readUInt16LE(22), 1, 'mono');
  assert.equal(wav.readUInt32LE(24), 16000, '16 kHz');
  assert.equal(wav.readUInt32LE(28), 32000, 'byte rate coherente');
  assert.equal(wav.readUInt16LE(32), 2, 'block align');
  assert.equal(wav.readUInt16LE(34), 16, 'bits por muestra');
  assert.equal(wav.subarray(36, 40).toString(), 'data');
  assert.equal(wav.readUInt32LE(40), 1600 * 2);
  assert.equal(silent, true, 'silencio digital se detecta');
});

test('pcmToWav mezcla estereo 48 kHz a mono y reconoce audio audible', () => {
  const { wav, silent } = pcmToWav(loudPcm(1));
  assert.equal(silent, false);
  assert.equal(wav.readInt16LE(44), 6000, 'promedia los 6 enteros del grupo');
  assert.equal(wav.readUInt32LE(40), Math.floor(48000 * 4 / 12) * 2, '48 kHz estereo -> 16 kHz mono');
});

test('pcmToWav rechaza segmentos demasiado cortos', () => {
  assert.throws(() => pcmToWav(Buffer.alloc(19199)), /Audio demasiado corto/);
});

test('hearing sin clave queda deshabilitado y no contacta Groq', async () => {
  const dataDir = await temporaryDir();
  const previous = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  try {
    let called = false;
    const hearing = await createHearing({
      dataDir,
      capture: async () => { called = true; return { wav: Buffer.alloc(0), silent: false }; },
      request: async () => { called = true; return new Response('{}', { status: 200 }); }
    });
    assert.deepEqual(await hearing.status(), { configured: false, model: 'whisper-large-v3-turbo' });
    assert.deepEqual(await hearing.listen('1.2.3.4:5555'), { status: 'disabled', text: '' });
    assert.equal(called, false, 'no captura ni transcribe sin clave');
  } finally {
    if (previous !== undefined) process.env.GROQ_API_KEY = previous;
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('configure valida la clave, la guarda cerrada y nunca la devuelve', async () => {
  const dataDir = await temporaryDir();
  try {
    const hearing = await createHearing({ dataDir, capture: async () => ({ wav: Buffer.alloc(0), silent: true }) });
    for (const invalid of ['', 'abc', 'gsk_short', 'sk-' + 'A'.repeat(40), 'gsk_' + 'A'.repeat(400), 'gsk_con espacios', 42, null])
      await assert.rejects(() => hearing.configure(invalid), /Clave Groq no valida/, 'rechaza ' + String(invalid).slice(0, 12));

    const result = await hearing.configure(KEY);
    assert.deepEqual(result, { configured: true, model: 'whisper-large-v3-turbo' });
    const saved = join(dataDir, 'secrets', 'groq-api-key');
    assert.equal((await readFile(saved, 'utf8')).trim(), KEY, 'queda fuera del repositorio, en datos privados');
    if (process.platform !== 'win32')
      assert.equal((await stat(saved)).mode & 0o777, 0o600, 'archivo solo para el propietario');

    const status = await hearing.status();
    assert.equal(status.configured, true);
    assert.ok(!JSON.stringify(status).includes(KEY), 'status no filtra la clave');
  } finally { await rm(dataDir, { recursive: true, force: true }); }
});

test('listen transcribe, acota el texto y manda la clave solo en la cabecera', async () => {
  const dataDir = await temporaryDir();
  try {
    let seen;
    const hearing = await createHearing({
      dataDir,
      capture: async (endpoint, options) => ({ wav: Buffer.from('wav'), silent: false, endpoint, options }),
      request: async (url, options) => {
        seen = { url, options };
        return new Response(JSON.stringify({ text: '  habla de tecnologia  ', segments: [{ no_speech_prob: 0.01 }] }), { status: 200 });
      }
    });
    await hearing.configure(KEY);
    const result = await hearing.listen('1.2.3.4:5555', { seconds: 4 });
    assert.deepEqual(result, { status: 'ok', text: 'habla de tecnologia' });
    assert.equal(seen.url, 'https://api.groq.com/openai/v1/audio/transcriptions');
    assert.equal(seen.options.method, 'POST');
    assert.equal(seen.options.headers.Authorization, 'Bearer ' + KEY);
    assert.equal(seen.options.redirect, 'error', 'no sigue redirecciones con la clave');
    assert.equal(seen.options.body.get('model'), 'whisper-large-v3-turbo');
  } finally { await rm(dataDir, { recursive: true, force: true }); }
});

test('listen recorta transcripciones largas a 1000 caracteres', async () => {
  const dataDir = await temporaryDir();
  try {
    const hearing = await createHearing({
      dataDir,
      capture: async () => ({ wav: Buffer.from('wav'), silent: false }),
      request: async () => new Response(JSON.stringify({ text: 'x'.repeat(5000), segments: [] }), { status: 200 })
    });
    await hearing.configure(KEY);
    const result = await hearing.listen('1.2.3.4:5555');
    assert.equal(result.status, 'ok');
    assert.equal(result.text.length, 1000);
  } finally { await rm(dataDir, { recursive: true, force: true }); }
});

test('listen informa silencio por RMS y por no_speech_prob sin inventar texto', async () => {
  const dataDir = await temporaryDir();
  try {
    const mudo = await createHearing({
      dataDir,
      capture: async () => ({ wav: Buffer.from('wav'), silent: true }),
      request: async () => { throw new Error('no deberia transcribir un segmento mudo'); }
    });
    await mudo.configure(KEY);
    assert.deepEqual(await mudo.listen('1.2.3.4:5555'), { status: 'silent', text: '' });

    const sinVoz = await createHearing({
      dataDir,
      capture: async () => ({ wav: Buffer.from('wav'), silent: false }),
      request: async () => new Response(JSON.stringify({
        text: 'musica de fondo', segments: [{ no_speech_prob: 0.95 }, { no_speech_prob: 0.9 }]
      }), { status: 200 })
    });
    assert.deepEqual(await sinVoz.listen('1.2.3.4:5555'), { status: 'silent', text: '' });
  } finally { await rm(dataDir, { recursive: true, force: true }); }
});

test('listen degrada a error sin romper el bot cuando falla HTTP o la captura', async () => {
  const dataDir = await temporaryDir();
  try {
    const httpFail = await createHearing({
      dataDir,
      capture: async () => ({ wav: Buffer.from('wav'), silent: false }),
      request: async () => new Response('denegado', { status: 429 })
    });
    await httpFail.configure(KEY);
    const limited = await httpFail.listen('1.2.3.4:5555');
    assert.equal(limited.status, 'error');
    assert.equal(limited.text, '');
    assert.match(limited.error, /HTTP 429/);

    const captureFail = await createHearing({
      dataDir,
      capture: async () => { throw new Error('El dispositivo no permite capturar este audio.'); },
      request: async () => { throw new Error('no deberia llegar a Groq'); }
    });
    const broken = await captureFail.listen('1.2.3.4:5555');
    assert.equal(broken.status, 'error');
    assert.equal(broken.text, '');
    assert.match(broken.error, /solo imagen/);
  } finally { await rm(dataDir, { recursive: true, force: true }); }
});

test('listen abortado propaga parada en lugar de un error de audio', async () => {
  const dataDir = await temporaryDir();
  try {
    const hearing = await createHearing({
      dataDir,
      capture: async () => { throw new Error('abortado'); },
      request: async () => { throw new Error('no deberia llegar a Groq'); }
    });
    await hearing.configure(KEY);
    await assert.rejects(() => hearing.listen('1.2.3.4:5555', { signal: AbortSignal.abort() }), /Escucha detenida/);
  } finally { await rm(dataDir, { recursive: true, force: true }); }
});

test('capture usa tunel propio, solo audio de reproduccion y limpia todo al terminar', async () => {
  const pcm = loudPcm(2);
  const server = createServer(socket => { socket.end(pcm); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  let child;
  const adb = fakeAdb({ sdk: 34, port, onSpawn: value => { child = value; } });
  try {
    const capture = createAudioCapture({ adb, serverPath: 'motor/scrcpy-server' });
    const { wav, silent } = await capture('1.2.3.4:5555', { seconds: 2 });
    assert.equal(silent, false);
    assert.equal(wav.readUInt32LE(24), 16000);

    const spawned = adb.spawns.join(' | ');
    assert.match(spawned, /audio_source=playback/, 'SDK 34 captura reproduccion');
    assert.ok(!spawned.includes('audio_source=mic'), 'nunca usa microfono');
    assert.match(spawned, /video=false/);
    assert.match(spawned, /control=false/);
    const scid = spawned.match(/scid=([0-9a-f]{8})/)?.[1];
    assert.ok(scid, 'usa un scid propio');

    const runs = adb.runs.join(' | ');
    assert.match(runs, new RegExp('forward --remove tcp:' + port), 'retira su forward');
    assert.match(runs, /rm -f \/data\/local\/tmp\/zynerfilmer-audio-[0-9a-f]{8}\.jar/, 'borra su jar remoto');
    assert.equal(child.killed, true, 'termina su proceso scrcpy');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('capture usa output en Android 11-12 y rechaza Android 10 sin dejar restos', async () => {
  const server = createServer(socket => { socket.end(loudPcm(2)); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    const legacy = fakeAdb({ sdk: 31, port });
    await createAudioCapture({ adb: legacy, serverPath: 'motor/scrcpy-server' })('1.2.3.4:5555', { seconds: 2 });
    assert.match(legacy.spawns.join(' '), /audio_source=output/);

    const old = fakeAdb({ sdk: 29, port });
    await assert.rejects(
      () => createAudioCapture({ adb: old, serverPath: 'motor/scrcpy-server' })('1.2.3.4:5555', { seconds: 2 }),
      /Android 11 o posterior/
    );
    assert.equal(old.spawns.length, 0, 'no lanza scrcpy en Android 10');
    assert.ok(!old.runs.join(' ').includes('push'), 'no sube el servidor si no hay soporte');
    assert.ok(!old.runs.join(' ').includes('rm -f'), 'no borra lo que nunca subio');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('capture reintenta mientras el tunel acepta y cierra sin enviar audio', async () => {
  // adb forward acepta el TCP aunque scrcpy aun no haya creado su socket abstracto y
  // adbd lo cierra enseguida. Conectar no basta: hay que esperar el primer byte real.
  const pcm = loudPcm(2);
  let attempts = 0;
  const server = createServer(socket => {
    attempts++;
    if (attempts <= 2) return socket.destroy();
    socket.write(pcm.subarray(0, 1024));
    setTimeout(() => socket.end(pcm.subarray(1024)), 20);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const adb = fakeAdb({ sdk: 31, port: server.address().port });
    const capture = createAudioCapture({ adb, serverPath: 'motor/scrcpy-server' });
    const { wav, silent } = await capture('1.2.3.4:5555', { seconds: 2 });
    assert.equal(attempts, 3, 'descarta las conexiones que mueren sin datos');
    assert.equal(silent, false, 'no pierde el primer bloque recibido');
    assert.equal(wav.readUInt32LE(40), Math.floor(48000 * 4 * 2 / 12) * 2, 'junta el audio completo');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('capture valida la duracion y permite una sola escucha por movil', async () => {
  const idle = createServer(() => {});
  await new Promise(resolve => idle.listen(0, '127.0.0.1', resolve));
  const port = idle.address().port;
  try {
    const capture = createAudioCapture({ adb: fakeAdb({ port }), serverPath: 'motor/scrcpy-server' });
    for (const seconds of [1, 11, 2.5, '6', null])
      await assert.rejects(() => capture('1.2.3.4:5555', { seconds }), /Segmento de audio invalido/);

    const controller = new AbortController();
    const first = capture('1.2.3.4:5555', { seconds: 2, signal: controller.signal });
    await assert.rejects(() => capture('1.2.3.4:5555', { seconds: 2 }), /Ya se esta capturando audio/);
    await assert.doesNotReject(() => capture('5.6.7.8:5555', { seconds: 2, signal: AbortSignal.timeout(50) }).catch(() => {}));
    controller.abort();
    await first.catch(() => {});
    await assert.doesNotReject(async () => {
      const retry = capture('1.2.3.4:5555', { seconds: 2, signal: AbortSignal.timeout(50) });
      await retry.catch(() => {});
    }, 'la reserva del endpoint se libera al terminar');
  } finally {
    await new Promise(resolve => idle.close(resolve));
  }
});
