import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { createAccess } from './access.mjs';

const event = { id: 'demo', nombre: 'Asamblea demo', zona: 'America/Chicago', fechas: ['2030-06-01', '2030-06-02'] };

function setup(t, time = '2030-06-02T04:59:59Z') {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  let now = new Date(time);
  const clock = () => now;
  return { db, clock, access: createAccess(event, db, clock), move: time => { now = new Date(time); } };
}

test('uses the event time zone and permits one entry per assigned day', t => {
  const { access, move } = setup(t);
  const code = access.issue(event.fechas);
  assert.equal(access.validate(code), 'allowed');
  assert.equal(access.validate(code), 'used');
  move('2030-06-02T05:00:00Z');
  assert.equal(access.validate(code), 'allowed');
  move('2030-06-03T05:00:00Z');
  assert.equal(access.validate(code), 'date');
});

test('rejects a valid pass on an unassigned event day', t => {
  const { access } = setup(t);
  assert.equal(access.validate(access.issue(['2030-06-02'])), 'date');
});

test('checks both the event identifier and assembly name', t => {
  const { db, clock, access } = setup(t);
  const code = access.issue(event.fechas);
  for (const change of [{ id: 'otro' }, { nombre: 'Otra asamblea' }]) {
    assert.equal(createAccess({ ...event, ...change }, db, clock).validate(code), 'event');
  }
  assert.equal(access.validate(code), 'allowed');
});

test('rejects forged, legacy and malformed codes', t => {
  const { access } = setup(t);
  for (const code of ['LFAH1.' + 'A'.repeat(32), '2030-06-01', null, 123]) {
    assert.equal(access.validate(code), 'invalid');
  }
});

test('validates configuration and issued dates', t => {
  const { db, access } = setup(t);
  assert.throws(() => createAccess({ ...event, fechas: ['2030-02-30'] }, db));
  assert.throws(() => createAccess({ ...event, zona: 'inexistente' }, db));
  assert.throws(() => access.issue([]));
  assert.throws(() => access.issue(['2030-06-03']));
});
