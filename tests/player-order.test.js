import test from 'node:test'
import assert from 'node:assert/strict'
import { moveGamePlayer } from '../src/player-order.js'
import { createGameStorage } from '../src/game-storage.js'

function fixture(count = 3) {
  const players = ['A', 'B', 'C', 'D', 'E'].slice(0, count).map((name) => ({
    name, points: 21, roundsWon: 0, timesSchnellt: 0,
  }))
  return {
    game: { id: 'game', startPoints: 21, players, dealerIndex: 0, rounds: [] },
    entries: players.map(({ name }, index) => ({ name, delta: index === 1 ? -2 : 0, satOut: index === 2 })),
  }
}

test('moving the current dealer preserves their identity and pending entries', () => {
  const { game, entries } = fixture()
  const moved = moveGamePlayer(game, entries, 0, 1)
  assert.deepEqual(moved.game.players.map(({ name }) => name), ['B', 'A', 'C'])
  assert.equal(moved.game.players[moved.game.dealerIndex].name, 'A')
  assert.deepEqual(moved.entries.map(({ name }) => name), ['B', 'A', 'C'])
  assert.equal(moved.entries[0], entries[1])
  assert.equal(moved.entries[0].delta, -2)
  assert.equal(moved.entries[2].satOut, true)
  assert.deepEqual(game.players.map(({ name }) => name), ['A', 'B', 'C'])
})

test('dealer rotation follows the corrected order for three to five players', () => {
  for (const count of [3, 4, 5]) {
    const { game, entries } = fixture(count)
    const moved = moveGamePlayer(game, entries, 2, -1)
    assert.equal(moved.game.players[moved.game.dealerIndex].name, 'A')
    const nextIndex = (moved.game.dealerIndex + 1) % count
    assert.equal(moved.game.players[nextIndex].name, 'C')
    const previousIndex = (moved.game.dealerIndex + count - 1) % count
    assert.equal(moved.game.players[(previousIndex + 1) % count].name, 'A')
  }
})

test('selecting another first dealer survives subsequent reordering', () => {
  const { game, entries } = fixture()
  game.dealerIndex = 2
  const moved = moveGamePlayer(game, entries, 2, -1)
  assert.equal(moved.game.players[moved.game.dealerIndex].name, 'C')
  assert.equal(moved.game.players[(moved.game.dealerIndex + 1) % 3].name, 'B')
})

test('out-of-range moves and reordering after the first round are ignored', () => {
  const { game, entries } = fixture()
  for (const [index, direction] of [[0, -1], [2, 1], [-1, 1], [3, -1], [0, 2]]) {
    assert.equal(moveGamePlayer(game, entries, index, direction), null)
  }
  game.rounds.push({ id: 'round' })
  assert.equal(moveGamePlayer(game, entries, 1, -1), null)
})

test('legacy games without a dealer index retain the first dealer when reordered', () => {
  const { game, entries } = fixture()
  delete game.dealerIndex
  const moved = moveGamePlayer(game, entries, 1, -1)
  assert.equal(moved.game.players[moved.game.dealerIndex].name, 'A')
})

test('the corrected order and selected dealer survive saving and reloading', () => {
  const { game, entries } = fixture(5)
  const moved = moveGamePlayer(game, entries, 0, 1)
  const data = new Map()
  const storage = () => ({
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  })
  const saving = createGameStorage(storage)
  saving.rememberPreference(true)
  saving.save(moved.game)
  const nextVisit = createGameStorage(storage)
  assert.equal(nextVisit.restorePreference(), true)
  assert.deepEqual(nextVisit.load(), moved.game)
})
