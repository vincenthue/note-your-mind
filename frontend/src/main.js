import { createApp, ref, h } from 'vue'
import './styles.css'
import AuthPage from './views/AuthPage.vue'
import MainApp from './App.vue'
import { api, setAuthToken } from './api'

const SESSION_KEY = 'nym_session'

function readSession() {
  try {
    localStorage.removeItem('auth_user') // old, token-less login from the previous version
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    return s?.token ? s : null
  } catch { return null }
}

// Apply saved theme before first paint of either page
try {
  document.documentElement.setAttribute('data-theme', localStorage.getItem('notes_theme') === 'light' ? 'light' : 'dark')
} catch { /* ignore */ }

const RootShell = {
  setup() {
    const user = ref(readSession())

    function clear() {
      try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
      setAuthToken(null)
      user.value = null
    }
    function onLogin(data) {
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)) } catch { /* ignore */ }
      setAuthToken(data.token, clear)
      user.value = data
    }
    function onLogout() {
      const token = user.value?.token
      if (token) api.post('/api/auth/signout', null, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
      clear()
    }

    if (user.value) setAuthToken(user.value.token, clear)

    return () => user.value
      ? h(MainApp, { user: user.value, onLogout })
      : h(AuthPage, { onLogin })
  },
}

createApp(RootShell).mount('#app')
