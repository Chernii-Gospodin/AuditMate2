<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useChatStore, ROLES, isPanelGroup, SEARCH_ROLES, ROLE_TEMPS } from '@/stores/chat'
import type { Message, PanelGroup }          from '@/stores/chat'
import { useToastStore } from '@/stores/toast'
import WelcomeScreen    from './WelcomeScreen.vue'
import ChatMessage      from './ChatMessage.vue'
import PanelResponseCard from './PanelResponseCard.vue'
import ChatInput        from './ChatInput.vue'
import type { RoleId } from '@/api'

const chat    = useChatStore()
const toast   = useToastStore()
const msgsEl  = ref<HTMLElement | null>(null)

async function scrollToBottom() {
  await nextTick()
  if (msgsEl.value) msgsEl.value.scrollTop = msgsEl.value.scrollHeight
}

watch(() => chat.messages.length,         scrollToBottom)
watch(() => chat.streamingContent.length, scrollToBottom)
watch(() => chat.isLoading,               scrollToBottom)
watch(() => chat.isPanelLoading,          scrollToBottom)

async function onSend(text: string) {
  try {
    await chat.sendMessage(text)
  } catch (e: unknown) {
    toast.error('Ошибка AI', (e as Error).message)
  }
}

async function onPanel(text: string) {
  try {
    await chat.sendPanelMessage(text)
  } catch (e: unknown) {
    toast.error('Ошибка панельного аудита', (e as Error).message)
  }
}

async function onSwitchRole(roleId: RoleId) {
  try {
    await chat.switchRole(roleId)
  } catch (e: unknown) {
    toast.error('Ошибка', (e as Error).message)
  }
}

const thinkingLabel = computed(() =>
  SEARCH_ROLES.includes(chat.activeRole?.id as RoleId) ? '🔍 ищет в интернете...' : 'думает...'
)

const currentProjectId = computed(() => chat.activeChat?.odoo_project_id ?? null)
const roleChatExists   = computed(() => (roleId: RoleId) => {
  if (!currentProjectId.value) return false
  return !!chat.roleChatsMap[currentProjectId.value]?.[roleId]
})

// ── Температурный регулятор ──
const roleAutoTemp = computed(() => ROLE_TEMPS[chat.activeRole?.id as RoleId] ?? 0.7)
const tempThumb    = computed(() => chat.temperature ?? roleAutoTemp.value)
const tempLabel    = computed(() =>
  chat.temperature === null ? `Авто ${roleAutoTemp.value.toFixed(2)}` : chat.temperature.toFixed(2),
)
const tempTitle = 'Температура LLM: ниже — точнее и стабильнее, выше — разнообразнее. «Авто» — рекомендованная для текущей роли.'
function onTempInput(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  chat.setTemperature(Math.round(v * 100) / 100)
}
function resetTemp() { chat.setTemperature(null) }
</script>

