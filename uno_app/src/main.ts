import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { apollo } from './apollo'
import { DefaultApolloClient } from '@vue/apollo-composable'

const app = createApp(App)

app.provide(DefaultApolloClient, apollo)

app.use(createPinia())
app.use(router)
app.mount('#app')
