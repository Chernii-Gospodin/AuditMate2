<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore, ROLES, QUICK_PROMPTS } from '@/stores/chat'
import { useToastStore } from '@/stores/toast'
import NewChatModal from './NewChatModal.vue'

const chat  = useChatStore()
const toast = useToastStore()

const showNewChatModal = ref(false)
// Inline rename state
const editingChatId   = ref<number | null>(null)
const editingTitle    = ref('')

function startRename(id: number, title: string) {
  editingChatId.value  = id
  editingTitle.value   = title
}

async function commitRename(id: number) {
  if (!editingTitle.value.trim()) { cancelRename(); return }
  try {
    await chat.renameChat(id, editingTitle.value.trim())
  } catch (e: unknown) {
    toast.error('Ошибка', (e as Error).message)
  }
  cancelRename()
}

function cancelRename() { editingChatId.value = null; editingTitle.value = '' }

function onRenameKey(e: KeyboardEvent, id: number) {
  if (e.key === 'Enter') commitRename(id)
  if (e.key === 'Escape') cancelRename()
}

function roleEmoji(roleId: string) {
  return ROLES.find(r => r.id === roleId)?.emoji ?? '💬'
}
</script>

<template>
  <aside class="sidebar">
    <!-- New chat button -->
    <div class="sidebar-top">
      <button class="new-chat-btn" @click="showNewChatModal = true">
        ✏️ Новый чат
      </button>
    </div>

    <!-- Chat history -->
    <section class="section">
      <div class="section-title">История чатов</div>
      <div v-if="chat.chatsLoading" class="loading-row">Загрузка...</div>
      <div v-else-if="!chat.chatList.length" class="empty-hint">Чатов пока нет</div>
      <div v-else class="chat-list">
        <div
          v-for="c in chat.chatList"
          :key="c.id"
          class="chat-item"
          :class="{ active: chat.activeChatId === c.id }"
          @click="chat.openChat(c.id)"
        >
          <span class="ci-emoji">{{ roleEmoji(c.ai_role) }}</span>
          <div class="ci-body">
            <!-- Inline rename input -->
            <input
              v-if="editingChatId === c.id"
              v-model="editingTitle"
              class="rename-input"
              @click.stop
              @keydown="onRenameKey($event, c.id)"
              @blur="commitRename(c.id)"
              v-focus
            />
            <div v-else class="ci-title" @dblclick.stop="startRename(c.id, c.title)">{{ c.title }}</div>
            <div class="ci-meta">{{ c.project_name }} · {{ c.message_count }} сообщ.</div>
          </div>
          <div class="ci-actions" @click.stop>
            <button class="ci-btn" title="Переименовать" @click="startRename(c.id, c.title)">✎</button>
            <button class="ci-btn del" title="Удалить" @click="chat.deleteChat(c.id)">✕</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Checklist (only when chat is open) -->
    <template v-if="chat.activeChatId">
      <section class="section">
        <div class="section-title">Чек-лист аудита</div>
        <ul class="checklist">
          <li
            v-for="(item, i) in chat.checklist"
            :key="i"
            class="check-item"
            :class="{ done: item.done }"
            @click="chat.toggleCheck(i)"
          >
            <div class="check-box">
              <svg v-if="item.done" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span>{{ item.label }}</span>
          </li>
        </ul>
      </section>

      <section class="section">
        <div class="progress-header">
          <span class="section-title" style="margin-bottom:0">Прогресс</span>
          <span class="progress-val syne">{{ chat.progress }}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: chat.progress + '%' }" />
        </div>
      </section>

      <section class="section">
        <div class="section-title">Быстрый старт</div>
        <div class="quick-list">
          <button
            v-for="p in QUICK_PROMPTS"
            :key="p.label"
            class="quick-btn"
            @click="chat.inputText = p.text"
          >
            <span class="q-icon">{{ p.icon }}</span>{{ p.label }}
          </button>
        </div>
      </section>
    </template>
  </aside>

  <NewChatModal v-if="showNewChatModal" @close="showNewChatModal = false" />
</template>

<!-- v-focus directive -->
<script lang="ts">
export default {
  directives: {
    focus: { mounted(el: HTMLElement) { el.focus() } },
  },
}
</script>

