<script setup lang="ts">
import { computed } from 'vue'
import type { Message } from '@/stores/chat'
import type { Role } from '@/api'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{
  message: Message
  role: Role | undefined
  streaming?: boolean
  streamContent?: string
}>()

function formatTime(ts: Date) {
  return ts?.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) ?? ''
}

/* During streaming: show escaped plain text with cursor */
function renderPlain(text: string): string {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')
}

const rendered = computed(() => {
  if (props.streaming) {
    return renderPlain(props.streamContent ?? '') + '<span class="cursor">▍</span>'
  }
  if (props.message.role === 'assistant') return renderMarkdown(props.message.content)
  return props.message.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')
})
</script>

<template>
  <div class="msg" :class="message.role">
    <!-- Avatar -->
    <div class="msg-avatar" :class="message.role">
      <span>{{ message.role === 'assistant' ? (role?.emoji ?? '🤖') : '👤' }}</span>
    </div>

    <!-- Content -->
    <div class="msg-content">
      <div class="msg-meta">
        <span class="msg-author">{{ message.role === 'user' ? 'Вы' : role?.name }}</span>
        <span class="msg-time">{{ formatTime(message.ts) }}</span>
        <span v-if="message.tokens" class="msg-tokens">{{ message.tokens }} токенов</span>
      </div>
      <div v-if="message.searchQuery" class="search-chip" :title="message.searchQuery">
        🔍 Искал в интернете: <span class="sq">{{ message.searchQuery }}</span>
      </div>
      <div class="msg-bubble" v-html="rendered" />
    </div>
  </div>
</template>

<style scoped>
.msg { display: flex; gap: 12px; max-width: 800px; }
.msg.user { flex-direction: row-reverse; align-self: flex-end; max-width: 640px; }

.msg-avatar {
  width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 15px;
}
.msg-avatar.assistant { background: linear-gradient(135deg, var(--accent), var(--accent-g)); }
.msg-avatar.user      { background: var(--surface2); border: 1px solid var(--border2); }

.msg-content { flex: 1; min-width: 0; }
.msg-meta {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 5px; font-size: 11px; color: var(--muted);
}
.msg.user .msg-meta { flex-direction: row-reverse; }
.msg-author { font-weight: 500; }
.msg-tokens {
  padding: 1px 6px; border-radius: 6px;
  background: var(--surface2); border: 1px solid var(--border); font-size: 10px;
}
.search-chip {
  display: inline-flex; align-items: center; gap: 4px; max-width: 100%;
  margin-bottom: 6px; padding: 3px 9px; border-radius: 8px; font-size: 11px;
  color: #5eead4; background: rgba(94,234,212,.08); border: 1px solid rgba(94,234,212,.22);
}
.search-chip .sq { color: var(--muted2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px; }

.msg-bubble {
  padding: 12px 16px; border-radius: 14px;
  font-size: 14px; line-height: 1.65;
}
.msg.assistant .msg-bubble {
  background: var(--surface); border: 1px solid var(--border); border-top-left-radius: 4px;
}
.msg.user .msg-bubble {
  background: rgba(124,106,247,.1); border: 1px solid rgba(124,106,247,.2); border-top-right-radius: 4px;
}

/* Streaming cursor */
.msg-bubble :deep(.cursor) {
  display: inline-block; color: var(--accent);
  animation: blink .7s step-end infinite;
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

/* Markdown */
.msg-bubble :deep(p)      { margin-bottom: 10px; }
.msg-bubble :deep(p:last-child) { margin-bottom: 0; }
.msg-bubble :deep(strong) { color: #c4b8ff; font-weight: 600; }
.msg-bubble :deep(em)     { color: var(--accent-g); font-style: normal; font-weight: 500; }
.msg-bubble :deep(code)   {
  background: rgba(255,255,255,.06); padding: 1px 6px; border-radius: 4px;
  font-size: 12.5px; font-family: 'JetBrains Mono', monospace; color: #a5f3fc;
}
.msg-bubble :deep(pre)   {
  background: rgba(0,0,0,.3); border: 1px solid var(--border2);
  border-radius: 8px; padding: 12px; overflow-x: auto; margin: 8px 0;
}
.msg-bubble :deep(pre) code { background: none; padding: 0; color: var(--text); }
.msg-bubble :deep(h2), .msg-bubble :deep(h3), .msg-bubble :deep(h4) {
  font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13.5px;
  color: #c4b8ff; margin: 12px 0 6px;
}
.msg-bubble :deep(ul), .msg-bubble :deep(ol) { padding-left: 18px; margin-bottom: 10px; }
.msg-bubble :deep(li)        { margin-bottom: 4px; }
.msg-bubble :deep(ul) li     { list-style: disc; }
.msg-bubble :deep(ol) li     { list-style: decimal; }

/* Таблицы (markdown GFM) */
.msg-bubble :deep(table) {
  width: 100%; border-collapse: collapse; font-size: 13px; margin: 10px 0;
  display: block; overflow-x: auto;
}
.msg-bubble :deep(th), .msg-bubble :deep(td) {
  padding: 6px 12px; border: 1px solid var(--border); text-align: left; vertical-align: top;
}
.msg-bubble :deep(th) { background: var(--surface2); font-weight: 600; color: #c4b8ff; }
.msg-bubble :deep(tr:nth-child(even) td) { background: rgba(255,255,255,.02); }
.msg-bubble :deep(a) { color: #5eead4; text-decoration: underline; }
</style>
