export const storageKey = 'schnealla.currentGame'

// Access browser storage only after the user enables saving or requests deletion.
export function createGameStorage(getStorage) {
  let enabled = false

  return {
    setEnabled(value) {
      enabled = value
    },
    load() {
      if (!enabled) return null
      const storage = getStorage()
      const saved = storage.getItem(storageKey)
      if (!saved) return null
      try {
        const game = JSON.parse(saved)
        if (
          game &&
          Array.isArray(game.players) &&
          game.players.length >= 3 && game.players.length <= 5 &&
          game.players.every((player) => typeof player.name === 'string' && Number.isFinite(player.points)) &&
          Array.isArray(game.rounds) &&
          Number.isInteger(game.startPoints) && game.startPoints > 0
        ) return game
      } catch {
        // A corrupt saved game must not prevent a new game from starting.
      }
      storage.removeItem(storageKey)
      return null
    },
    save(game) {
      if (!enabled) return
      const storage = getStorage()
      if (game) storage.setItem(storageKey, JSON.stringify(game))
      else storage.removeItem(storageKey)
    },
    clear() {
      enabled = false
      getStorage().removeItem(storageKey)
    },
  }
}
