<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PanelGroup } from '@/stores/chat'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{ panel: PanelGroup }>()

const TABS = [
  { key: 'founder',  label: 'Основатель', emoji: '🚀', color: '#7c6af7' },
  { key: 'investor', label: 'Инвестор',   emoji: '💼', color: '#5eead4' },
  { key: 'mentor',   label: 'Ментор',     emoji: '🎓', color: '#fbbf24' },
  { key: 'critic',   label: 'Критик',     emoji: '🔍', color: '#fb7185' },
  { key: 'synthesis',label: 'Синтез',     emoji: '📋', color: '#a78bfa' },
]

const activeTab = ref('synthesis')

const content = computed(() => {
  if (activeTab.value === 'synthesis') return props.panel.synthesis?.content ?? ''
  return props.panel.roles[activeTab.value]?.content ?? ''
})

const tokens = computed(() => {
  if (activeTab.value === 'synthesis') return props.panel.synthesis?.tokens ?? 0
  return props.panel.roles[activeTab.value]?.tokens ?? 0
})

const searchQuery = computed(() => {
  if (activeTab.value === 'synthesis') return null
  return props.panel.roles[activeTab.value]?.search_query ?? null
})

function formatTime(ts: Date) {
  return ts?.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) ?? ''
}

const rendered = computed(() => renderMarkdown(content.value))
const activeColor = computed(() => TABS.find(t => t.key === activeTab.value)?.color ?? '#7c6af7')
</script>

<template>
  <div class="panel-card">
    <!-- User question -->
    <div class="panel-question">
      <span class="panel-q-icon">👤</span>
      <span class="panel-q-text">{{ panel.user_message.content }}</span>
      <span class="panel-q-time">{{ formatTime(panel.ts) }}</span>
    </div>

    <!-- Header -->
    <div class="panel-header">
      <span class="panel-badge">🎯 Панельный аудит</span>
      <span v-if="tokens" class="panel-tokens">{{ tokens }} токенов</span>
    </div>

    <!-- Tabs -->
    <div class="panel-tabs">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        class="ptab"
        :class="{ active: activeTab === tab.key }"
        :style="activeTab === tab.key ? `--tc:${tab.color}` : ''"
        @click="activeTab = tab.key"
      >
        <span>{{ tab.emoji }}</span>
        <span class="ptab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Content -->
    <div class="panel-body" :style="`--ac:${activeColor}`">
      <div v-if="searchQuery" class="search-chip" :title="searchQuery">
        🔍 Искал в интернете: <span class="sq">{{ searchQuery }}</span>
      </div>
      <div v-if="content" class="panel-content" v-html="rendered" />
      <div v-else class="panel-empty">Ответ отсутствует</div>
    </div>
  </div>
</template>

<style scoped>
.panel-card {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  overflow: hidden;
  width: 100%;
  max-width: 800px;
  flex-shrink: 0;   /* не давать flex-контейнеру сжимать карточку → content не обрезается, чат скроллится */
}

.panel-question {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  background: rgba(124,106,247,.05);
}
.panel-q-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
.panel-q-text { flex: 1; font-size: 13px; color: var(--text); line-height: 1.5; }
.panel-q-time { font-size: 11px; color: var(--muted); white-space: nowrap; margin-top: 2px; }

.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 16px; border-bottom: 1px solid var(--border);
}
.panel-badge {
  font-size: 11.5px; font-weight: 600; color: #a78bfa;
  background: rgba(167,139,250,.1); padding: 2px 10px; border-radius: 20px;
  border: 1px solid rgba(167,139,250,.2);
}
.panel-tokens { font-size: 10.5px; color: var(--muted); }

.panel-tabs {
  display: flex; gap: 2px; padding: 8px 10px;
  border-bottom: 1px solid var(--border); flex-wrap: wrap;
}
.ptab {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 11px; border-radius: 8px; font-size: 12px;
  border: 1.5px solid var(--border); background: transparent;
  color: var(--muted2); cursor: pointer; transition: all .15s;
}
.ptab:hover { border-color: var(--border2); color: var(--text); background: var(--surface2); }
.ptab.active {
  border-color: var(--tc, var(--accent));
  background: color-mix(in srgb, var(--tc, var(--accent)) 12%, transparent);
  color: var(--text);
}
.ptab-label { font-weight: 500; }

.panel-body {
  padding: 16px;
  border-left: 2px solid var(--ac, var(--accent));
  margin: 12px;
  border-radius: 0 8px 8px 0;
  background: rgba(0,0,0,.08);
}

.panel-content {
  font-size: 14px; line-height: 1.65; color: var(--text);
}
.panel-content :deep(p)      { margin-bottom: 10px; }
.panel-content :deep(p:last-child) { margin-bottom: 0; }
.panel-content :deep(strong) { color: #c4b8ff; font-weight: 600; }
.panel-content :deep(em)     { color: var(--accent-g); font-style: normal; font-weight: 500; }
.panel-content :deep(code)   {
  background: rgba(255,255,255,.06); padding: 1px 6px; border-radius: 4px;
  font-size: 12.5px; font-family: 'JetBrains Mono', monospace; color: #a5f3fc;
}
.panel-content :deep(h2), .panel-content :deep(h3), .panel-content :deep(h4) {
  font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13.5px;
  color: #c4b8ff; margin: 12px 0 6px;
}
.panel-content :deep(ul), .panel-content :deep(ol) { padding-left: 18px; margin-bottom: 10px; }
.panel-content :deep(li)    { margin-bottom: 4px; }
.panel-content :deep(ul) li { list-style: disc; }
.panel-content :deep(ol) li { list-style: decimal; }
.panel-content :deep(a)     { color: #5eead4; text-decoration: underline; }
.panel-content :deep(table) {
  width: 100%; border-collapse: collapse; font-size: 13px; margin: 8px 0;
  display: block; overflow-x: auto;
}
.panel-content :deep(tr:nth-child(even) td) { background: rgba(255,255,255,.02); }
.panel-content :deep(th), .panel-content :deep(td) {
  padding: 6px 12px; border: 1px solid var(--border);
  text-align: left;
}
.panel-content :deep(th) { background: var(--surface2); font-weight: 600; }

.panel-empty { color: var(--muted); font-size: 13px; font-style: italic; }

.search-chip {
  display: inline-flex; align-items: center; gap: 4px; max-width: 100%;
  margin-bottom: 10px; padding: 3px 9px; border-radius: 8px; font-size: 11px;
  color: #5eead4; background: rgba(94,234,212,.08); border: 1px solid rgba(94,234,212,.22);
}
.search-chip .sq { color: var(--muted2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px; }

@media (max-width: 640px) {
  .ptab-label { display: none; }
  .ptab { padding: 5px 8px; }
}
</style>