<template>
  <div class="chat-view">
    <!-- Context bar -->
    <div class="ctx-bar">
      <div class="ctx-left">
        <div class="ctx-dot" :style="{ background: chat.activeRole?.color }" />
        <span class="ctx-role">{{ chat.activeRole?.name }}</span>
        <span class="ctx-sep">·</span>
        <span class="ctx-project">{{ chat.activeChat?.project_name }}</span>
      </div>

      <!-- Role switcher tabs -->
      <div class="role-tabs">
        <button
          v-for="r in ROLES"
          :key="r.id"
          class="role-tab"
          :class="{
            active:  chat.activeChat?.ai_role === r.id,
            exists:  roleChatExists(r.id),
          }"
          :style="chat.activeChat?.ai_role === r.id ? `--rc:${r.color}` : ''"
          :title="r.name"
          @click="onSwitchRole(r.id)"
        >
          <span>{{ r.emoji }}</span>
          <span class="rt-label">{{ r.name }}</span>
          <span v-if="roleChatExists(r.id) && chat.activeChat?.ai_role !== r.id" class="rt-dot" />
        </button>
      </div>

      <div class="ctx-actions">
        <!-- Температурный регулятор -->
        <div class="temp-ctl" :title="tempTitle">
          <span class="temp-ico">🌡</span>
          <input
            class="temp-range" type="range" min="0" max="1.5" step="0.05"
            :value="tempThumb" @input="onTempInput"
          />
          <span class="temp-val" :class="{ auto: chat.temperature === null }">{{ tempLabel }}</span>
          <button
            v-if="chat.temperature !== null"
            class="temp-auto" title="Вернуть «Авто» (по роли)" @click="resetTemp"
          >↺</button>
        </div>
        <button class="ctx-btn" @click="chat.exportChat()">Экспорт</button>
        <button class="ctx-btn danger" @click="chat.activeChatId = null">← Проекты</button>
      </div>
    </div>

    <!-- Messages -->
    <div ref="msgsEl" class="messages">
      <WelcomeScreen v-if="!chat.hasMessages" />
      <template v-else>
        <template v-for="item in chat.messages" :key="isPanelGroup(item) ? (item as PanelGroup).panel_id : (item as Message).id">
          <PanelResponseCard v-if="isPanelGroup(item)" :panel="(item as PanelGroup)" />
          <ChatMessage
            v-else
            :message="(item as Message)"
            :role="chat.activeRole"
            :streaming="(item as Message).id === chat.streamingMsgId"
            :stream-content="(item as Message).id === chat.streamingMsgId ? chat.streamingContent : undefined"
          />
        </template>

        <!-- Regular AI thinking indicator -->
        <div v-if="chat.isLoading" class="msg assistant">
          <div class="msg-avatar assistant">{{ chat.activeRole?.emoji }}</div>
          <div class="msg-content">
            <div class="msg-meta">{{ chat.activeRole?.name }} <span class="thinking-label">{{ thinkingLabel }}</span></div>
            <div class="msg-bubble typing"><span /><span /><span /></div>
          </div>
        </div>

        <!-- Panel loading indicator -->
        <div v-if="chat.isPanelLoading" class="panel-loading">
          <div class="panel-loading-inner">
            <span class="panel-loading-icon">🎯</span>
            <div class="panel-loading-text">
              <span>Опрашиваю экспертов...</span>
              <div class="panel-experts">
                <span>🚀</span><span>💼</span><span>🎓</span><span>🔍</span>
              </div>
            </div>
            <div class="msg-bubble typing"><span /><span /><span /></div>
          </div>
        </div>

        <!-- Error -->
        <div v-if="chat.error" class="error-row">
          <div class="error-card">
            <span>⚠️ {{ chat.error }}</span>
            <button @click="chat.error = null">✕</button>
          </div>
        </div>
      </template>
    </div>

    <ChatInput @send="onSend" @panel="onPanel" />
  </div>
</template>

<style scoped>
.chat-view { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

/* Context bar */
.ctx-bar {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;
  padding: 8px 20px; border-bottom: 1px solid var(--border);
  background: var(--surface); flex-shrink: 0; gap: 10px;
}
.ctx-left   { display: flex; align-items: center; gap: 8px; font-size: 13px; min-width: 0; }
.ctx-dot    { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.ctx-role   { font-weight: 600; white-space: nowrap; }
.ctx-sep    { color: var(--muted); }
.ctx-project { color: var(--muted2); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px; }

/* Role tabs */
.role-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.role-tab {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 10px; border-radius: 8px; font-size: 12px;
  border: 1.5px solid var(--border); background: transparent;
  color: var(--muted2); cursor: pointer; transition: all .15s; position: relative;
}
.role-tab:hover { border-color: var(--border2); color: var(--text); background: var(--surface2); }
.role-tab.active {
  border-color: var(--rc, var(--accent));
  background: color-mix(in srgb, var(--rc, var(--accent)) 12%, transparent);
  color: var(--text);
}
.rt-label { font-weight: 500; }
.rt-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--accent-g); position: absolute; top: 3px; right: 3px;
}

.ctx-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

