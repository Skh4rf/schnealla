// Reordering is allowed before the first round and keeps the current dealer.
export function moveGamePlayer(game, entries, fromIndex, direction) {
  if (!game || game.rounds.length > 0) return null
  const toIndex = fromIndex + direction
  if (
    !Number.isInteger(fromIndex) ||
    ![-1, 1].includes(direction) ||
    fromIndex < 0 || fromIndex >= game.players.length ||
    toIndex < 0 || toIndex >= game.players.length
  ) return null

  const dealerName = game.players[game.dealerIndex ?? 0]?.name
  const reorderedPlayers = [...game.players]
  const [player] = reorderedPlayers.splice(fromIndex, 1)
  reorderedPlayers.splice(toIndex, 0, player)

  return {
    game: {
      ...game,
      players: reorderedPlayers,
      dealerIndex: Math.max(0, reorderedPlayers.findIndex((item) => item.name === dealerName)),
    },
    entries: reorderedPlayers.map((item) => entries.find((entry) => entry.name === item.name)),
  }
}
