<template>
  <div class="auth-root">
    <div class="auth-card">

      <!-- LEFT white area: Sign Up form -->
      <div class="form-side form-side--left">
        <div class="form-inner" v-show="page === 'signup' || page === 'forgot'">
          <Transition name="content-fade">
          <div v-if="contentVisible && (page === 'signup' || page === 'forgot')">

          <template v-if="page === 'signup'">
            <h2 class="form-title">Create Account</h2>

            <form @submit.prevent="handleSignup" class="auth-form" novalidate>
              <div class="form-err" v-if="error">{{ error }}</div>
              <div class="field" v-if="signupMethod === 'phone'">
                <label>Phone Number</label>
                <input v-model="form.phone" type="tel" placeholder="+60 12-345 6789"/>
              </div>
              <div class="field" v-else>
                <label>Email Address</label>
                <input v-model="form.email" type="email" placeholder="you@example.com"/>
              </div>
              <div class="field">
                <label>Username</label>
                <input v-model="form.username" type="text" placeholder="Choose a username"/>
              </div>
              <div class="field">
                <label>Password</label>
                <div class="pw-wrap">
                  <input v-model="form.password" :type="showPw ? 'text' : 'password'" placeholder="Min. 6 characters"/>
                  <button type="button" class="pw-eye" @click="showPw = !showPw">{{ showPw ? '🙈' : '👁' }}</button>
                </div>
              </div>
              <div class="field">
                <label>Confirm Password</label>
                <div class="pw-wrap">
                  <input v-model="form.confirmPassword" :type="showCpw ? 'text' : 'password'" placeholder="Repeat password"/>
                  <button type="button" class="pw-eye" @click="showCpw = !showCpw">{{ showCpw ? '🙈' : '👁' }}</button>
                </div>
              </div>
              <button type="submit" class="submit-btn" :disabled="loading">
                <span v-if="loading" class="mini-spin"></span>
                <span v-else>Sign Up</span>
              </button>
            </form>
            <p class="bottom-link">Have an account? <a href="#" @click.prevent="goSignIn">Sign In</a></p>
          </template>

          <template v-if="page === 'forgot'">
            <template v-if="resetStep === 1">
              <h2 class="form-title">Reset Password</h2>
              <p class="form-sub">Choose how to receive your verification code</p>

              <form @submit.prevent="sendOTP" class="auth-form" novalidate>
                <div class="form-err" v-if="error">{{ error }}</div>
                <div class="field">
                  <label>{{ resetMethod === 'email' ? 'Email' : 'Phone Number' }}</label>
                  <input v-model="resetTarget" :type="resetMethod === 'email' ? 'email' : 'tel'" :placeholder="resetMethod === 'email' ? 'your@email.com' : '+60 12-345 6789'"/>
                </div>
                <button type="submit" class="submit-btn" :disabled="loading">
                  <span v-if="loading" class="mini-spin"></span>
                  <span v-else>Send Code</span>
                </button>
              </form>
            </template>
            <template v-if="resetStep === 2">
              <h2 class="form-title">Enter Code</h2>
              <p class="form-sub">Sent to <strong>{{ resetTarget }}</strong></p>
              <form @submit.prevent="verifyOTP" class="auth-form" novalidate>
                <div class="form-err" v-if="error">{{ error }}</div>
                <div class="form-success" v-if="successMsg">{{ successMsg }}</div>
                <div class="field">
                  <label>6-Digit Code</label>
                  <input v-model="otpCode" type="text" placeholder="••••••" maxlength="6" class="otp-input"/>
                </div>
                <div class="field">
                  <label>New Password</label>
                  <div class="pw-wrap">
                    <input v-model="newPassword" :type="showPw ? 'text' : 'password'" placeholder="Min. 6 characters"/>
                    <button type="button" class="pw-eye" @click="showPw = !showPw">{{ showPw ? '🙈' : '👁' }}</button>
                  </div>
                </div>
                <div class="field">
                  <label>Confirm New Password</label>
                  <div class="pw-wrap">
                    <input v-model="newPasswordConfirm" :type="showCpw ? 'text' : 'password'" placeholder="Repeat password"/>
                    <button type="button" class="pw-eye" @click="showCpw = !showCpw">{{ showCpw ? '🙈' : '👁' }}</button>
                  </div>
                </div>
                <button type="submit" class="submit-btn" :disabled="loading">
                  <span v-if="loading" class="mini-spin"></span>
                  <span v-else>Reset Password</span>
                </button>
                <button type="button" class="text-btn" @click="resetStep = 1; clearErrors()">← Try different contact</button>
              </form>
            </template>
            <p class="bottom-link"><a href="#" @click.prevent="goSignIn">← Back to Sign In</a></p>
          </template>

          </div>
          </Transition>
        </div>
      </div>

      <!-- RIGHT white area: Sign In form -->
      <div class="form-side form-side--right">
        <div class="form-inner" v-show="page === 'signin'">
          <Transition name="content-fade">
          <div v-if="contentVisible && page === 'signin'">
          <h2 class="form-title">Sign In</h2>
          <p class="form-sub">Welcome back! Enter your credentials</p>
          <form @submit.prevent="handleSignin" class="auth-form" novalidate>
            <div class="form-err" v-if="error && page === 'signin'">{{ error }}</div>
            <div class="field">
              <label>Username</label>
              <input v-model="form.username" type="text" placeholder="Your username" autocomplete="username"/>
            </div>
            <div class="field">
              <label>Password</label>
              <div class="pw-wrap">
                <input v-model="form.password" :type="showPwSI ? 'text' : 'password'" placeholder="Your password" autocomplete="current-password"/>
                <button type="button" class="pw-eye" @click="showPwSI = !showPwSI">{{ showPwSI ? '🙈' : '👁' }}</button>
              </div>
            </div>
            <div class="forgot-row">
              <a href="#" @click.prevent="page = 'forgot'; resetStep = 1; clearErrors()">Forgot password?</a>
            </div>
            <button type="submit" class="submit-btn" :disabled="loading">
              <span v-if="loading" class="mini-spin"></span>
              <span v-else>Sign In</span>
            </button>
          </form>
          <p class="bottom-link">No account yet? <a href="#" @click.prevent="goSignUp">Sign Up</a></p>
          </div>
          </Transition>
        </div>
      </div>

      <!-- Purple sliding panel -->
      <!-- Sign Up: panel on RIGHT side (left: 50%) -->
      <!-- Sign In: panel on LEFT side (left: 0) -->
      <div class="purple-panel" :class="{ 'panel-left': page === 'signin', 'panel-fullscreen': panelFullscreen }">
        <div class="panel-content">
          <div class="panel-logo">✯</div>
          <Transition :name="panelTextDir === 'left' ? 'panel-text-left' : 'panel-text-right'" mode="out-in">
            <div v-if="panelTextVisible" :key="panelPage">
              <template v-if="panelPage === 'signup' || panelPage === 'forgot'">
                <h2 class="panel-title">Welcome to<br>Note Your Mind</h2>
                <p class="panel-sub">Your personal space to capture every thought, idea, and moment.</p>
                <p class="panel-hint">Already have an account?</p>
                <button class="panel-btn" @click="goSignIn">Sign In →</button>
              </template>
              <template v-else>
                <h2 class="panel-title">Hello,<br>Friend!</h2>
                <p class="panel-sub">Register with your personal details to access all features of Note Your Mind.</p>
                <p class="panel-hint">Don't have an account?</p>
                <button class="panel-btn" @click="goSignUp">Sign Up →</button>
              </template>
            </div>
          </Transition>
        </div>
      </div>

    </div>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast.show" class="auth-toast" :class="`toast--${toast.type}`">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import axios from 'axios'

