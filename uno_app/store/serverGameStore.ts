import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apollo } from '../src/apollo'
import {
  CREATE_GAME,
  GET_GAME,
  ADD_PLAYER,
  START_ROUND,
  HAND,
  PLAYABLE,
  PLAY_CARD,
  DRAW_CARD,
  SAY_UNO,
  ACCUSE_UNO,
  SUB_UPDATES,
  SUB_EVENTS,
  WAITING_GAMES,
} from '../src/graphql/ops'
import { Color } from '@uno/shared/model/deck'
import router from '../src/router'
import { useAuthStore } from './authStore'

type Opts = {
  meName: string
  targetScore?: number
  cardsPerPlayer?: number
}

export const useServerGameStore = defineStore('serverGame', () => {
  const auth = useAuthStore()
  const gameId = ref<string | null>(null)
  const meIndex = ref<number | null>(null)
  const game = ref<any | null>(null)
  const myHand = ref<any[]>([])
  const playable = ref<number[]>([])
  const navigatedGameOver = ref(false)
  const showPopUpMessage = ref<boolean | null>(null)
  const popUpMessage = ref<string | null>(null)
  const popUpTitle = ref<string | null>(null)

  function setMessage(title: string, msg: string) {
    console.log("MESSAGE")
    popUpTitle.value = title
    popUpMessage.value = msg
    showPopUpMessage.value = true
  }
  function clearMessage() {
    showPopUpMessage.value = null
    popUpMessage.value = null
    popUpTitle.value = null
  }

  let updatesSub: { unsubscribe: () => void } | null = null
  let eventsSub: { unsubscribe: () => void } | null = null

  async function createLobby(opts: Opts) {
    const { data } = await apollo.mutate({
      mutation: CREATE_GAME,
      variables: {
        input: {
          players: [opts.meName],
          targetScore: opts.targetScore ?? 500,
          cardsPerPlayer: opts.cardsPerPlayer ?? 7,
          userId: auth.id,
        },
      },
    })
    const g = data?.createGame?.game
    if (!g) throw new Error('createGame failed')

    gameId.value = g.id
    meIndex.value = 0
    game.value = g
    navigatedGameOver.value = false

 setTimeout(async () => {
    await subscribeAll()
  }, 5 * 1000) 
  }

  async function joinLobby(id: string, myName: string) {
    const { data: q } = await apollo.query({
      query: GET_GAME,
      variables: { gameId: id },
      fetchPolicy: 'no-cache',
    })
    if (!q?.game) throw new Error('Game not found')

    const currentPlayers = q.game.players.length
    if (currentPlayers >= 4) throw new Error('Lobby full')

    const { data } = await apollo.mutate({
      mutation: ADD_PLAYER,
      variables: { gameId: id, name: myName, userId: auth.id },
    })
    const g = data?.addPlayer
    if (!g) throw new Error('addPlayer failed')

    gameId.value = g.id
    meIndex.value = currentPlayers
    game.value = g

    await subscribeAll()
  }

  const waitingGames = ref<any[]>([])

  async function loadWaitingGames() {
    try {
      const { data } = await apollo.query({ query: WAITING_GAMES, fetchPolicy: 'no-cache' })
      waitingGames.value = data?.waitingGames ?? []
    } catch {
      waitingGames.value = []
    }
  }

  async function startRound() {
    if (!gameId.value) return
    const { data: gq } = await apollo.query({
      query: GET_GAME,
      variables: { gameId: gameId.value },
      fetchPolicy: 'no-cache',
    })
    if (gq?.game) game.value = gq.game

    const { data, errors } = await apollo.mutate({
      mutation: START_ROUND,
      variables: { input: { gameId: gameId.value, userId: auth.id } },
    })

    if (errors?.length) {
      console.warn('startRound error:', errors)
      throw new Error(errors[0].message || 'startRound failed')
    }

    if (data?.startRound) {
      game.value = data.startRound
      await refreshMyHand()
      await subscribeAll()
    }
  }

  async function refreshMyHand() {
    if (gameId.value == null || meIndex.value == null) return
    const [h, p] = await Promise.all([
      apollo.query({
        query: HAND,
        variables: { gameId: gameId.value, playerIndex: meIndex.value },
        fetchPolicy: 'no-cache',
      }),
      apollo.query({
        query: PLAYABLE,
        variables: { gameId: gameId.value, playerIndex: meIndex.value },
        fetchPolicy: 'no-cache',
      }),
    ])
    myHand.value = h.data?.hand ?? []
    playable.value = p.data?.playableIndexes ?? []
  }

  async function playCard(cardIndex: number, askedColor?: Color) {
    if (!gameId.value || meIndex.value == null) return
    await apollo.mutate({
      mutation: PLAY_CARD,
      variables: {
        input: {
          gameId: gameId.value,
          playerIndex: meIndex.value,
          cardIndex,
          askedColor,
          userId: auth.id,
        },
      },
    })
    await refreshMyHand()
  }

  async function draw() {
    if (!gameId.value || meIndex.value == null) return
    await apollo.mutate({
      mutation: DRAW_CARD,
      variables: {
        input: {
          gameId: gameId.value,
          playerIndex: meIndex.value,
          userId: auth.id,
        },
      },
    })
    await refreshMyHand()
  }

  async function sayUno() {
    if (!gameId.value || meIndex.value == null) return
    await apollo.mutate({
      mutation: SAY_UNO,
      variables: {
        input: {
          gameId: gameId.value,
          playerIndex: meIndex.value,
          userId: auth.id,
        },
      },
    })
  }

  async function accuse(accusedIndex: number) {
    if (!gameId.value || meIndex.value == null) return
    await apollo.mutate({
      mutation: ACCUSE_UNO,
      variables: {
        input: {
          gameId: gameId.value,
          accuserIndex: meIndex.value,
          accusedIndex,
          userId: auth.id,
        },
      },
    })
  }

  function goGameOverIfDone(g: any) {
    if (!g) return
    if (navigatedGameOver.value) return
    const winnerIx = g.winnerIndex
    if (winnerIx == null) return
    const winnerName = g.players?.[winnerIx]?.name ?? 'Unknown'
    navigatedGameOver.value = true
    router.push({ name: 'GameOver', query: { winner: winnerName } })
  }

  // --------- Subscriptions ----------

  async function subscribeAll() {
    console.log("SUBSCRIBE ALL", gameId.value, updatesSub, eventsSub)
    if (!gameId.value) return
    updatesSub?.unsubscribe()
    eventsSub?.unsubscribe()

    updatesSub = apollo
      .subscribe({ query: SUB_UPDATES, variables: { gameId: gameId.value } })
      .subscribe({
        next: async ({ data }: any) => {
          const g = data?.gameUpdates
          if (g) {
            game.value = g
            goGameOverIfDone(g)
            await refreshMyHand()
          }
        },
        error: () => { },
      })

    eventsSub = apollo
      .subscribe({ query: SUB_EVENTS, variables: { gameId: gameId.value } })
      .subscribe({
        next: ({ data }: any) => {
          const ev = data?.gameEvents
          if (!ev) return
          if (ev.__typename === 'GameEnded') {
            const winnerIx = ev.winnerIndex
            const winnerName = game.value?.players?.[winnerIx]?.name ?? 'Unknown'
            if (!navigatedGameOver.value) {
              navigatedGameOver.value = true
              router.push({ name: 'GameOver', query: { winner: winnerName } })
            }
          }
          if (ev.__typename === 'Notice') {
            setMessage(ev.title, ev.message)
          }
        },
        error: () => { },
      })
  }

  const playerInTurn = computed(() => game.value?.currentRound?.playerInTurnIndex ?? null)
  const hasEnded = computed(() => !!game.value?.currentRound?.hasEnded)
  const isMyTurn = computed(
    () =>
      meIndex.value != null && playerInTurn.value === meIndex.value && !!game.value?.currentRound,
  )

  const playersCount = computed(() => game.value?.players?.length ?? 0)
  const canStartRound = computed(() => playersCount.value >= 2 && !game.value?.currentRound)

  function canPlayAt(ix: number) {
    return playable.value.includes(ix)
  }

  return {
    // state
    gameId,
    meIndex,
    game,
    myHand,
    playable,

    // actions
    createLobby,
    joinLobby,
    loadWaitingGames,
    startRound,
    playCard,
    draw,
    sayUno,
    accuse,
    refreshMyHand,

    // subscriptions
    subscribeAll,

    // computed
    waitingGames,
    playerInTurn,
    hasEnded,
    isMyTurn,
    playersCount,
    canStartRound,
    canPlayAt,
    // pop up message
    setMessage,
    clearMessage,
    popUpTitle,
    popUpMessage,
    showPopUpMessage
  }
})
