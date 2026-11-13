import { DatabaseSync, backup as sqliteBackup } from 'node:sqlite';
import { mkdir, readFile, open, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';

export function createEquipmentStore(path, { legacyPath, validateEndpoint = value => value } = {}) {
  let database;
  let initialization;
  let closed = false;
  const migration = 'legacy-json-v1';
  async function initialize() {
    if (closed) throw new Error('La base de equipos esta cerrada.');
    if (!initialization) initialization = (async () => {
      await mkdir(dirname(path), { recursive: true });
      const db = new DatabaseSync(path, { timeout: 5000 });
      try {
        const version = db.prepare('PRAGMA user_version').get().user_version;
        if (version > 1) throw new Error('Version de base de datos no compatible.');
        db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
        db.exec([
          'BEGIN IMMEDIATE;',
          "CREATE TABLE IF NOT EXISTS devices (id INTEGER PRIMARY KEY, endpoint TEXT NOT NULL UNIQUE, model TEXT NOT NULL DEFAULT 'Android', created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));",
          "CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);",
          'PRAGMA user_version=1;',
          'COMMIT;'
        ].join('\n'));
        if (!db.prepare('SELECT name FROM migrations WHERE name=?').get(migration)) {
          let entries = [];
          if (legacyPath) {
            let text;
            try { text = await readFile(legacyPath, 'utf8'); }
            catch (error) { if (error.code !== 'ENOENT') throw error; }
            if (text !== undefined) {
              try { entries = JSON.parse(text.replace(/^\uFEFF/, '')); }
              catch { throw new Error('Catalogo JSON invalido; migracion cancelada sin modificar el original.'); }
              if (!Array.isArray(entries) || entries.some(value => typeof value !== 'string' || !value.trim() || value.length > 200))
                throw new Error('Catalogo invalido; migracion cancelada sin modificar el original.');
            }
          }
          entries = entries.map(validateEndpoint);
          db.exec('BEGIN IMMEDIATE');
          try {
            if (!db.prepare('SELECT name FROM migrations WHERE name=?').get(migration)) {
              const insert = db.prepare('INSERT OR IGNORE INTO devices(endpoint) VALUES (?)');
              for (const entry of entries) insert.run(entry);
              db.prepare('INSERT INTO migrations(name) VALUES (?)').run(migration);
            }
            db.exec('COMMIT');
          } catch (error) { db.exec('ROLLBACK'); throw error; }
        }
        database = db;
      } catch (error) { db.close(); throw error; }
    })();
    await initialization;
    return database;
  }
  function validate(target, model) {
    if (typeof target !== 'string' || !target.trim() || target.length > 200) throw new Error('Equipo invalido.');
    if (typeof model !== 'string' || !model.trim() || model.length > 120) throw new Error('Modelo invalido.');
  }
  return {
    async list() {
      const db = await initialize();
      return db.prepare('SELECT endpoint FROM devices ORDER BY id').all().map(row => row.endpoint);
    },
    async all() {
      const db = await initialize();
      return db.prepare('SELECT id,endpoint,model,created_at,updated_at FROM devices ORDER BY id').all().map(row => ({
        id: row.id, endpoint: row.endpoint, model: row.model, createdAt: row.created_at, updatedAt: row.updated_at
      }));
    },
    async add(target, model = 'Android') {
      validate(target, model);
      const db = await initialize();
      db.prepare("INSERT INTO devices(endpoint,model) VALUES (?,?) ON CONFLICT(endpoint) DO UPDATE SET model=excluded.model, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')").run(target, model);
    },
    async remove(target) {
      validate(target, 'Android');
      const db = await initialize();
      return db.prepare('DELETE FROM devices WHERE endpoint=?').run(target).changes > 0;
    },
    async backup(destination) {
      const db = await initialize();
      const reserved = await open(destination, 'wx', 0o600);
      await reserved.close();
      try { await sqliteBackup(db, destination); }
      catch (error) { await unlink(destination).catch(() => {}); throw error; }
    },
    async close() {
      if (closed) return;
      if (initialization) { await initialization.catch(() => {}); database?.close(); }
      closed = true;
    }
  };
}