const emit = defineEmits(['login'])
const api  = axios.create({ baseURL: 'https://note-your-mind-production.up.railway.app' })

const page         = ref('signup')
const signupMethod = ref('email')
const resetMethod  = ref('email')
const resetStep    = ref(1)
const resetTarget  = ref('')
const otpCode      = ref('')
const newPassword  = ref('')
const newPasswordConfirm = ref('')
const loading  = ref(false)
const error    = ref('')
const successMsg = ref('')
const showPw   = ref(false)
const showCpw  = ref(false)
const showPwSI = ref(false)

const form  = reactive({ username: '', password: '', confirmPassword: '', phone: '', email: '' })
const toast = reactive({ show: false, message: '', type: 'success' })
let toastTimer = null

function showToast(msg, type = 'success') {
  clearTimeout(toastTimer)
  Object.assign(toast, { message: msg, type, show: true })
  toastTimer = setTimeout(() => (toast.show = false), 3000)
}
function clearErrors() { error.value = ''; successMsg.value = '' }
function resetForm() {
  Object.assign(form, { username: '', password: '', confirmPassword: '', phone: '', email: '' })
  showPw.value = false; showCpw.value = false; showPwSI.value = false
  clearErrors()
}
// ── Animated transitions ──
const transitioning = ref(false)
const panelFullscreen = ref(false)
const contentVisible = ref(true)
const panelTextVisible = ref(true)
const panelTextDir = ref('left')  // direction of panel text enter animation
const panelPage = ref('signup')   // tracks which text to show in panel

