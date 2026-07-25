// src/main.js
import { createApp, ref, h } from 'vue'
import AuthPage from './views/AuthPage.vue'
import MainApp  from './App.vue'

const RootShell = {
  setup() {
    const user = ref(JSON.parse(localStorage.getItem('auth_user') || 'null'))

    function onLogin(userData) {
      localStorage.setItem('auth_user', JSON.stringify(userData))
      user.value = userData
    }
    function onLogout() {
      localStorage.removeItem('auth_user')
      user.value = null
    }

    return () => user.value
      ? h(MainApp,  { user: user.value, onLogout })
      : h(AuthPage, { onLogin })
  },
}

createApp(RootShell).mount('#app')