/* Температурный регулятор */
.temp-ctl {
  display: flex; align-items: center; gap: 6px;
  padding: 3px 9px; border-radius: 8px;
  border: 1px solid var(--border2); background: var(--surface2);
}
.temp-ico { font-size: 13px; line-height: 1; }
.temp-range {
  width: 86px; height: 4px; cursor: pointer; accent-color: var(--accent);
}
.temp-val {
  font-size: 11px; color: var(--text); font-weight: 600;
  font-variant-numeric: tabular-nums; min-width: 56px; text-align: right;
}
.temp-val.auto { color: var(--muted); font-weight: 500; }
.temp-auto {
  background: none; border: none; color: var(--muted);
  cursor: pointer; font-size: 14px; line-height: 1; padding: 0 2px;
}
.temp-auto:hover { color: var(--accent); }
.ctx-btn {
  padding: 4px 12px; border-radius: 8px; font-size: 11.5px;
  border: 1px solid var(--border2); background: var(--surface2);
  color: var(--muted); cursor: pointer; transition: all .15s;
}
.ctx-btn:hover       { color: var(--text); border-color: #38394f; }
.ctx-btn.danger:hover { color: var(--accent); border-color: rgba(124,106,247,.4); }

/* Messages */
.messages {
  flex: 1; overflow-y: auto; padding: 28px 32px;
  display: flex; flex-direction: column; gap: 22px; scroll-behavior: smooth;
}

/* Thinking animation */
.msg { display: flex; gap: 12px; }
.msg-avatar {
  width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 15px;
}
.msg-avatar.assistant { background: linear-gradient(135deg, var(--accent), var(--accent-g)); }
.msg-content { flex: 1; min-width: 0; }
.msg-meta { font-size: 11px; color: var(--muted); margin-bottom: 5px; display: flex; align-items: center; gap: 6px; }
.thinking-label { color: var(--accent-g); animation: pulse-text 1.5s ease-in-out infinite; }
@keyframes pulse-text { 0%,100%{opacity:1} 50%{opacity:.3} }

.msg-bubble.typing {
  display: inline-flex; gap: 5px; align-items: center; padding: 12px 16px;
  border-radius: 14px; border-top-left-radius: 4px;
  background: var(--surface); border: 1px solid var(--border);
}
.msg-bubble.typing span {
  width: 6px; height: 6px; border-radius: 50%; background: var(--muted); display: block;
  animation: bounce 1.1s infinite ease-in-out;
}
.msg-bubble.typing span:nth-child(2) { animation-delay: .15s; }
.msg-bubble.typing span:nth-child(3) { animation-delay: .30s; }
@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-7px)} }

/* Panel loading */
.panel-loading {
  display: flex; justify-content: flex-start; max-width: 800px;
}
.panel-loading-inner {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-radius: 14px; border-top-left-radius: 4px;
  background: var(--surface); border: 1px solid rgba(167,139,250,.3);
}
.panel-loading-icon { font-size: 20px; }
.panel-loading-text { display: flex; flex-direction: column; gap: 4px; }
.panel-loading-text span { font-size: 13px; color: var(--muted); }
.panel-experts { display: flex; gap: 6px; font-size: 15px; }
.panel-experts span { animation: bounce 1.1s infinite ease-in-out; }
.panel-experts span:nth-child(2) { animation-delay: .15s; }
.panel-experts span:nth-child(3) { animation-delay: .30s; }
.panel-experts span:nth-child(4) { animation-delay: .45s; }

/* Error */
.error-row  { display: flex; justify-content: center; }
.error-card {
  display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 10px;
  background: rgba(248,113,133,.08); border: 1px solid rgba(248,113,133,.25);
  color: var(--danger); font-size: 13px; max-width: 560px;
}
.error-card button { margin-left: auto; background: none; border: none; color: var(--danger); cursor: pointer; font-size: 14px; padding: 0 4px; }

@media (max-width: 900px) {
  .rt-label { display: none; }
  .role-tab { padding: 5px 7px; }
}
@media (max-width: 640px) {
  .ctx-project { display: none; }
  .messages    { padding: 16px; }
}
</style>
