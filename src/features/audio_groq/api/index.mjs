import { createConnection } from 'node:net';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

export function pcmToWav(pcm) {
  // scrcpy raw: stereo PCM16 at 48kHz. Average 3 frames into mono PCM16 at 16kHz.
  const samples = Math.floor(pcm.length / 12);
  if (samples < 1600) throw new Error('Audio demasiado corto.');
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
  let squares = 0;
  for (let i = 0; i < samples; i++) {
    let value = 0;
    for (let j = 0; j < 6; j++) value += pcm.readInt16LE(i * 12 + j * 2);
    value = Math.round(value / 6);
    wav.writeInt16LE(value, 44 + i * 2); squares += value * value;
  }
  return { wav, silent: Math.sqrt(squares / samples) / 32768 < .002 };
}

export function createAudioCapture({ adb, serverPath }) {
  const active = new Set();
  return async function capture(endpoint, { seconds = 6, signal } = {}) {
    endpoint = adb.endpoint(endpoint);
    if (!Number.isInteger(seconds) || seconds < 2 || seconds > 10) throw new Error('Segmento de audio invalido.');
    if (active.has(endpoint)) throw new Error('Ya se esta capturando audio en este movil.');
    active.add(endpoint);
    const combined = AbortSignal.any([AbortSignal.timeout(25000), ...(signal ? [signal] : [])]);
    const id = (randomBytes(4).readUInt32BE() & 0x7fffffff).toString(16).padStart(8, '0');
    const remote = '/data/local/tmp/zynerfilmer-audio-' + id + '.jar';
    let port, child, socket, first, pushed = false;
    try {
      combined.throwIfAborted();
      const sdk = Number((await adb.run(['-s', endpoint, 'shell', 'getprop', 'ro.build.version.sdk'], { signal: combined })).trim());
      if (!Number.isInteger(sdk) || sdk < 30) throw new Error('Audio interno requiere Android 11 o posterior.');
      pushed = true;
      await adb.run(['-s', endpoint, 'push', serverPath, remote], { signal: combined });
      port = Number((await adb.run(['-s', endpoint, 'forward', 'tcp:0', 'localabstract:scrcpy_' + id], { signal: combined })).trim());
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('No se pudo crear tunel de audio.');
      child = adb.spawn(['-s', endpoint, 'shell', 'CLASSPATH=' + remote, 'app_process', '/',
        'com.genymobile.scrcpy.Server', '3.3.4', 'scid=' + id, 'log_level=error', 'tunnel_forward=true',
        'video=false', 'audio=true', 'control=false', 'audio_codec=raw', 'audio_source=' + (sdk >= 33 ? 'playback' : 'output'),
        'raw_stream=true', 'power_on=false', 'clipboard_autosync=false']);
      child.stdout.resume(); child.stderr.resume();
      let childFailed = false;
      child.on('error', () => { childFailed = true; socket?.destroy(); });
      child.on('exit', () => { childFailed = true; });
      for (let retry = 0; retry < 40 && !socket; retry++) {
        combined.throwIfAborted();
        if (childFailed) throw new Error('El dispositivo no pudo iniciar audio interno.');
        try {
          // adb forward acepta el TCP aunque el servidor aun no haya creado su socket
          // abstracto: adbd cierra la conexion a los pocos milisegundos. Conectar no prueba
          // nada; el tunel solo esta listo cuando llega el primer byte de audio real.
          ({ socket, first } = await new Promise((resolve, reject) => {
            const connection = createConnection({ host: '127.0.0.1', port, signal: combined });
            const clear = () => {
              connection.removeListener('error', onError);
              connection.removeListener('close', onClose);
              connection.removeListener('data', onData);
            };
            function onError(error) { clear(); connection.destroy(); reject(error); }
            function onClose() { onError(new Error('El tunel de audio aun no esta listo.')); }
            function onData(chunk) {
              clear(); connection.pause(); connection.on('error', () => {});
              resolve({ socket: connection, first: chunk });
            }
            connection.once('error', onError);
            connection.once('close', onClose);
            connection.on('data', onData);
          }));
        } catch { socket = undefined; await sleep(150, undefined, { signal: combined }); }
      }
      if (!socket) throw new Error('No responde el tunel de audio.');
      const length = 48000 * 4 * seconds;
      const pcm = await new Promise((resolve, reject) => {
        let size = 0; const chunks = [];
        const take = chunk => {
          const part = chunk.subarray(0, length - size); chunks.push(part); size += part.length;
          if (size < length) return false;
          socket.pause(); resolve(Buffer.concat(chunks, size)); return true;
        };
        if (take(first)) return;
        socket.on('data', take);
        socket.once('error', () => reject(new Error('Se interrumpio el audio interno.')));
        socket.once('close', () => reject(new Error('El dispositivo no permite capturar este audio.')));
        socket.resume();
      });
      return pcmToWav(pcm);
    } finally {
      socket?.destroy();
      if (child && child.exitCode === null) child.kill();
      if (port) await adb.run(['-s', endpoint, 'forward', '--remove', 'tcp:' + port]).catch(() => {});
      if (pushed) await adb.run(['-s', endpoint, 'shell', 'rm', '-f', remote]).catch(() => {});
      active.delete(endpoint);
    }
  };
}

export async function createHearing({ dataDir, capture, request = fetch }) {
  const secrets = join(dataDir, 'secrets');
  const keyPath = join(secrets, 'groq-api-key');
  const model = 'whisper-large-v3-turbo';
  async function key() {
    try { return (await readFile(keyPath, 'utf8')).trim(); }
    catch (error) { if (error.code !== 'ENOENT') throw new Error('No se pudo leer configuracion Groq.'); }
    return process.env.GROQ_API_KEY || '';
  }
  return {
    async status() { return { configured: Boolean(await key()), model }; },
    async configure(value) {
      if (typeof value !== 'string' || !/^gsk_[A-Za-z0-9]{20,200}$/.test(value)) throw new Error('Clave Groq no valida.');
      await mkdir(secrets, { recursive: true, mode: 0o700 });
      await writeFile(keyPath, value, { mode: 0o600 });
      return { configured: true, model };
    },
    async listen(endpoint, { signal, seconds = 6 } = {}) {
      const apiKey = await key();
      if (!apiKey) return { status: 'disabled', text: '' };
      try {
        const { wav, silent } = await capture(endpoint, { signal, seconds });
        if (silent) return { status: 'silent', text: '' };
        const form = new FormData();
        form.set('file', new Blob([wav], { type: 'audio/wav' }), 'segment.wav');
        form.set('model', model); form.set('response_format', 'verbose_json'); form.set('temperature', '0');
        const combined = AbortSignal.any([AbortSignal.timeout(20000), ...(signal ? [signal] : [])]);
        const response = await request('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST', headers: { Authorization: 'Bearer ' + apiKey }, body: form, signal: combined, redirect: 'error'
        });
        if (!response.ok) return { status: 'error', text: '', error: 'Groq no pudo transcribir (HTTP ' + response.status + ').' };
        const result = await response.json();
        const segments = result.segments || [];
        const noSpeech = segments.length && segments.every(s => Number(s.no_speech_prob) > .8);
        const text = !noSpeech && typeof result.text === 'string' ? result.text.trim().slice(0, 1000) : '';
        return { status: text ? 'ok' : 'silent', text };
      } catch {
        if (signal?.aborted) throw new Error('Escucha detenida.');
        return { status: 'error', text: '', error: 'No se pudo escuchar/transcribir el audio interno; se usara solo imagen.' };
      }
    }
  };
}
