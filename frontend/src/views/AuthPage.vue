<template>
  <div class="auth">
    <!-- Showcase -->
    <aside class="show">
      <div class="brand">
        <svg width="24" height="24" viewBox="0 0 20 20"><rect x="1" y="1" width="18" height="18" rx="5" fill="var(--accent)"/><path d="M6 6.5h8M6 10h8M6 13.5h5" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>
        Note Your Mind
      </div>
      <div class="show-copy">
        <h1>Capture ideas.<br/>Move them forward.</h1>
        <p>Rich notes, checklists and a board to track what’s next — all in one quiet place.</p>
      </div>
      <div class="mini-board" aria-hidden="true">
        <div v-for="c in demo" :key="c.t" class="mini-col">
          <div class="mini-head"><span class="mini-dot" :style="{ background: c.color }"></span>{{ c.t }}</div>
          <div v-for="(w, i) in c.cards" :key="i" class="mini-card">
            <span class="mini-line" :style="{ width: w + '%' }"></span>
            <span class="mini-line mini-line--2" :style="{ width: (w - 25) + '%' }"></span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Form -->
    <main class="panel">
      <div class="form-wrap">
        <div class="brand brand--mobile">
          <svg width="22" height="22" viewBox="0 0 20 20"><rect x="1" y="1" width="18" height="18" rx="5" fill="var(--accent)"/><path d="M6 6.5h8M6 10h8M6 13.5h5" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>
          Note Your Mind
        </div>

        <!-- Sign in / Sign up -->
        <template v-if="mode !== 'forgot'">
          <h2 class="title">{{ mode === 'signin' ? 'Welcome back' : 'Create your account' }}</h2>
          <p class="sub">{{ mode === 'signin' ? 'Sign in to continue to your notes.' : 'Start organising your thoughts in seconds.' }}</p>

          <div class="tabs" role="tablist">
            <button role="tab" :aria-selected="mode === 'signin'" :class="{ on: mode === 'signin' }" @click="switchMode('signin')">Sign in</button>
            <button role="tab" :aria-selected="mode === 'signup'" :class="{ on: mode === 'signup' }" @click="switchMode('signup')">Sign up</button>
          </div>

          <form class="form" @submit.prevent="mode === 'signin' ? signIn() : signUp()" novalidate>
            <div v-if="error" class="alert alert--err" role="alert">{{ error }}</div>
            <div v-else-if="info" class="alert alert--ok" role="status">{{ info }}</div>

            <label v-if="mode === 'signup'" class="field">
              <span>Email</span>
              <input v-model.trim="f.email" class="input" type="email" autocomplete="email" placeholder="you@example.com" required />
            </label>
            <label class="field">
              <span>{{ mode === 'signin' ? 'Username or email' : 'Username' }}</span>
              <input v-model.trim="f.username" class="input" type="text" autocomplete="username" :placeholder="mode === 'signin' ? 'yourname' : 'Choose a username'" required />
            </label>
            <label class="field">
              <span class="field-row">
                Password
                <button v-if="mode === 'signin'" type="button" class="link" @click="switchMode('forgot')">Forgot password?</button>
              </span>
              <div class="pw">
                <input v-model="f.password" class="input" :type="showPw ? 'text' : 'password'"
                  :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'"
                  :placeholder="mode === 'signin' ? '••••••••' : 'At least 6 characters'" required />
                <button type="button" class="pw-toggle" @click="showPw = !showPw">{{ showPw ? 'Hide' : 'Show' }}</button>
              </div>
            </label>
            <label v-if="mode === 'signup'" class="field">
              <span>Confirm password</span>
              <input v-model="f.confirm" class="input" :type="showPw ? 'text' : 'password'" autocomplete="new-password" placeholder="Repeat password" required />
            </label>

            <button class="btn btn-primary submit" type="submit" :disabled="busy">
              <span v-if="busy" class="spin"></span>
              {{ mode === 'signin' ? 'Sign in' : 'Create account' }}
            </button>
          </form>
        </template>

        <!-- Forgot password -->
        <template v-else>
          <button class="back" @click="switchMode('signin')">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L5 8l5 5"/></svg>
            Back to sign in
          </button>
          <h2 class="title">Reset your password</h2>
          <p class="sub">{{ codeSent ? `Enter the 6-digit code we sent to ${f.email}.` : 'We’ll email you a 6-digit verification code.' }}</p>

          <form class="form" @submit.prevent="codeSent ? resetPassword() : sendCode()" novalidate>
            <div v-if="error" class="alert alert--err" role="alert">{{ error }}</div>
            <div v-if="info" class="alert alert--ok" role="status">{{ info }}</div>

            <label class="field">
              <span>Email</span>
              <input v-model.trim="f.email" class="input" type="email" autocomplete="email" placeholder="you@example.com" :disabled="codeSent" required />
            </label>
            <template v-if="codeSent">
              <label class="field">
                <span class="field-row">
                  Verification code
                  <button type="button" class="link" :disabled="busy" @click="sendCode">Resend</button>
                </span>
                <input v-model.trim="f.code" class="input code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000" />
              </label>
              <label class="field">
                <span>New password</span>
                <input v-model="f.password" class="input" type="password" autocomplete="new-password" placeholder="At least 6 characters" />
              </label>
              <label class="field">
                <span>Confirm new password</span>
                <input v-model="f.confirm" class="input" type="password" autocomplete="new-password" placeholder="Repeat password" />
              </label>
            </template>

            <button class="btn btn-primary submit" type="submit" :disabled="busy">
              <span v-if="busy" class="spin"></span>
              {{ codeSent ? 'Reset password' : 'Send code' }}
            </button>
          </form>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { api, errorMessage } from '../api'

