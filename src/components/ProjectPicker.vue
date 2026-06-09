<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChatStore, ROLES, NO_PROJECT } from '@/stores/chat'
import { useToastStore } from '@/stores/toast'
import type { RoleId } from '@/api'

const chat  = useChatStore()
const toast = useToastStore()

const selectedProject = ref(chat.allProjects[0] ?? NO_PROJECT)
const selectedRole    = ref<RoleId>('founder')
const creating        = ref(false)

// Project management state
const showManager     = ref(false)
const newProjectName  = ref('')
const editingId       = ref<number | null>(null)
const editingName     = ref('')

const canStart = computed(() => !!selectedRole.value)

async function startChat() {
  if (!canStart.value || creating.value) return
  creating.value = true
  try {
    const c = await chat.createChat(selectedProject.value, selectedRole.value)
    await chat.openChat(c.id)
  } catch (e: unknown) {
    toast.error('Ошибка', (e as Error).message)
    creating.value = false
  }
}

function addProject() {
  const n = newProjectName.value.trim()
  if (!n) return
  const p = chat.addCustomProject(n)
  selectedProject.value = p
  newProjectName.value = ''
  toast.success('Проект добавлен', `«${p.name}» создан`)
}

function startEdit(id: number, name: string) {
  editingId.value   = id
  editingName.value = name
}

function commitEdit(id: number) {
  if (editingName.value.trim()) chat.renameProject(id, editingName.value)
  editingId.value = null
}

function removeProject(id: number) {
  if (id === 0) return
  // If selected, reset to NO_PROJECT
  if (selectedProject.value.id === id) selectedProject.value = NO_PROJECT
  chat.deleteProject(id)
}
</script>

<template>
  <div class="picker">
    <div class="picker-glow" />
    <div class="picker-inner">

      <!-- Header -->
      <div class="picker-header">
        <div class="picker-icon">📁</div>
        <h2 class="syne picker-title">Новый аудит</h2>
        <p class="picker-desc">Выберите роль ИИ и проект (или начните без проекта)</p>
      </div>

      <!-- ── Step 1: Role ── -->
      <div class="step">
        <div class="step-label">1. Роль AI-ассистента</div>
        <div class="roles-grid">
          <button
            v-for="role in ROLES"
            :key="role.id"
            class="role-card"
            :class="{ active: selectedRole === role.id }"
            :style="selectedRole === role.id ? `--rc:${role.color}` : ''"
            @click="selectedRole = role.id"
          >
            <div class="rc-head">
              <span class="rc-emoji">{{ role.emoji }}</span>
              <div v-if="selectedRole === role.id" class="rc-check">✓</div>
            </div>
            <div class="rc-name">{{ role.name }}</div>
            <div class="rc-desc">{{ role.desc }}</div>
          </button>
        </div>
      </div>

      <!-- ── Step 2: Project ── -->
      <div class="step">
        <div class="step-head">
          <div class="step-label">2. Проект <span class="step-opt">(необязательно)</span></div>
          <button class="manage-btn" @click="showManager = !showManager">
            {{ showManager ? '▲ Скрыть' : '⚙ Управление' }}
          </button>
        </div>

        <!-- Project manager panel -->
        <div v-if="showManager" class="manager-panel">
          <div class="add-row">
            <input v-model="newProjectName" placeholder="Название нового проекта" @keydown.enter="addProject" />
            <button class="add-btn" :disabled="!newProjectName.trim()" @click="addProject">+ Добавить</button>
          </div>
          <div class="mgr-list">
            <div
              v-for="p in chat.allProjects.filter(x => x.id !== 0)"
              :key="p.id"
              class="mgr-item"
            >
              <input
                v-if="editingId === p.id"
                v-model="editingName"
                class="mgr-input"
                @blur="commitEdit(p.id)"
                @keydown.enter="commitEdit(p.id)"
                @keydown.escape="editingId = null"
                v-focus
              />
              <span v-else class="mgr-name" @dblclick="startEdit(p.id, p.name)">{{ p.name }}</span>
              <div class="mgr-actions">
                <button class="mgr-btn" title="Переименовать" @click="startEdit(p.id, p.name)">✎</button>
                <button class="mgr-btn del" title="Удалить/скрыть" @click="removeProject(p.id)">✕</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Project list -->
        <div v-if="chat.projectsLoading" class="p-loading"><span class="spinner" /> Загрузка...</div>
        <div v-else class="projects-list">
          <button
            v-for="p in chat.allProjects"
            :key="p.id"
            class="project-card"
            :class="{ selected: selectedProject.id === p.id }"
            @click="selectedProject = p"
          >
            <div class="pc-icon">{{ p.id === 0 ? '🌐' : '📋' }}</div>
            <div class="pc-body">
              <div class="pc-name">{{ p.name }}</div>
              <div class="pc-meta">{{ p.id === 0 ? 'Без привязки к проекту' : `${p.task_count} задач` }}</div>
            </div>
            <div v-if="selectedProject.id === p.id" class="pc-check">✓</div>
          </button>
        </div>
      </div>

      <!-- CTA -->
      <button class="start-btn" :disabled="!canStart || creating" @click="startChat">
        <span v-if="creating" class="spinner white" />
        <span v-else>Начать аудит →</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  directives: {
    focus: { mounted(el: HTMLElement) { el.focus() } },
  },
}
</script>

