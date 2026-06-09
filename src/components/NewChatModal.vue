<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChatStore, ROLES, NO_PROJECT } from '@/stores/chat'
import { useToastStore } from '@/stores/toast'
import type { RoleId } from '@/api'

const emit = defineEmits<{ close: [] }>()
const chat  = useChatStore()
const toast = useToastStore()

const selectedProjectId = ref<number>(chat.allProjects[0]?.id ?? 0)
const selectedRole      = ref<RoleId>('founder')
const title             = ref('')
const creating          = ref(false)

const selectedProject = computed(() =>
  chat.allProjects.find(p => p.id === selectedProjectId.value) ?? NO_PROJECT
)

async function create() {
  if (creating.value) return
  creating.value = true
  try {
    const c = await chat.createChat(selectedProject.value, selectedRole.value, title.value || undefined)
    await chat.openChat(c.id)
    emit('close')
  } catch (e: unknown) {
    toast.error('Ошибка', (e as Error).message)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h3 class="syne">Новый чат</h3>
          <button class="close-btn" @click="emit('close')">✕</button>
        </div>

        <!-- Title (optional) -->
        <div class="field">
          <label>Название чата <span class="optional">(необязательно)</span></label>
          <input v-model="title" type="text" placeholder="Авто-сгенерируется" />
        </div>

        <!-- Role -->
        <div class="field">
          <label>Роль AI-ассистента</label>
          <div class="roles-grid">
            <button
              v-for="r in ROLES"
              :key="r.id"
              class="role-chip"
              :class="{ active: selectedRole === r.id }"
              :style="selectedRole === r.id ? `--rc:${r.color}` : ''"
              @click="selectedRole = r.id"
            >
              <span class="rc-emoji">{{ r.emoji }}</span>
              <span class="rc-name">{{ r.name }}</span>
            </button>
          </div>
        </div>

        <!-- Project -->
        <div class="field">
          <label>Проект <span class="optional">(необязательно)</span></label>
          <select v-model="selectedProjectId" class="select">
            <option v-for="p in chat.allProjects" :key="p.id" :value="p.id">
              {{ p.id === 0 ? '🌐 ' : '📁 ' }}{{ p.name }}{{ p.task_count ? ` (${p.task_count} задач)` : '' }}
            </option>
          </select>
        </div>

        <button class="create-btn" :disabled="creating" @click="create">
          <span v-if="creating" class="spinner white sm" />
          <span v-else>Создать чат →</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: 16px;
}
.modal {
  background: var(--surface); border: 1px solid var(--border2);
  border-radius: 18px; padding: 28px; width: 100%; max-width: 460px;
  box-shadow: 0 24px 64px rgba(0,0,0,.6);
  display: flex; flex-direction: column; gap: 20px;
}
.modal-header { display: flex; align-items: center; justify-content: space-between; }
.modal-header h3 { font-size: 18px; font-weight: 800; }
.close-btn {
  background: none; border: none; color: var(--muted); cursor: pointer;
  font-size: 16px; padding: 4px 8px; border-radius: 6px; transition: all .15s;
}
.close-btn:hover { color: var(--text); background: var(--surface2); }

.field { display: flex; flex-direction: column; gap: 8px; }
.field label { font-size: 11.5px; font-weight: 600; letter-spacing: .6px; text-transform: uppercase; color: var(--muted); }
.optional { font-weight: 400; text-transform: none; letter-spacing: 0; font-size: 10px; color: var(--muted); }

.field input, .select {
  width: 100%; padding: 10px 12px;
  background: var(--surface2); border: 1.5px solid var(--border2);
  border-radius: 9px; color: var(--text); font-size: 13.5px; font-family: inherit;
  outline: none; transition: border-color .2s;
}
.field input:focus, .select:focus { border-color: rgba(124,106,247,.55); }
.field input::placeholder { color: var(--muted); }

.roles-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.role-chip {
  padding: 9px 12px; border-radius: 10px; border: 1.5px solid var(--border);
  background: var(--surface2); color: var(--muted2); font-size: 12px;
  cursor: pointer; transition: all .15s; text-align: left; display: flex; align-items: center; gap: 8px;
}
.role-chip:hover { border-color: var(--border2); color: var(--text); }
.role-chip.active {
  border-color: var(--rc, var(--accent)); color: var(--text);
  background: color-mix(in srgb, var(--rc, var(--accent)) 12%, transparent);
}
.rc-emoji { font-size: 16px; }
.rc-name  { font-size: 12px; font-weight: 500; }

.create-btn {
  padding: 12px; border-radius: 11px; border: none;
  background: linear-gradient(135deg, var(--accent), #5b4fcf);
  color: #fff; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px;
  cursor: pointer; transition: all .2s; min-height: 46px;
  display: flex; align-items: center; justify-content: center;
}
.create-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
.create-btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }
</style>