const emit = defineEmits(['login'])

const mode = ref('signin')
const f = reactive({ email: '', username: '', password: '', confirm: '', code: '' })
const showPw = ref(false)
const busy = ref(false)
const error = ref('')
const info = ref('')
const codeSent = ref(false)

const demo = [
  { t: 'To do', color: 'var(--st-todo)', cards: [80, 65] },
  { t: 'In progress', color: 'var(--st-doing)', cards: [72] },
  { t: 'Done', color: 'var(--st-done)', cards: [85, 60, 70] },
]

function switchMode(m) {
  mode.value = m
  error.value = ''
  info.value = ''
  codeSent.value = false
  f.password = ''
  f.confirm = ''
  f.code = ''
}

async function run(fn) {
  error.value = ''
  info.value = ''
  busy.value = true
  try { await fn() } catch (err) { error.value = errorMessage(err) } finally { busy.value = false }
}

const signIn = () => run(async () => {
  if (!f.username || !f.password) { error.value = 'Enter your username and password.'; return }
  const { data } = await api.post('/api/auth/signin', { username: f.username, password: f.password })
  emit('login', data.data)
})

const signUp = () => run(async () => {
  if (!f.email || !f.username || !f.password || !f.confirm) { error.value = 'Please fill in every field.'; return }
  if (f.password.length < 6) { error.value = 'Password must be at least 6 characters.'; return }
  if (f.password !== f.confirm) { error.value = 'Passwords do not match.'; return }
  const { data } = await api.post('/api/auth/signup/email', {
    email: f.email, username: f.username, password: f.password, confirmPassword: f.confirm,
  })
  emit('login', data.data)
})

const sendCode = () => run(async () => {
  if (!f.email) { error.value = 'Enter the email on your account.'; return }
  await api.post('/api/auth/forgot-password/send', { target: f.email })
  codeSent.value = true
  info.value = 'Code sent — check your inbox (and spam folder).'
})