<style scoped>
.picker {
  flex: 1; display: flex; align-items: flex-start; justify-content: center;
  padding: 32px 24px; overflow-y: auto; position: relative;
}
.picker-glow {
  position: fixed; width: 600px; height: 500px; pointer-events: none;
  background: radial-gradient(ellipse, rgba(124,106,247,.09) 0%, transparent 70%);
  top: 30%; left: 50%; transform: translate(-50%,-50%);
}
.picker-inner {
  position: relative; z-index: 1; width: 100%; max-width: 680px;
  display: flex; flex-direction: column; gap: 28px;
}
.picker-header { display: flex; flex-direction: column; gap: 6px; }
.picker-icon   { font-size: 40px; }
.picker-title  { font-size: 26px; font-weight: 800; margin: 0; }
.picker-desc   { color: var(--muted2); font-size: 13.5px; }

/* Steps */
.step { display: flex; flex-direction: column; gap: 12px; }
.step-head  { display: flex; align-items: center; justify-content: space-between; }
.step-label { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); }
.step-opt   { font-weight: 400; text-transform: none; font-size: 10px; }
.manage-btn {
  font-size: 11px; padding: 4px 10px; border-radius: 7px; border: 1px solid var(--border2);
  background: transparent; color: var(--muted2); cursor: pointer; transition: all .15s;
}
.manage-btn:hover { color: var(--text); border-color: var(--accent); }

/* Role cards */
.roles-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.role-card {
  padding: 14px 12px; border-radius: 12px; border: 1.5px solid var(--border);
  background: var(--surface); text-align: left; cursor: pointer; transition: all .15s;
  display: flex; flex-direction: column; gap: 6px;
}
.role-card:hover  { border-color: var(--border2); background: var(--surface2); }
.role-card.active {
  border-color: var(--rc, var(--accent));
  background: color-mix(in srgb, var(--rc, var(--accent)) 10%, transparent);
}
.rc-head    { display: flex; align-items: center; justify-content: space-between; }
.rc-emoji   { font-size: 22px; }
.rc-check   { color: var(--accent-g); font-size: 14px; font-weight: 700; }
.rc-name    { font-size: 12px; font-weight: 600; color: var(--text); }
.rc-desc    { font-size: 11px; color: var(--muted); line-height: 1.4; }

/* Manager panel */
.manager-panel {
  background: var(--surface2); border: 1px solid var(--border2);
  border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px;
}
.add-row { display: flex; gap: 8px; }
.add-row input {
  flex: 1; padding: 8px 10px; background: var(--surface); border: 1px solid var(--border2);
  border-radius: 8px; color: var(--text); font-size: 13px; font-family: inherit; outline: none;
  transition: border-color .2s;
}
.add-row input:focus { border-color: rgba(124,106,247,.5); }
.add-row input::placeholder { color: var(--muted); }
.add-btn {
  padding: 8px 14px; border-radius: 8px; background: rgba(124,106,247,.15);
  border: 1px solid rgba(124,106,247,.3); color: var(--accent-g); font-size: 12.5px;
  cursor: pointer; transition: all .15s; white-space: nowrap;
}
.add-btn:hover:not(:disabled) { background: rgba(124,106,247,.25); }
.add-btn:disabled { opacity: .4; cursor: not-allowed; }

.mgr-list { display: flex; flex-direction: column; gap: 5px; max-height: 160px; overflow-y: auto; }
.mgr-item {
  display: flex; align-items: center; gap: 8px; padding: 6px 8px;
  border-radius: 7px; background: var(--surface); border: 1px solid var(--border);
}
.mgr-name   { flex: 1; font-size: 12.5px; cursor: text; }
.mgr-input  {
  flex: 1; background: none; border: none; border-bottom: 1px solid var(--accent);
  color: var(--text); font-size: 12.5px; font-family: inherit; outline: none; padding: 1px 2px;
}
.mgr-actions { display: flex; gap: 3px; }
.mgr-btn {
  background: none; border: none; color: var(--muted); cursor: pointer;
  font-size: 12px; padding: 2px 5px; border-radius: 4px; transition: all .15s;
}
.mgr-btn:hover     { color: var(--text); background: var(--border2); }
.mgr-btn.del:hover { color: var(--danger); }

/* Projects list */
.p-loading { display: flex; align-items: center; gap: 10px; padding: 20px; color: var(--muted); font-size: 13px; justify-content: center; }
.projects-list { display: flex; flex-direction: column; gap: 6px; max-height: 260px; overflow-y: auto; }
.project-card {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  border-radius: 12px; border: 1.5px solid var(--border);
  background: var(--surface); width: 100%; cursor: pointer;
  text-align: left; transition: all .15s; color: var(--text);
}
.project-card:hover    { border-color: var(--border2); background: var(--surface2); }
.project-card.selected { border-color: var(--accent); background: rgba(124,106,247,.08); }
.pc-icon { font-size: 20px; flex-shrink: 0; }
.pc-body { flex: 1; min-width: 0; }
.pc-name { font-size: 13.5px; font-weight: 500; }
.pc-meta { font-size: 11px; color: var(--muted); margin-top: 2px; }
.pc-check { color: var(--accent); font-weight: 700; font-size: 16px; flex-shrink: 0; }

/* Start button */
.start-btn {
  padding: 14px; border-radius: 12px; border: none;
  background: linear-gradient(135deg, var(--accent), #5b4fcf);
  color: #fff; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 15px;
  cursor: pointer; transition: all .2s; min-height: 50px;
  display: flex; align-items: center; justify-content: center;
}
.start-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
.start-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }

@media (max-width: 640px) {
  .roles-grid { grid-template-columns: 1fr 1fr; }
}
</style>
