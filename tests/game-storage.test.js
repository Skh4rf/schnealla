import test from 'node:test'
import assert from 'node:assert/strict'
import { createGameStorage, storageKey } from '../src/game-storage.js'

const game = {
  startPoints: 21,
  players: ['A', 'B', 'C'].map((name) => ({ name, points: 21 })),
  rounds: [],
}

function fixture(saved = null) {
  const entries = new Map(saved === null ? [] : [[storageKey, saved]])
  const calls = []
  const persistence = createGameStorage(() => {
    calls.push('access')
    return {
      getItem: (key) => entries.get(key) ?? null,
      setItem: (key, value) => entries.set(key, value),
      removeItem: (key) => entries.delete(key),
    }
  })
  return { persistence, entries, calls }
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