const resetPassword = () => run(async () => {
  if (!/^\d{6}$/.test(f.code)) { error.value = 'Enter the 6-digit code.'; return }
  if (f.password.length < 6) { error.value = 'Password must be at least 6 characters.'; return }
  if (f.password !== f.confirm) { error.value = 'Passwords do not match.'; return }
  await api.post('/api/auth/forgot-password/verify', {
    target: f.email, code: f.code, newPassword: f.password, confirmPassword: f.confirm,
  })
  switchMode('signin')
  f.username = f.email
  info.value = 'Password updated. Sign in with your new password.'
})
</script>

<style scoped>
.auth { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); min-height: 100vh; min-height: 100dvh; }

.show {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; padding: 36px 48px;
  background: var(--bg-sidebar); border-right: 1px solid var(--border);
}
.show::before {
  content: ''; position: absolute; inset: -40% -20% auto auto; width: 520px; height: 520px; border-radius: 50%;
  background: radial-gradient(circle, var(--accent-bg), transparent 65%); pointer-events: none;
}
.brand { display: flex; align-items: center; gap: 10px; font-weight: 650; font-size: 15px; letter-spacing: -0.01em; }
.brand--mobile { display: none; margin-bottom: 28px; }
.show-copy { margin-top: auto; position: relative; }
.show-copy h1 { margin: 0 0 12px; font-size: 38px; line-height: 1.12; font-weight: 700; letter-spacing: -0.025em; }
.show-copy p { margin: 0; color: var(--text-2); font-size: 15px; max-width: 400px; }
.mini-board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 36px 0 auto; max-width: 520px; position: relative; }
.mini-col { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 7px; }
.mini-head { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; color: var(--text-2); margin-bottom: 2px; }
.mini-dot { width: 7px; height: 7px; border-radius: 50%; }
.mini-card { background: var(--bg-elev); border: 1px solid var(--border); border-radius: 7px; padding: 9px; display: flex; flex-direction: column; gap: 6px; }
.mini-line { height: 6px; border-radius: 3px; background: var(--border-strong); }
.mini-line--2 { background: var(--border); }

.panel { display: grid; place-items: center; padding: 32px 16px; }
.form-wrap { width: 100%; max-width: 380px; }
.title { margin: 0; font-size: 24px; font-weight: 650; letter-spacing: -0.02em; }
.sub { margin: 6px 0 22px; color: var(--text-2); }

.tabs { display: grid; grid-template-columns: 1fr 1fr; padding: 3px; gap: 3px; background: var(--bg-sidebar); border: 1px solid var(--border); border-radius: 9px; margin-bottom: 20px; }
.tabs button { height: 30px; border: 0; border-radius: 7px; background: none; color: var(--text-2); font-weight: 500; font-size: 13px; }
.tabs button.on { background: var(--bg-elev); color: var(--text); box-shadow: var(--shadow-sm), 0 0 0 1px var(--border); }

.form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: var(--text-2); }
.field-row { display: flex; align-items: center; justify-content: space-between; }
.link { border: 0; background: none; padding: 0; color: var(--accent); font-size: 12.5px; font-weight: 500; }
.link:hover { text-decoration: underline; }
.pw { position: relative; }
.pw .input { padding-right: 58px; }
.pw-toggle { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); height: 26px; padding: 0 8px; border: 0; border-radius: 5px; background: none; color: var(--text-3); font-size: 12px; }
.pw-toggle:hover { color: var(--text); background: var(--bg-hover); }
.code { letter-spacing: .4em; font-variant-numeric: tabular-nums; }
.submit { height: 38px; margin-top: 6px; font-size: 14px; }
.alert { padding: 9px 12px; border-radius: 8px; font-size: 13px; }
.alert--err { background: var(--danger-bg); color: var(--danger); }
.alert--ok { background: var(--accent-bg); color: var(--accent); }
.back { display: inline-flex; align-items: center; gap: 6px; border: 0; background: none; padding: 0; margin-bottom: 18px; color: var(--text-2); font-size: 13px; }
.back:hover { color: var(--text); }
.spin { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 860px) {
  .auth { grid-template-columns: 1fr; }
  .show { display: none; }
  .brand--mobile { display: flex; }
  .panel { place-items: start center; padding-top: 12vh; }
}
</style>