async function goSignIn() {
  if (transitioning.value) return
  transitioning.value = true
  // Step 1: fade out form content + panel text fades out LEFT
  contentVisible.value = false
  panelTextVisible.value = false
  panelTextDir.value = 'left'
  await sleep(350)
  // Step 2: expand purple panel fullscreen
  panelFullscreen.value = true
  await sleep(800)
  // Step 3: switch page + shrink panel to LEFT side
  resetForm()
  page.value = 'signin'
  panelPage.value = 'signin'
  panelFullscreen.value = false
  await sleep(400)
  // Step 4: fade in panel text from RIGHT + form content
  panelTextDir.value = 'right'
  panelTextVisible.value = true
  await sleep(100)
  contentVisible.value = true
  transitioning.value = false
}

async function goSignUp() {
  if (transitioning.value) return
  transitioning.value = true
  // Step 1: fade out form content + panel text fades out RIGHT
  contentVisible.value = false
  panelTextVisible.value = false
  panelTextDir.value = 'right'
  await sleep(350)
  // Step 2: expand purple panel fullscreen
  panelFullscreen.value = true
  await sleep(800)
  // Step 3: switch page + shrink panel to RIGHT side
  resetForm()
  page.value = 'signup'
  panelPage.value = 'signup'
  panelFullscreen.value = false
  await sleep(400)
  // Step 4: fade in panel text from LEFT + form content
  panelTextDir.value = 'left'
  panelTextVisible.value = true
  await sleep(100)
  contentVisible.value = true
  transitioning.value = false
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function handleSignup() {
  clearErrors(); loading.value = true
  try {
    const pl = { email: form.email, username: form.username, password: form.password, confirmPassword: form.confirmPassword }
    await api.post('/api/auth/signup/email', pl)
    showToast('Account created! Please sign in.')
    resetForm(); setTimeout(() => { page.value = 'signin' }, 1200)
  } catch (e) { error.value = e.response?.data?.message || 'Sign up failed.' }
  finally { loading.value = false }
}

async function handleSignin() {
  clearErrors(); loading.value = true
  try {
    const { data } = await api.post('/api/auth/signin', { username: form.username, password: form.password })
    showToast(`Welcome back, ${data.data.username}! 🎉`)
    setTimeout(() => emit('login', data.data), 800)
  } catch (e) { error.value = e.response?.data?.message || 'Sign in failed.' }
  finally { loading.value = false }
}

async function sendOTP() {
  clearErrors()
  if (!resetTarget.value) { error.value = 'Please enter your contact.'; return }
  loading.value = true
  try {
    const { data } = await api.post('/api/auth/forgot-password/send', { target: resetTarget.value, method: resetMethod.value })
    successMsg.value = data.message; resetStep.value = 2
  } catch (e) { error.value = e.response?.data?.message || 'Failed to send.' }
  finally { loading.value = false }
}

async function verifyOTP() {
  clearErrors(); loading.value = true
  try {
    const { data } = await api.post('/api/auth/forgot-password/verify', {
      target: resetTarget.value, code: otpCode.value,
      newPassword: newPassword.value, confirmPassword: newPasswordConfirm.value,
    })
    showToast(data.message)
    setTimeout(() => { page.value = 'signin'; resetStep.value = 1; resetTarget.value = '' }, 1500)
  } catch (e) { error.value = e.response?.data?.message || 'Verification failed.' }
  finally { loading.value = false }
}
</script>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
/* background controlled by App.vue */
</style>

<style scoped>
.auth-root {
  min-height: 100vh;
  width: 100%;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  overflow: hidden;
}

.auth-card {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 100vh;
  background: #fff;
  overflow: hidden;
}

/* ── White form sides ── */
.form-side {
  width: 50%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background: #fff;
  position: relative;
  z-index: 1;
}

.form-inner {
  width: 100%;
  max-width: 380px;
}

/* ── Purple panel ── */
/* Default (signup): panel sits on RIGHT (left: 50%) */
/* signin: panel slides to LEFT (left: 0) */
.purple-panel {
  position: absolute;
  top: 0;
  left: 50%;
  width: 50%;
  height: 100%;
  z-index: 10;
  background: linear-gradient(160deg, #3B1F8C 0%, #6B3FD4 40%, #A855F7 80%, #C084FC 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 48px;
  overflow: hidden;
  border-radius: 16px 0 0 16px;
  transition: left 0.65s cubic-bezier(0.77, 0, 0.18, 1),
              width 0.65s cubic-bezier(0.77, 0, 0.18, 1),
              border-radius 0.65s ease;
}
.purple-panel::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 80% 80% at 30% 40%, rgba(255,255,255,0.08) 0%, transparent 70%);
}
/* When signin: slide panel to left */
.purple-panel.panel-left { left: 0; border-radius: 0 16px 16px 0; }

