<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useChatStore } from '@/stores/chat'

const emit  = defineEmits<{ send: [text: string]; panel: [text: string] }>()
const store = useChatStore()

const text    = ref('')
const focused = ref(false)
const inputEl = ref<HTMLTextAreaElement | null>(null)

const busy    = computed(() => store.isLoading || store.isPanelLoading || !!store.streamingMsgId)
const canSend = computed(() =>
  text.value.trim().length > 0 && text.value.length <= 2000 && !busy.value && !!store.activeChatId
)

const placeholder = computed(() =>
  !store.activeChatId
    ? 'Выберите чат...'
    : store.isPanelLoading
      ? 'Эксперты совещаются...'
      : busy.value
        ? 'AI думает...'
        : `Опишите стартап или задайте вопрос [${store.activeRole?.name}]`
)

// Quick prompts from sidebar
watch(() => store.inputText, (val) => {
  if (!val) return
  text.value = val
  store.inputText = ''
  inputEl.value?.focus()
  setTimeout(autoResize, 0)
})

function send() {
  if (!canSend.value) return
  emit('send', text.value.trim())
  text.value = ''
  resetHeight()
}

function sendPanel() {
  if (!canSend.value) return
  emit('panel', text.value.trim())
  text.value = ''
  resetHeight()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
}

function autoResize() {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 130) + 'px'
}

function resetHeight() {
  if (inputEl.value) inputEl.value.style.height = 'auto'
}
</script>

<template>
  <div class="input-area">
    <div class="input-wrap" :class="{ focused }">
      <textarea
        ref="inputEl"
        v-model="text"
        class="chat-input"
        :placeholder="placeholder"
        rows="1"
        :disabled="busy || !store.activeChatId"
        @keydown="onKeydown"
        @input="autoResize"
        @focus="focused = true"
        @blur="focused = false"
      />
      <button
        class="panel-btn"
        :disabled="!canSend"
        title="Полный аудит — опросить всех экспертов одновременно"
        @click="sendPanel"
      >🎯</button>
      <button class="send-btn" :disabled="!canSend" @click="send">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
    <div class="input-hint">
      <span>Enter — отправить · Shift+Enter — новая строка</span>
      <span :class="{ warn: text.length > 1800 }">{{ text.length }} / 2000</span>
    </div>
  </div>
</template>

<style scoped>
.input-area { padding: 14px 24px 18px; border-top: 1px solid var(--border); background: var(--surface); flex-shrink: 0; }

.input-wrap {
  display: flex; gap: 10px; align-items: flex-end;
  background: var(--surface2); border: 1.5px solid var(--border2);
  border-radius: 14px; padding: 10px 10px 10px 16px; transition: border-color .2s;
}
.input-wrap.focused { border-color: rgba(124,106,247,.45); }

.chat-input {
  flex: 1; background: none; border: none; outline: none;
  color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 14px;
  resize: none; min-height: 22px; max-height: 130px; line-height: 1.55;
}
.chat-input::placeholder { color: var(--muted); }
.chat-input:disabled { opacity: .5; cursor: not-allowed; }

.panel-btn {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: none; cursor: pointer; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  transition: all .2s;
}
.panel-btn:hover:not(:disabled) { transform: scale(1.06); filter: brightness(1.1); }
.panel-btn:disabled { opacity: .35; cursor: not-allowed; transform: none; }

.send-btn {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, var(--accent), #5b4fcf);
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .2s; color: #fff;
}
.send-btn:hover:not(:disabled) { transform: scale(1.06); filter: brightness(1.1); }
.send-btn:disabled { opacity: .35; cursor: not-allowed; transform: none; }
.send-btn svg { width: 15px; height: 15px; }

.input-hint { display: flex; justify-content: space-between; margin-top: 7px; font-size: 11px; color: var(--muted); padding: 0 4px; }
.warn { color: var(--danger) !important; }
</style>
