import { resolve } from 'node:path';
import { createEquipmentStore } from '../src/features/equipos/api/index.mjs';
const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw new Error('Uso: node scripts/database-backup.mjs origen.sqlite destino.sqlite');
if (resolve(source) === resolve(destination)) throw new Error('Origen y destino deben ser diferentes.');
const { stat } = await import('node:fs/promises');
await stat(source);
const store = createEquipmentStore(resolve(source));
try { await store.backup(resolve(destination)); console.log('Backup SQLite creado.'); }
finally { await store.close(); }
