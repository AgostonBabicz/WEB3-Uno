import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { apollo } from './apollo'
import { DefaultApolloClient } from '@vue/apollo-composable'
import { useAuthStore } from '../store/authStore'
import { useServerGameStore } from '../store/serverGameStore'

const app = createApp(App)

app.provide(DefaultApolloClient, apollo)

app.use(createPinia())
app.use(router)
app.mount('#app')

function wipeAll() {
  try {
    sessionStorage.clear()
    localStorage.removeItem('UNO_USER')
    localStorage.removeItem('UNO_USERNAME')
  } catch {}

  try {
    const auth = useAuthStore()
    const game = useServerGameStore()
    auth.$reset()
    game.$reset()
  } catch {}

  try { apollo.clearStore?.() } catch {}
  try { apollo.stop?.() } catch {}
}

window.addEventListener('pagehide', wipeAll)      
window.addEventListener('beforeunload', wipeAll)  