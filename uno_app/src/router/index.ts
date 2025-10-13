import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../../store/authStore'
import Game from '../views/Game.vue'
import GameHome from '../views/GameHome.vue'
import GameOver from '../views/GameOver.vue'
import GameServer from '../views/GameServer.vue'
import Auth from '../views/Auth.vue'
import Lobbies from '../views/Lobbies.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Auth',
      component: Auth,
    },
    {
      path: '/home',
      name: 'Home',
      component: GameHome,
    },
    {
      path: '/game',
      name: 'Game',
      component: Game,
      props: (route) => ({
        botNumber: Number(route.query.botNumber) || 1,
        playerName: route.query.playerName || 'You',
        cardsPerPlayer: Number(route.query.cardsPerPlayer) || 7,
        targetScore: Number(route.query.targetScore) || 500,
      }),
    },
    {
      path: '/lobbies',
      name: 'Lobbies',
      component: Lobbies,
    },
    {
      path: '/game-server',
      name: 'GameServer',
      component: GameServer,
      props: (route) => ({
        gameId: route.query.gameId || '',
      }),
    },
    {
      path: '/game-over',
      name: 'GameOver',
      component: GameOver,
      props: (route) => ({
        winner: route.query.winner || 'Unknown',
      }),
    },
  ],
})

export default router
