<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const auth   = useAuthStore()
const toast  = useToastStore()

const login    = ref('')
const password = ref('')
const loading  = ref(false)

async function submit() {
  if (!login.value || !password.value || loading.value) return
  loading.value = true
  try {
    await auth.login(login.value, password.value)
    router.push('/app')
  } catch (e: unknown) {
    toast.error('Ошибка входа', (e as Error).message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="logo-area">
        <div class="logo-mark"><span class="syne">AM</span><div class="logo-glow" /></div>
        <div>
          <div class="app-name syne">AuditMate</div>
          <div class="app-sub">Умный аудит стартапа</div>
        </div>
      </div>

      <form class="form" @submit.prevent="submit">
        <div class="field">
          <label for="login">Логин</label>
          <input id="login" v-model="login" type="text" placeholder="admin" autocomplete="username" :disabled="loading" />
        </div>
        <div class="field">
          <label for="password">Пароль</label>
          <input id="password" v-model="password" type="password" placeholder="••••••••" autocomplete="current-password" :disabled="loading" />
        </div>
        <button type="submit" class="submit-btn" :disabled="loading || !login || !password">
          <span v-if="loading" class="spinner white" />
          <span v-else>Войти →</span>
        </button>
      </form>

      <p class="hint">Тестовый вход: <code>admin / admin</code></p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg); padding: 16px;
  background-image: radial-gradient(ellipse at 50% 0%, rgba(124,106,247,0.15) 0%, transparent 60%);
}
.login-card {
  background: var(--surface); border: 1px solid var(--border2);
  border-radius: 20px; padding: 40px 36px; width: 100%; max-width: 420px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
}

.logo-area { display: flex; align-items: center; gap: 14px; margin-bottom: 32px; }
.logo-mark {
  position: relative; width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  background: linear-gradient(135deg, var(--accent), var(--accent-g));
  display: flex; align-items: center; justify-content: center;
}
.logo-mark span { font-weight: 800; font-size: 15px; color: #09090f; position: relative; z-index: 1; }
.logo-glow { position: absolute; inset: -4px; border-radius: 16px; background: linear-gradient(135deg, var(--accent), var(--accent-g)); opacity: .2; filter: blur(10px); }
.app-name { font-size: 22px; font-weight: 800; letter-spacing: -.3px; }
.app-sub  { font-size: 12px; color: var(--muted); margin-top: 1px; }

.form { display: flex; flex-direction: column; gap: 18px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 12.5px; font-weight: 500; color: var(--muted2); letter-spacing: .3px; }
.field input {
  width: 100%; padding: 11px 14px;
  background: var(--surface2); border: 1.5px solid var(--border2);
  border-radius: 10px; color: var(--text); font-size: 14px; font-family: inherit;
  outline: none; transition: border-color .2s;
}
.field input::placeholder { color: var(--muted); }
.field input:focus { border-color: rgba(124,106,247,.55); }
.field input:disabled { opacity: .5; cursor: not-allowed; }

.submit-btn {
  width: 100%; padding: 12px; margin-top: 4px;
  background: linear-gradient(135deg, var(--accent), #5b4fcf);
  border: none; border-radius: 10px; color: #fff;
  font-family: 'Syne', sans-serif; font-weight: 700; font-size: 15px;
  cursor: pointer; transition: all .2s; min-height: 48px;
  display: flex; align-items: center; justify-content: center;
}
.submit-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
.submit-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }

.hint { margin-top: 20px; text-align: center; font-size: 12px; color: var(--muted); }
.hint code { background: var(--surface2); padding: 2px 6px; border-radius: 5px; font-family: 'JetBrains Mono', monospace; font-size: 11px; }
</style>
