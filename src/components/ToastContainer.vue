<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
const toast = useToastStore()

const icons: Record<string, string> = { success: '✓', error: '✕', info: 'ℹ', warn: '⚠' }
</script>

<template>
  <Teleport to="body">
    <div class="toast-wrap">
      <TransitionGroup name="toast">
        <div
          v-for="t in toast.items"
          :key="t.id"
          class="toast"
          :class="t.severity"
        >
          <span class="toast-icon">{{ icons[t.severity] }}</span>
          <div class="toast-body">
            <div class="toast-summary">{{ t.summary }}</div>
            <div v-if="t.detail" class="toast-detail">{{ t.detail }}</div>
          </div>
          <button class="toast-close" @click="toast.remove(t.id)">✕</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-wrap {
  position: fixed; top: 16px; right: 16px; z-index: 9999;
  display: flex; flex-direction: column; gap: 8px; pointer-events: none;
}
.toast {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px; border-radius: 12px; min-width: 280px; max-width: 360px;
  background: var(--surface2); border: 1px solid var(--border2);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  pointer-events: all; font-size: 13px;
}
.toast.success { border-color: rgba(74,222,128,.3); }
.toast.error   { border-color: rgba(248,113,133,.3); }
.toast.info    { border-color: rgba(124,106,247,.3); }
.toast.warn    { border-color: rgba(251,191,36,.3);  }

.toast-icon {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;
}
.success .toast-icon { background: rgba(74,222,128,.15); color: #4ade80; }
.error   .toast-icon { background: rgba(248,113,133,.15); color: #f87171; }
.info    .toast-icon { background: rgba(124,106,247,.15); color: #a78bfa; }
.warn    .toast-icon { background: rgba(251,191,36,.15);  color: #fbbf24; }

.toast-body   { flex: 1; }
.toast-summary { font-weight: 600; color: var(--text); }
.toast-detail  { color: var(--muted2); margin-top: 2px; font-size: 12px; line-height: 1.4; }
.toast-close   { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 12px; padding: 0 2px; flex-shrink: 0; }
.toast-close:hover { color: var(--text); }

.toast-enter-active { transition: all .3s ease; }
.toast-leave-active { transition: all .25s ease; }
.toast-enter-from   { opacity: 0; transform: translateX(40px); }
.toast-leave-to     { opacity: 0; transform: translateX(40px); }
</style>
