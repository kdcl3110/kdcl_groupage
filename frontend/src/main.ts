import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import { useThemeStore } from './stores/theme'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Applique le thème sauvegardé avant le premier rendu
useThemeStore()

app.use(router)
app.mount('#app')
