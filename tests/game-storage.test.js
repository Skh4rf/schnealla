import test from 'node:test'
import assert from 'node:assert/strict'
import { createGameStorage, storageKey, preferenceKey } from '../src/game-storage.js'

const game = {
  startPoints: 21,
  players: ['A', 'B', 'C'].map((name) => ({ name, points: 21 })),
  rounds: [],
}

function fixture(saved = null, preference = null) {
  const entries = new Map(saved === null ? [] : [[storageKey, saved]])
  if (preference !== null) entries.set(preferenceKey, preference)
  const calls = []
  const reads = []
  const getStorage = () => {
    calls.push('access')
    return {
      getItem: (key) => { reads.push(key); return entries.get(key) ?? null },
      setItem: (key, value) => entries.set(key, value),
      removeItem: (key) => entries.delete(key),
    }
  }
  const persistence = createGameStorage(getStorage)
  return { persistence, entries, calls, reads, getStorage }
}

test('no storage access on load or score changes without opt-in, including existing games', () => {
  const { persistence, calls, entries } = fixture(JSON.stringify(game))
  assert.equal(persistence.load(), null)
  persistence.save(game)
  persistence.save(null)
  assert.deepEqual(calls, [])
  assert.equal(entries.get(storageKey), JSON.stringify(game))
})

test('explicit opt-in restores existing games and saves changes', () => {
  const { persistence, entries } = fixture(JSON.stringify(game))
  persistence.setEnabled(true)
  assert.deepEqual(persistence.load(), game)
  const changed = { ...game, startPoints: 25 }
  persistence.save(changed)
  assert.deepEqual(JSON.parse(entries.get(storageKey)), changed)
})

test('withdrawal deletes saved data and prevents later reads and writes', () => {
  const { persistence, calls, entries } = fixture(JSON.stringify(game))
  persistence.setEnabled(true)
  persistence.clear()
  const callsAfterDeletion = calls.length
  persistence.save(game)
  assert.equal(persistence.load(), null)
  assert.equal(calls.length, callsAfterDeletion)
  assert.equal(entries.has(storageKey), false)
})

test('old saved games can be deleted without opting in first', () => {
  const { persistence, entries } = fixture(JSON.stringify(game))
  persistence.clear()
  assert.equal(entries.has(storageKey), false)
})

test('starting a new game removes the old saved game only when saving is enabled', () => {
  const { persistence, entries } = fixture(JSON.stringify(game))
  persistence.setEnabled(true)
  persistence.save(null)
  assert.equal(entries.has(storageKey), false)
})

test('malformed or incompatible saved games are discarded after opt-in', () => {
  for (const saved of ['{broken', 'null', '{}', '{"players":[],"rounds":[]}']) {
    const { persistence, entries } = fixture(saved)
    persistence.setEnabled(true)
    assert.equal(persistence.load(), null)
    assert.equal(entries.has(storageKey), false)
  }
})

test('blocked storage is not touched before opt-in and errors can be handled by the UI', () => {
  const persistence = createGameStorage(() => { throw new Error('Storage blocked') })
  persistence.save(game)
  assert.equal(persistence.load(), null)
  persistence.setEnabled(true)
  assert.throws(() => persistence.load(), /Storage blocked/)
  persistence.setEnabled(false)
  persistence.save(game)
})

test('first visit reads only the preference, never a legacy saved game', () => {
  const { persistence, reads } = fixture(JSON.stringify(game))
  assert.equal(persistence.restorePreference(), null)
  assert.equal(persistence.load(), null)
  assert.deepEqual(reads, [preferenceKey])
})

test('acceptance is remembered and a new visit can automatically restore the game', () => {
  const { persistence, getStorage } = fixture()
  persistence.rememberPreference(true)
  persistence.save(game)
  const nextVisit = createGameStorage(getStorage)
  assert.equal(nextVisit.restorePreference(), true)
  assert.deepEqual(nextVisit.load(), game)
})

test('rejection is remembered on future visits without reading or writing game data', () => {
  const { persistence, getStorage, reads, entries } = fixture(JSON.stringify(game))
  persistence.clear()
  const nextVisit = createGameStorage(getStorage)
  assert.equal(nextVisit.restorePreference(), false)
  assert.equal(nextVisit.load(), null)
  nextVisit.save(game)
  assert.deepEqual(reads, [preferenceKey])
  assert.equal(entries.has(storageKey), false)
})

test('withdrawal replaces an existing grant and stops saving across visits', () => {
  const { persistence, getStorage, entries } = fixture(JSON.stringify(game), 'granted-v1')
  assert.equal(persistence.restorePreference(), true)
  persistence.clear()
  const nextVisit = createGameStorage(getStorage)
  assert.equal(nextVisit.restorePreference(), false)
  nextVisit.save(game)
  assert.equal(entries.has(storageKey), false)
})

test('unknown consent values require a new decision and do not restore a game', () => {
  for (const preference of ['true', 'granted-v0', '{}', '']) {
    const { persistence, reads } = fixture(JSON.stringify(game), preference)
    assert.equal(persistence.restorePreference(), null)
    assert.equal(persistence.load(), null)
    assert.deepEqual(reads, [preferenceKey])
  }
})

test('a failed preference write never enables game storage', () => {
  const persistence = createGameStorage(() => ({
    setItem() { throw new Error('Storage full') },
    getItem() { throw new Error('Game must not be read') },
  }))
  assert.throws(() => persistence.rememberPreference(true), /Storage full/)
  assert.equal(persistence.load(), null)
  persistence.save(game)
})
