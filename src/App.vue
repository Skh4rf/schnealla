<script setup>
import { computed, onMounted, ref, watch } from 'vue'
  //TODOS: Mischelzähler (achtung dann müssen hübsch runden beachtete werden)
  // Neue Runde also mit animation natürlich wenn jemand gewinnt
  // ab 3 punkten kein aussetzen mehr möglich
  // Nach rundenende graph like Civ 6
  // zurück knopf um zum vorherigen punktestand zu kommen
  // evtl. sogar das man auf einen wert klicken kann und dann ändern
const storageKey = 'schnealla.currentGame'
const startPointOptions = [15, 21, 25]

const players = ref(['', '', ''])
const selectedStartPoints = ref(21)
const customStartPoints = ref('')
const currentGame = ref(null)
const justStarted = ref(false)
const roundEntries = ref([])
const activeView = computed(() => (currentGame.value ? 'game' : 'setup'))

const CHART_COLORS = ['#70d69f', '#f3c96f', '#f3b0a7', '#89c4f4', '#c4a0f5']
const CW = 360
const CH = 150
const PL = 32
const PR = 12
const PT = 10
const PB = 22

const chartData = computed(() => {
  if (!currentGame.value || currentGame.value.rounds.length === 0) return null

  const chronoRounds = [...currentGame.value.rounds].reverse()
  const maxPts = currentGame.value.startPoints
  const total = chronoRounds.length + 1

  const iW = CW - PL - PR
  const iH = CH - PT - PB
  const xS = (i) => PL + (i / (total - 1)) * iW
  const yS = (p) => PT + (1 - p / maxPts) * iH

  const players = currentGame.value.players.map((player, pi) => {
    const vals = [maxPts]
    for (const round of chronoRounds) {
      const ch = round.changes.find((c) => c.name === player.name)
      vals.push(ch?.pointsAfter ?? vals[vals.length - 1])
    }
    return {
      name: player.name,
      color: CHART_COLORS[pi % CHART_COLORS.length],
      polyline: vals.map((p, i) => `${xS(i)},${yS(p)}`).join(' '),
      lastDot: { cx: xS(vals.length - 1), cy: yS(vals[vals.length - 1]) },
    }
  })

  const tickStep = maxPts <= 10 ? 2 : maxPts <= 25 ? 5 : 10
  const yTicks = []
  for (let v = 0; v <= maxPts; v += tickStep) {
    yTicks.push({ y: yS(v), label: v })
  }

  const xStep = total <= 8 ? 1 : total <= 16 ? 2 : Math.ceil(total / 8)
  const xTicks = []
  for (let i = 0; i < total; i += xStep) {
    xTicks.push({ x: xS(i), label: i })
  }

  return { players, yTicks, xTicks }
})

const tableRounds = computed(() => {
  if (!currentGame.value) {
    return []
  }

  return [...currentGame.value.rounds].reverse()
})

const normalizedPlayers = computed(() =>
  players.value
    .map((name) => name.trim())
    .filter((name) => name.length > 0),
)

const startPoints = computed(() => {
  if (selectedStartPoints.value === 'custom') {
    return Number(customStartPoints.value)
  }

  return selectedStartPoints.value
})

const duplicateNames = computed(() => {
  const names = normalizedPlayers.value.map((name) => name.toLowerCase())
  return names.some((name, index) => names.indexOf(name) !== index)
})

const canStartGame = computed(
  () =>
    normalizedPlayers.value.length >= 3 &&
    normalizedPlayers.value.length <= 5 &&
    !duplicateNames.value &&
    Number.isInteger(startPoints.value) &&
    startPoints.value > 0,
)

const validationMessage = computed(() => {
  if (normalizedPlayers.value.length < 3) {
    return 'Mindestens 3 Spieler eingeben.'
  }

  if (duplicateNames.value) {
    return 'Spielernamen muessen eindeutig sein.'
  }

  if (!Number.isInteger(startPoints.value) || startPoints.value <= 0) {
    return 'Startpunkte muessen eine ganze Zahl groesser 0 sein.'
  }

  return 'Bereit fuer die erste Runde.'
})

function addPlayer() {
  if (players.value.length < 5) {
    players.value.push('')
  }
}

