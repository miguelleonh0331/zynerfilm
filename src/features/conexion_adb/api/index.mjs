import { isIP } from 'node:net';
import { execFile, spawn } from 'node:child_process';
export function endpoint(value) {
  if (typeof value !== 'string') throw new Error('Direccion invalida.');
  const match = value.trim().match(/^(?:\[([^\]]+)\]|([^:]+)):(\d{1,5})$/);
  if (!match || !isIP(match[1] || match[2])) throw new Error('Introduce una IP valida y un puerto.');
  const port = Number(match[3]);
  if (port < 1 || port > 65535) throw new Error('Puerto fuera de rango.');
  const ip = match[1] || match[2];
  return (isIP(ip) === 6 ? '[' + ip + ']' : ip) + ':' + port;
}
export function parseDevices(text) {
  return text.split(/\r?\n/).map(line => line.trim().split(/\s+/)).filter(parts =>
    ['device', 'offline', 'unauthorized'].includes(parts[1])).map(parts => ({
      endpoint: parts[0], state: parts[1],
      model: (parts.find(p => p.startsWith('model:'))?.slice(6) || 'Android').replaceAll('_', ' ')
    }));
}
export function createAdb(executable) {
  function run(args, { signal, timeout = 15000, encoding = 'utf8' } = {}) {
    return new Promise((resolve, reject) => {
      execFile(executable, args, { shell: false, windowsHide: true, timeout, signal, encoding, maxBuffer: 8 * 1024 * 1024,
        env: { ...process.env, ANDROID_SERIAL: '' } }, (error, stdout, stderr) => {
        if (error) return reject(new Error(error.killed ? 'ADB agoto el tiempo de espera.' : 'Fallo ADB: ' + (String(stderr).trim().slice(0, 300) || error.message)));
        resolve(stdout);
      });
    });
  }
  return {
    endpoint, run,
    spawn(args) { return spawn(executable, args, { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); },
    async list() { return parseDevices(await run(['devices', '-l'])); },
    async connect(target) {
      target = endpoint(target);
      await run(['connect', target]);
      const found = (await this.list()).find(device => device.endpoint === target);
      if (found?.state !== 'device') throw new Error('Equipo offline o sin autorizar. Revisa la depuracion inalambrica.');
      return found;
    },
    async disconnect(target) { await run(['disconnect', endpoint(target)]); }
  };
}
