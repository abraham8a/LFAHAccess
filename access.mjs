import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const hash = code => createHash('sha256').update(code).digest('hex');
const validDate = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
  && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;

export function openAccess() {
  mkdirSync('private', { recursive: true, mode: 0o700 });
  const event = JSON.parse(readFileSync('private/evento.json', 'utf8'));
  return createAccess(event, new DatabaseSync('private/acceso.sqlite'));
}

export function createAccess(event, db, clock = () => new Date()) {
  if (typeof event.id !== 'string' || !/^[a-z0-9-]{1,80}$/.test(event.id)
    || typeof event.nombre !== 'string' || !event.nombre.trim()
    || typeof event.zona !== 'string' || !event.zona
    || !Array.isArray(event.fechas) || !event.fechas.length || !event.fechas.every(validDate)) {
    throw new Error('Configuración del evento inválida');
  }
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: event.zona, year: 'numeric', month: '2-digit', day: '2-digit'
  });
  db.exec(`
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS passes (
      digest TEXT PRIMARY KEY, event_id TEXT NOT NULL, event_name TEXT NOT NULL, days TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admissions (
      digest TEXT NOT NULL, day TEXT NOT NULL, PRIMARY KEY (digest, day)
    );
  `);
  const save = db.prepare('INSERT INTO passes VALUES (?, ?, ?, ?)');
  const find = db.prepare('SELECT * FROM passes WHERE digest = ?');
  const admit = db.prepare('INSERT INTO admissions VALUES (?, ?) ON CONFLICT DO NOTHING');

  return {
    event,
    issue(days) {
      if (!days.length || !days.every(day => event.fechas.includes(day))) {
        throw new Error('Indica una o más fechas permitidas por el evento');
      }
      const code = 'LFAH1.' + randomBytes(24).toString('base64url');
      save.run(hash(code), event.id, event.nombre, JSON.stringify(days));
      return code;
    },
    validate(code) {
      if (typeof code !== 'string' || !/^LFAH1\.[A-Za-z0-9_-]{32}$/.test(code)) return 'invalid';
      const digest = hash(code);
      const pass = find.get(digest);
      if (!pass) return 'invalid';
      if (pass.event_id !== event.id || pass.event_name !== event.nombre) return 'event';
      const parts = Object.fromEntries(formatter.formatToParts(clock()).map(({ type, value }) => [type, value]));
      const day = [parts.year, parts.month, parts.day].join('-');
      if (!event.fechas.includes(day) || !JSON.parse(pass.days).includes(day)) return 'date';
      return admit.run(digest, day).changes ? 'allowed' : 'used';
    }
  };
}