<style scoped>
.sidebar {
  width: 272px; flex-shrink: 0;
  background: var(--surface); border-right: 1px solid var(--border);
  display: flex; flex-direction: column; overflow-y: auto; padding-bottom: 20px;
}
.sidebar-top { padding: 14px 14px 0; }
.new-chat-btn {
  width: 100%; padding: 9px 14px; border-radius: 10px;
  border: 1.5px dashed var(--border2); background: transparent;
  color: var(--muted2); font-size: 13px; cursor: pointer; transition: all .15s; text-align: left;
}
.new-chat-btn:hover { border-color: var(--accent); color: var(--accent); background: rgba(124,106,247,.06); }

.section { padding: 16px 14px 0; }
.section + .section { padding-top: 20px; }
.section-title {
  font-size: 10px; font-weight: 600; letter-spacing: 1.2px;
  text-transform: uppercase; color: var(--muted); margin-bottom: 10px; display: block;
}
.loading-row { font-size: 12px; color: var(--muted); padding: 6px 2px; }
.empty-hint  { font-size: 12px; color: var(--muted); padding: 6px 2px; font-style: italic; }

/* Chat list */
.chat-list { display: flex; flex-direction: column; gap: 4px; }
.chat-item {
  display: flex; align-items: center; gap: 9px; padding: 9px 10px;
  border-radius: 10px; border: 1px solid transparent;
  background: transparent; width: 100%; cursor: pointer;
  transition: all .15s; color: var(--text); position: relative;
}
.chat-item:hover { background: var(--surface2); border-color: var(--border); }
.chat-item.active { background: rgba(124,106,247,.1); border-color: rgba(124,106,247,.3); }
.ci-emoji { font-size: 16px; flex-shrink: 0; }
.ci-body  { flex: 1; min-width: 0; }
.ci-title { font-size: 12.5px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: text; }
.ci-meta  { font-size: 11px; color: var(--muted); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.rename-input {
  width: 100%; background: var(--surface2); border: 1px solid var(--accent);
  border-radius: 5px; color: var(--text); font-size: 12.5px; font-family: inherit;
  padding: 2px 6px; outline: none;
}

.ci-actions {
  display: flex; gap: 3px; flex-shrink: 0;
  opacity: 0; transition: opacity .15s;
}
.chat-item:hover .ci-actions { opacity: 1; }
.ci-btn {
  background: none; border: none; color: var(--muted);
  cursor: pointer; font-size: 12px; padding: 3px 5px; border-radius: 5px; transition: all .15s;
}
.ci-btn:hover     { color: var(--text); background: var(--border2); }
.ci-btn.del:hover { color: var(--danger); }

/* Checklist */
.checklist { list-style: none; display: flex; flex-direction: column; gap: 5px; }
.check-item {
  display: flex; align-items: center; gap: 9px; padding: 8px 11px; border-radius: 9px;
  background: var(--surface2); border: 1px solid var(--border);
  cursor: pointer; font-size: 12px; color: var(--muted2); user-select: none; transition: all .15s;
}
.check-item:hover { border-color: var(--border2); color: var(--text); }
.check-item.done  { color: var(--muted); }
.check-item.done span { text-decoration: line-through; }
.check-box {
  width: 17px; height: 17px; border-radius: 5px; flex-shrink: 0;
  border: 1.5px solid var(--border2); display: flex; align-items: center; justify-content: center;
  transition: all .2s; color: var(--bg);
}
.check-item.done .check-box { background: var(--accent-g); border-color: var(--accent-g); }
.check-box svg { width: 11px; height: 11px; }

/* Progress */
.progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.progress-val    { font-size: 17px; font-weight: 800; color: var(--accent); }
.progress-track  { height: 4px; background: var(--border2); border-radius: 2px; overflow: hidden; }
.progress-fill   { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-g)); border-radius: 2px; transition: width .5s cubic-bezier(.4,0,.2,1); }

/* Quick prompts */
.quick-list { display: flex; flex-direction: column; gap: 5px; }
.quick-btn {
  display: flex; align-items: center; gap: 9px; padding: 9px 11px; border-radius: 9px;
  background: var(--surface2); border: 1px solid var(--border); color: var(--muted2);
  font-size: 12px; cursor: pointer; transition: all .15s; text-align: left; width: 100%;
}
.quick-btn:hover { border-color: var(--border2); color: var(--text); transform: translateX(3px); }
.q-icon { font-size: 13px; flex-shrink: 0; }

@media (max-width: 768px) {
  .sidebar { width: 100%; position: fixed; left: -100%; top: 60px; bottom: 0; z-index: 50; transition: left .25s; }
  .sidebar.open { left: 0; }
}
</style>