function removePlayer(index) {
  if (players.value.length > 3) {
    players.value.splice(index, 1)
  }
}

function startGame() {
  if (!canStartGame.value) {
    return
  }

  currentGame.value = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    startPoints: startPoints.value,
    players: normalizedPlayers.value.map((name) => ({
      name,
      points: startPoints.value,
      roundsWon: 0,
      timesSchnellt: 0,
    })),
    rounds: [],
  }

  resetRoundEntries()
  justStarted.value = true
  window.setTimeout(() => {
    justStarted.value = false
  }, 2500)
}

function resetSetup() {
  players.value = ['', '', '']
  selectedStartPoints.value = 21
  customStartPoints.value = ''
  currentGame.value = null
  roundEntries.value = []
}

function resetRoundEntries() {
  if (!currentGame.value) {
    roundEntries.value = []
    return
  }

  roundEntries.value = currentGame.value.players.map((player) => ({
    name: player.name,
    delta: 0,
    satOut: false,
  }))
}

function entryDelta(entry) {
  return Number(entry.delta) || 0
}

function increaseEntry(entry) {
  entry.satOut = false
  entry.delta = entry.delta < 0 ? entry.delta + 1 : entry.delta + 5
}

function decreaseEntry(entry) {
  entry.satOut = false
  entry.delta = entry.delta > 0 ? Math.max(0, entry.delta - 5) : entry.delta - 1
}

function toggleSatOut(entry) {
  if (!entry.satOut && satOutStreak(entry.name) >= 2) {
    return
  }

  entry.satOut = !entry.satOut
  entry.delta = 0
}

function satOutStreak(playerName) {
  if (!currentGame.value) {
    return 0
  }

  let streak = 0

  for (const round of currentGame.value.rounds) {
    const change = round.changes.find((item) => item.name === playerName)

    if (change?.satOut || change?.mode === 'satOut') {
      streak += 1
      continue
    }

    break
  }

  return streak
}

function changeForRound(round, playerName) {
  return round.changes.find((change) => change.name === playerName)
}

function pointAfterRound(round, playerName) {
  const change = changeForRound(round, playerName)
  const player = currentGame.value?.players.find((item) => item.name === playerName)

  return change?.pointsAfter ?? player?.points ?? 0
}

function applyRound() {
  if (!currentGame.value) {
    return
  }

  const changes = roundEntries.value.map((entry) => ({
    name: entry.name,
    satOut: entry.satOut,
    delta: entryDelta(entry),
  }))

  currentGame.value.players = currentGame.value.players.map((player) => {
    const change = changes.find((item) => item.name === player.name)
    const delta = change?.delta || 0

    return {
      ...player,
      points: Math.max(0, player.points + delta),
      roundsWon: player.roundsWon + (delta < 0 ? 1 : 0),
      timesSchnellt:
        player.timesSchnellt + (delta >= 5 ? 1 : 0),
    }
  })

  const changesWithScores = changes.map((change) => ({
    ...change,
    pointsAfter:
      currentGame.value.players.find((player) => player.name === change.name)
        ?.points ?? 0,
  }))

  currentGame.value.rounds.unshift({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    changes: changesWithScores,
  })

  resetRoundEntries()
}

onMounted(() => {
  const savedGame = localStorage.getItem(storageKey)

  if (savedGame) {
    currentGame.value = JSON.parse(savedGame)
    resetRoundEntries()
  }
})

watch(
  currentGame,
  (game) => {
    if (game) {
      localStorage.setItem(storageKey, JSON.stringify(game))
      return
    }

    localStorage.removeItem(storageKey)
  },
  { deep: true },
)
</script>