.purple-panel.panel-fullscreen {
  left: 0 !important;
  width: 100% !important;
  border-radius: 0 !important;
  transition: left 0.55s cubic-bezier(0.77,0,0.18,1),
              width 0.55s cubic-bezier(0.77,0,0.18,1),
              border-radius 0.55s ease !important;
}

/* Panel text transitions */
/* Enter from LEFT (fade in from left) */
.panel-text-left-enter-active  { transition: opacity 0.45s ease, transform 0.45s cubic-bezier(0.25,0.8,0.25,1); }
.panel-text-left-leave-active  { transition: opacity 0.3s ease, transform 0.3s ease; }
.panel-text-left-enter-from    { opacity: 0; transform: translateX(-50px); }
.panel-text-left-leave-to      { opacity: 0; transform: translateX(-50px); }

/* Enter from RIGHT (fade in from right) */
.panel-text-right-enter-active { transition: opacity 0.45s ease, transform 0.45s cubic-bezier(0.25,0.8,0.25,1); }
.panel-text-right-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.panel-text-right-enter-from   { opacity: 0; transform: translateX(50px); }
.panel-text-right-leave-to     { opacity: 0; transform: translateX(50px); }
.content-fade-enter-active { transition: opacity 0.4s ease 0.1s; }
.content-fade-leave-active { transition: opacity 0.3s ease; }
.content-fade-enter-from   { opacity: 0; }
.content-fade-leave-to     { opacity: 0; }

.panel-content { position: relative; z-index: 1; text-align: center; color: #fff; }
.panel-logo {
  font-size: 44px;
  background: rgba(255,255,255,0.15);
  width: 80px; height: 80px; border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 28px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.2);
}
.panel-title { font-size: 36px; font-weight: 800; line-height: 1.2; margin-bottom: 16px; letter-spacing: -0.5px; }
.panel-sub   { font-size: 15px; line-height: 1.7; color: rgba(255,255,255,0.82); margin-bottom: 36px; max-width: 260px; margin-left: auto; margin-right: auto; }
.panel-hint  { font-size: 13px; color: rgba(255,255,255,0.65); margin-bottom: 14px; }
.panel-btn {
  background: rgba(255,255,255,0.12);
  border: 1.5px solid rgba(255,255,255,0.65);
  color: #fff; font-size: 15px; font-weight: 600;
  padding: 11px 36px; border-radius: 30px;
  cursor: pointer; letter-spacing: 0.5px;
  transition: background 0.2s, transform 0.15s;
}
.panel-btn:hover { background: rgba(255,255,255,0.24); transform: scale(1.04); }

