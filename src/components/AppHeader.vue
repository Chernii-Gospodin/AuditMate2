<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter }   from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'

const auth   = useAuthStore()
const chat   = useChatStore()
const router = useRouter()

const menuOpen = ref(false)
const initials = computed(() =>
  (auth.user?.name || 'U').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
)

function handleLogout() {
  auth.logout()
  router.push('/login')
}

// click-outside directive
const vClickOutside = {
  mounted(el: HTMLElement & { _out?: (e: Event) => void }, binding: { value: () => void }) {
    el._out = (e: Event) => { if (!el.contains(e.target as Node)) binding.value() }
    document.addEventListener('click', el._out)
  },
  unmounted(el: HTMLElement & { _out?: (e: Event) => void }) {
    if (el._out) document.removeEventListener('click', el._out)
  },
}
</script>

<template>
  <header class="header">
    <!-- Logo -->
    <div class="logo">
      <div class="logo-mark"><span class="syne">AM</span><div class="logo-glow" /></div>
      <div class="logo-text">
        <span class="logo-name syne">AuditMate</span>
        <span class="logo-sub">Умный аудит стартапа</span>
      </div>
    </div>

    <!-- Center: active model badge -->
    <div class="header-center">
      <div class="model-badge"><span class="model-dot" /><span>AI активен</span></div>
    </div>

    <!-- Right -->
    <div class="header-right">
      <div v-if="chat.activeChat" class="project-pill">
        📁 {{ chat.activeChat.project_name }}
      </div>

      <div v-click-outside="() => menuOpen = false" class="user-menu" @click="menuOpen = !menuOpen">
        <div class="user-avatar">{{ initials }}</div>
        <span class="user-name">{{ auth.user?.name }}</span>
        <span class="chevron" :class="{ open: menuOpen }">▾</span>

        <div v-if="menuOpen" class="dropdown">
          <div class="dropdown-info">
            <div class="di-name">{{ auth.user?.name }}</div>
            <div class="di-email">{{ auth.user?.email }}</div>
          </div>
          <hr class="dropdown-sep" />
          <button class="dropdown-item danger" @click="handleLogout">🚪 Выйти</button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; height: 60px;
  background: var(--surface); border-bottom: 1px solid var(--border);
  flex-shrink: 0; position: relative; z-index: 20;
}
.logo { display: flex; align-items: center; gap: 12px; }
.logo-mark {
  position: relative; width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, var(--accent), var(--accent-g));
  display: flex; align-items: center; justify-content: center;
}
.logo-mark span { font-weight: 800; font-size: 13px; color: #09090f; position: relative; z-index: 1; }
.logo-glow { position: absolute; inset: -4px; border-radius: 14px; background: linear-gradient(135deg, var(--accent), var(--accent-g)); opacity: .22; filter: blur(8px); }
.logo-text { display: flex; flex-direction: column; }
.logo-name { font-weight: 700; font-size: 16px; letter-spacing: -.3px; line-height: 1.2; }
.logo-sub  { font-size: 10px; color: var(--muted); letter-spacing: .4px; }

.model-badge {
  display: flex; align-items: center; gap: 7px; padding: 5px 14px; border-radius: 20px;
  border: 1px solid rgba(124,106,247,.25); background: rgba(124,106,247,.08);
  font-size: 12px; color: var(--accent-g);
}
.model-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }

.header-right { display: flex; align-items: center; gap: 12px; }
.project-pill {
  padding: 4px 12px; border-radius: 20px; font-size: 12px;
  background: var(--surface2); border: 1px solid var(--border2); color: var(--muted2);
  max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.user-menu {
  display: flex; align-items: center; gap: 8px; cursor: pointer;
  padding: 5px 10px; border-radius: 10px; border: 1px solid var(--border2);
  background: var(--surface2); position: relative; transition: all .15s; user-select: none;
}
.user-menu:hover { border-color: #38394f; }
.user-avatar {
  width: 26px; height: 26px; border-radius: 7px; flex-shrink: 0;
  background: linear-gradient(135deg, var(--accent), var(--accent-g));
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #09090f;
}
.user-name { font-size: 12.5px; font-weight: 500; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chevron   { font-size: 11px; color: var(--muted); transition: transform .2s; }
.chevron.open { transform: rotate(180deg); }

.dropdown {
  position: absolute; top: calc(100% + 8px); right: 0;
  min-width: 200px; background: var(--surface); border: 1px solid var(--border2);
  border-radius: 12px; padding: 6px; box-shadow: 0 8px 32px rgba(0,0,0,.4); z-index: 100;
}
.dropdown-info { padding: 8px 10px; }
.di-name  { font-size: 13px; font-weight: 600; }
.di-email { font-size: 11px; color: var(--muted); margin-top: 2px; }
.dropdown-sep { border: none; border-top: 1px solid var(--border); margin: 4px 0; }
.dropdown-item {
  width: 100%; padding: 8px 10px; border-radius: 8px; border: none;
  background: none; color: var(--text); font-size: 13px; font-family: inherit;
  cursor: pointer; text-align: left; transition: background .15s;
}
.dropdown-item:hover { background: var(--surface2); }
.dropdown-item.danger { color: var(--danger); }

@media (max-width: 640px) {
  .header-center { display: none; }
  .user-name     { display: none; }
  .project-pill  { display: none; }
}
</style>