<template>
  <main class="app-shell">
    <section
      v-if="activeView === 'setup'"
      class="setup-stage"
      aria-labelledby="page-title"
    >
      <div class="setup-heading">
        <p class="eyebrow">Schneallzellar3000</p>
        <h1 id="page-title">Schnealla</h1>
        <div class="card-fan" aria-hidden="true">
          <div class="play-card eichel">
            <span class="rank">A</span>
            <span class="suit-pips">
              <i></i>
              <i></i>
              <i></i>
            </span>
            <small>Eichel</small>
          </div>
          <div class="play-card laab">
            <span class="rank">A</span>
            <span class="suit-pips">
              <i></i>
              <i></i>
              <i></i>
            </span>
            <small>Laab</small>
          </div>
          <div class="play-card herz">
            <span class="rank">A</span>
            <span class="suit-pips">
              <i></i>
              <i></i>
              <i></i>
            </span>
            <small>Herz</small>
          </div>
          <div class="play-card schell">
            <span class="rank">A</span>
            <span class="suit-pips">
              <i></i>
              <i></i>
              <i></i>
            </span>
            <small>Schell</small>
          </div>
        </div>
      </div>

      <form class="setup-form" @submit.prevent="startGame">
        <fieldset class="field-group">
          <legend>
            <span>Spieler</span>
            <small>{{ normalizedPlayers.length }}/5</small>
          </legend>

          <div class="player-list">
            <label
              v-for="(_, index) in players"
              :key="index"
              class="player-row"
            >
              <span class="sr-only">Spieler {{ index + 1 }}</span>
              <input
                v-model="players[index]"
                :autocomplete="`player-${index + 1}`"
                :placeholder="`Spieler ${index + 1}`"
                type="text"
              />
              <button
                v-if="players.length > 3"
                class="icon-button"
                type="button"
                title="Spieler entfernen"
                aria-label="Spieler entfernen"
                @click="removePlayer(index)"
              >
                x
              </button>
            </label>
          </div>

          <button
            class="secondary-button"
            :disabled="players.length >= 5"
            type="button"
            @click="addPlayer"
            title="Spieler hinzufuegen"
            aria-label="Spieler hinzufuegen"
          >
            +
          </button>
        </fieldset>

        <fieldset class="field-group">
          <legend>
            <span>Startpunkte</span>
            <small>{{ startPoints || '-' }}</small>
          </legend>

          <div class="point-options" role="radiogroup" aria-label="Startpunkte">
            <label v-for="option in startPointOptions" :key="option">
              <input
                v-model="selectedStartPoints"
                :value="option"
                type="radio"
                name="start-points"
              />
              <span>{{ option }}</span>
            </label>
            <label>
              <input
                v-model="selectedStartPoints"
                value="custom"
                type="radio"
                name="start-points"
              />
              <span>Eigene</span>
            </label>
          </div>

          <label
            v-if="selectedStartPoints === 'custom'"
            class="custom-points"
          >
            <span>Punkte</span>
            <input
              v-model.number="customStartPoints"
              min="1"
              step="1"
              type="number"
              inputmode="numeric"
            />
          </label>
        </fieldset>

        <div class="form-footer">
          <p
            class="status-text"
            :class="{ ready: canStartGame }"
            aria-live="polite"
          >
            {{ validationMessage }}
          </p>
          <button class="primary-button" :disabled="!canStartGame" type="submit">
            Spiel starten
          </button>
        </div>
      </form>

      <aside
        v-if="currentGame"
        class="game-preview"
        :class="{ saved: justStarted }"
        aria-label="Aktuelles Spiel"
      >
        <div>
          <p class="eyebrow">Lokal gespeichert</p>
          <h2>Aktuelles Spiel</h2>
        </div>

        <ol class="score-list">
          <li v-for="player in currentGame.players" :key="player.name">
            <span>{{ player.name }}</span>
            <strong>{{ player.points }}</strong>
          </li>
        </ol>

        <button class="secondary-button" type="button" @click="resetSetup">
          Neues Setup
        </button>
      </aside>
    </section>

    <section v-else class="game-stage" aria-labelledby="game-title">
      <header class="game-header">
        <button class="back-button" type="button" @click="resetSetup">
          Neues Spiel
        </button>
        <div>
          <p class="eyebrow">Runde zaehlen</p>
          <h1 id="game-title">Runde</h1>
        </div>
      </header>

      <section class="round-table-wrap" aria-label="Punktetabelle">
        <table class="round-table">
          <thead>
            <tr>
              <th>Runde</th>
              <th v-for="player in currentGame.players" :key="player.name">
                {{ player.name }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!tableRounds.length">
              <td>0</td>
              <td v-for="player in currentGame.players" :key="player.name">
                <strong>{{ player.points }}</strong>
                <small>Start</small>
              </td>
            </tr>
            <tr v-for="(round, index) in tableRounds" :key="round.id">
              <td>{{ index + 1 }}</td>
              <td v-for="player in currentGame.players" :key="player.name">
                <strong>{{ pointAfterRound(round, player.name) }}</strong>
                <small
                  :class="{
                    positive: (changeForRound(round, player.name)?.delta ?? 0) > 0,
                    negative: (changeForRound(round, player.name)?.delta ?? 0) < 0,
                  }"
                >
                  <template v-if="changeForRound(round, player.name)?.satOut">
                    ausg.
                  </template>
                  <template v-else>
                    {{
                      (changeForRound(round, player.name)?.delta ?? 0) > 0
                        ? '+'
                        : ''
                    }}{{ changeForRound(round, player.name)?.delta ?? 0 }}
                  </template>
                </small>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-if="chartData" class="chart-wrap" aria-label="Punkteverlauf">
        <p class="eyebrow">Punkteverlauf</p>
        <svg
          class="chart-svg"
          :viewBox="`0 0 ${CW} ${CH}`"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <line
            v-for="tick in chartData.yTicks"
            :key="tick.label"
            :x1="PL"
            :y1="tick.y"
            :x2="CW - PR"
            :y2="tick.y"
            class="chart-grid"
          />
          <text
            v-for="tick in chartData.yTicks"
            :key="`yl-${tick.label}`"
            :x="PL - 5"
            :y="tick.y + 4"
            class="chart-axis-label"
            text-anchor="end"
          >{{ tick.label }}</text>
          <text
            v-for="tick in chartData.xTicks"
            :key="`xl-${tick.label}`"
            :x="tick.x"
            :y="CH - 4"
            class="chart-axis-label"
            text-anchor="middle"
          >{{ tick.label }}</text>
          <polyline
            v-for="player in chartData.players"
            :key="player.name"
            :points="player.polyline"
            :stroke="player.color"
            class="chart-line"
            fill="none"
          />
          <circle
            v-for="player in chartData.players"
            :key="`dot-${player.name}`"
            :cx="player.lastDot.cx"
            :cy="player.lastDot.cy"
            r="4"
            :fill="player.color"
          />
        </svg>
        <div class="chart-legend">
          <span
            v-for="player in chartData.players"
            :key="player.name"
            class="chart-legend-item"
          >
            <i :style="{ background: player.color }"></i>
            {{ player.name }}
          </span>
        </div>
      </section>

      <form class="round-form" @submit.prevent="applyRound">
        <fieldset class="field-group">
          <legend>
            <span>Neue Runde</span>
            <small>{{ currentGame.rounds.length }}</small>
          </legend>

          <div class="round-list">
            <article
              v-for="entry in roundEntries"
              :key="entry.name"
              class="round-player"
            >
              <div class="round-player-head">
                <h2>{{ entry.name }}</h2>
                <strong
                  :class="{
                    positive: entryDelta(entry) > 0,
                    negative: entryDelta(entry) < 0,
                  }"
                >
                  <template v-if="entry.satOut">ausgesetzt</template>
                  <template v-else>
                    {{ entryDelta(entry) > 0 ? '+' : '' }}{{ entryDelta(entry) }}
                  </template>
                </strong>
              </div>

              <div class="round-controls">
                <button
                  class="sat-out-button"
                  :class="{ active: entry.satOut }"
                  :disabled="!entry.satOut && satOutStreak(entry.name) >= 2"
                  type="button"
                  @click="toggleSatOut(entry)"
                >
                  Ausgesetzt
                </button>
                <button
                  class="step-button"
                  type="button"
                  aria-label="Punkte verringern"
                  @click="decreaseEntry(entry)"
                >
                  -
                </button>
                <span
                  class="round-delta"
                  :class="{
                    positive: entryDelta(entry) > 0,
                    negative: entryDelta(entry) < 0,
                  }"
                >
                  {{ entryDelta(entry) > 0 ? '+' : '' }}{{ entryDelta(entry) }}
                </span>
                <button
                  class="step-button"
                  type="button"
                  aria-label="Punkte erhoehen"
                  @click="increaseEntry(entry)"
                >
                  +
                </button>
              </div>
            </article>
          </div>
        </fieldset>

        <button class="primary-button" type="submit">Runde uebernehmen</button>
      </form>
    </section>
  </main>
</template>