/* ── Form typography ── */
.form-title { font-size: 32px; font-weight: 800; color: #1E1B4B; margin-bottom: 6px; letter-spacing: -0.5px; }
.form-sub   { font-size: 14px; color: #94A3B8; margin-bottom: 24px; }

.signup-tabs { display: flex; gap: 8px; margin-bottom: 18px; }
.tab-btn {
  flex: 1; padding: 10px; border-radius: 10px;
  border: 1.5px solid #E2E8F0; background: #F8FAFC;
  color: #64748B; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.tab-btn.active { border-color: #7C3AED; background: #F5F3FF; color: #6D28D9; font-weight: 600; }

.auth-form { display: flex; flex-direction: column; gap: 14px; }
.form-err     { background: #FEF2F2; border: 1px solid #FCA5A5; color: #DC2626; font-size: 13px; border-radius: 10px; padding: 10px 14px; }
.form-success { background: #F0FDF4; border: 1px solid #86EFAC; color: #15803D; font-size: 13px; border-radius: 10px; padding: 10px 14px; }

.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 13px; font-weight: 600; color: #374151; }
.field input {
  padding: 11px 14px; border-radius: 10px;
  border: 1.5px solid #E2E8F0; background: #F8FAFC;
  font-size: 14px; color: #1E1B4B; outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  font-family: inherit; width: 100%;
}
.field input:focus { border-color: #7C3AED; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); background: #fff; }
.field input::placeholder { color: #B0B8C8; }

.pw-wrap { position: relative; }
.pw-wrap input { padding-right: 42px; }
.pw-eye {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; font-size: 16px; padding: 0;
}

.otp-input { font-size: 22px; text-align: center; letter-spacing: 8px; font-weight: 700; color: #6D28D9; }
.otp-hint  { font-size: 11px; color: #7C3AED; }

.forgot-row { display: flex; justify-content: flex-start; margin-top: -4px; }
.forgot-row a { font-size: 13px; color: #7C3AED; text-decoration: none; font-weight: 500; }
.forgot-row a:hover { text-decoration: underline; }

.submit-btn {
  padding: 13px; border-radius: 12px;
  background: linear-gradient(135deg, #6D28D9, #A855F7);
  color: #fff; font-size: 15px; font-weight: 700;
  border: none; cursor: pointer; margin-top: 4px;
  display: flex; align-items: center; justify-content: center;
  transition: filter 0.15s, transform 0.1s; width: 100%;
}
.submit-btn:hover:not(:disabled) { filter: brightness(1.1); }
.submit-btn:active:not(:disabled) { transform: scale(0.98); }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.text-btn {
  background: none; border: none; color: #94A3B8;
  font-size: 13px; cursor: pointer; padding: 0;
  font-family: inherit; width: 100%; text-align: left;
}
.text-btn:hover { color: #6D28D9; }

.bottom-link { margin-top: 20px; font-size: 13px; color: #94A3B8; }
.bottom-link a { color: #7C3AED; font-weight: 600; text-decoration: none; }
.bottom-link a:hover { text-decoration: underline; }

.mini-spin {
  width: 18px; height: 18px;
  border: 2.5px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%;
  animation: spin 0.7s linear infinite; display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

.auth-toast {
  position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
  padding: 12px 24px; border-radius: 12px;
  font-size: 14px; font-weight: 500;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2); z-index: 999; white-space: nowrap;
}
.toast--success { background: #1a1050; color: #A5B4FC; border: 1px solid rgba(99,102,241,0.4); }
.toast--error   { background: #2d0a0a; color: #FCA5A5; border: 1px solid rgba(239,68,68,0.3); }
.toast-enter-active { transition: all 0.35s cubic-bezier(0.34,1.2,0.64,1); }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from   { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.95); }
.toast-leave-to     { opacity: 0; transform: translateX(-50%) translateY(-8px); }

@media (max-width: 768px) {
  .auth-card      { flex-direction: column; }
  .form-side      { width: 100%; min-height: 50vh; padding: 32px 24px; }
  .purple-panel   { position: relative; width: 100%; height: auto; left: 0 !important; min-height: 220px; padding: 40px 28px; }
}
</style>