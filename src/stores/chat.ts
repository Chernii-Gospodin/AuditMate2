import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { odooApi, chatsApi, type Project, type ChatOut, type MessageOut, type RoleId, type PanelResponseOut } from '@/api'

// ── Constants ──────────────────────────────────────────────────────────────────

export const ROLES = [
  { id: 'founder'  as RoleId, name: 'Помощник основателя', emoji: '🚀', color: '#7c6af7', desc: 'Помогает оценить идею и подготовиться к питчу' },
  { id: 'investor' as RoleId, name: 'Оценщик инвестора',   emoji: '💼', color: '#5eead4', desc: 'Анализирует рынок, трекшн, unit economics' },
  { id: 'mentor'   as RoleId, name: 'Ментор акселератора', emoji: '🎓', color: '#fbbf24', desc: 'Готовит команду к Demo Day' },
  { id: 'critic'    as RoleId, name: 'Жёсткий критик',      emoji: '🔍', color: '#fb7185', desc: 'Находит риски и слабые места без прикрас' },
  { id: 'marketer'  as RoleId, name: 'Маркетолог (CMO)',    emoji: '📊', color: '#ec4899', desc: 'GTM, каналы привлечения, CAC/LTV, бренд' },
  { id: 'financier' as RoleId, name: 'Финансист (CFO)',     emoji: '💰', color: '#22c55e', desc: 'Финмодель, unit-экономика, burn/runway' },
  { id: 'lawyer'    as RoleId, name: 'Юрист',               emoji: '⚖️', color: '#38bdf8', desc: 'Право, IP, договоры, регуляторика' },
]

// Роли с always-on веб-поиском — для live-индикатора «ищет в интернете…»
export const SEARCH_ROLES: RoleId[] = ['investor', 'critic', 'marketer', 'lawyer']

// Рекомендованная температура по ролям (зеркало backend ROLE_TEMPERATURE в ai.py).
// Используется для отображения значения в режиме «Авто», когда пользователь не задал своё.
export const ROLE_TEMPS: Record<RoleId, number> = {
  founder: 0.9, marketer: 0.85, mentor: 0.8, investor: 0.6, financier: 0.45, critic: 0.4, lawyer: 0.35,
}

export const QUICK_PROMPTS = [
  { icon: '▶',  label: 'Начать аудит с нуля',  text: 'Помоги провести полный аудит моего стартапа. С чего начать?' },
  { icon: '💡', label: 'Оценить идею',          text: 'Оцени мою идею: ' },
  { icon: '⚠️', label: 'Анализ рисков',         text: 'Какие риски есть у моего стартапа?' },
  { icon: '🎯', label: 'Подготовка к питчу',    text: 'Как подготовиться к питчу перед инвесторами?' },
  { icon: '🔎', label: 'Анализ конкурентов',    text: 'Помоги проанализировать конкурентов в моей нише' },
]

const CHECKLIST_ITEMS = [
  'Проблема описана чётко', 'Целевая аудитория определена',
  'Уникальность решения',   'Конкуренты проанализированы',
  'Бизнес-модель понятна',  'Финансовая модель готова',
  'Команда сформирована',   'MVP готов или описан',
]

// ── Project CRUD (localStorage) ────────────────────────────────────────────────
const LS_CUSTOM    = 'am_custom_projects'
const LS_HIDDEN    = 'am_hidden_projects'
const LS_OVERRIDES = 'am_project_overrides'

// Synthetic "no project" entry
export const NO_PROJECT: Project = { id: 0, name: 'Без проекта', description: '', task_count: 0 }

// ── Message type with streaming state ─────────────────────────────────────────
export interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  model?: string | null
  tokens?: number | null
  searchQuery?: string | null
  ts: Date
}

// ── Panel audit group (one per panel_id) ───────────────────────────────────────
export interface PanelGroup {
  type: 'panel'
  panel_id: string
  user_message: MessageOut
  roles: Record<string, MessageOut>   // founder|investor|mentor|critic
  synthesis: MessageOut | null
  ts: Date
}

export type ChatItem = Message | PanelGroup

/** Type guard */
export function isPanelGroup(item: ChatItem): item is PanelGroup {
  return (item as PanelGroup).type === 'panel'
}

/** Groups raw MessageOut[] (with panel_id) into ChatItem[] maintaining order */
function groupMessages(raw: MessageOut[]): ChatItem[] {
  const result: ChatItem[] = []
  const panelsSeen: Record<string, PanelGroup> = {}

  for (const msg of raw) {
    if (!msg.panel_id) {
      result.push({ id: msg.id, role: msg.role as 'user' | 'assistant', content: msg.content, model: msg.model, tokens: msg.tokens, searchQuery: msg.search_query, ts: new Date(msg.created_at) })
    } else {
      if (!panelsSeen[msg.panel_id]) {
        const group: PanelGroup = { type: 'panel', panel_id: msg.panel_id, user_message: msg, roles: {}, synthesis: null, ts: new Date(msg.created_at) }
        panelsSeen[msg.panel_id] = group
        result.push(group)
      }
      const g = panelsSeen[msg.panel_id]
      if (msg.role === 'user') { g.user_message = msg; g.ts = new Date(msg.created_at) }
      else if (msg.sub_role === 'synthesis') g.synthesis = msg
      else if (msg.sub_role) g.roles[msg.sub_role] = msg
    }
  }
  return result
}

// ── Store ──────────────────────────────────────────────────────────────────────
export const useChatStore = defineStore('chat', () => {

  // ── Odoo projects ──
  const odooProjects    = ref<Project[]>([])
  const projectsLoading = ref(false)

  // ── Project overrides (localStorage) ──
  const customProjects   = ref<Project[]>(JSON.parse(localStorage.getItem(LS_CUSTOM)    ?? '[]'))
  const hiddenSet        = ref<Set<number>>(new Set(JSON.parse(localStorage.getItem(LS_HIDDEN) ?? '[]')))
  const nameOverrides    = ref<Record<number, string>>(JSON.parse(localStorage.getItem(LS_OVERRIDES) ?? '{}'))

  // ── Chat list ──
  const chatList     = ref<ChatOut[]>([])
  const chatsLoading = ref(false)

  // ── Active chat ──
  const activeChatId   = ref<number | null>(null)
  const messages       = ref<ChatItem[]>([])
  const isLoading      = ref(false)
  const isPanelLoading = ref(false)
  const error          = ref<string | null>(null)
  const inputText      = ref('')

  // ── Температура LLM (глобальная настройка) ──
  // null → «Авто» (бэкенд берёт температуру по роли); число → пользовательское переопределение
  const LS_TEMP   = 'am_temperature'
  const _rawTemp  = localStorage.getItem(LS_TEMP)
  const temperature = ref<number | null>(_rawTemp === null ? null : Number(_rawTemp))
  function setTemperature(v: number | null) {
    temperature.value = v
    if (v === null) localStorage.removeItem(LS_TEMP)
    else            localStorage.setItem(LS_TEMP, String(v))
  }

  // ── Streaming ──
  const streamingMsgId  = ref<number | null>(null)
  const streamingContent = ref('')

  // ── Checklist ──
  const checklist = ref(CHECKLIST_ITEMS.map(label => ({ label, done: false })))

  // ── Computed ──────────────────────────────────────────────────────────────────

  const allProjects = computed<Project[]>(() => {
    const odoo = odooProjects.value
      .filter(p => !hiddenSet.value.has(p.id))
      .map(p => ({ ...p, name: nameOverrides.value[p.id] ?? p.name }))
    return [NO_PROJECT, ...odoo, ...customProjects.value]
  })

  const activeChat = computed(() => chatList.value.find(c => c.id === activeChatId.value) ?? null)
  const activeRole = computed(() => ROLES.find(r => r.id === activeChat.value?.ai_role) ?? ROLES[0])
  const hasMessages = computed(() => messages.value.length > 0)
  const progress    = computed(() => {
    const done = checklist.value.filter(i => i.done).length
    return Math.round((done / checklist.value.length) * 100)
  })

  /** Maps projectId → { roleId → chatId } — for role-tab switching */
  const roleChatsMap = computed(() => {
    const m: Record<number, Record<string, number>> = {}
    for (const c of chatList.value) {
      if (!m[c.odoo_project_id]) m[c.odoo_project_id] = {}
      m[c.odoo_project_id][c.ai_role] = c.id
    }
    return m
  })

  // ── Project CRUD ──────────────────────────────────────────────────────────────

  function _saveCustom()    { localStorage.setItem(LS_CUSTOM,    JSON.stringify(customProjects.value)) }
  function _saveHidden()    { localStorage.setItem(LS_HIDDEN,    JSON.stringify([...hiddenSet.value])) }
  function _saveOverrides() { localStorage.setItem(LS_OVERRIDES, JSON.stringify(nameOverrides.value)) }

  function addCustomProject(name: string): Project {
    const p: Project = { id: -Date.now(), name: name.trim(), description: '', task_count: 0 }
    customProjects.value.push(p)
    _saveCustom()
    return p
  }

  function renameProject(id: number, name: string) {
    const n = name.trim()
    if (!n) return
    if (id < 0) {
      const p = customProjects.value.find(x => x.id === id)
      if (p) { p.name = n; _saveCustom() }
    } else {
      nameOverrides.value[id] = n
      _saveOverrides()
    }
  }

  function deleteProject(id: number) {
    if (id < 0) {
      customProjects.value = customProjects.value.filter(p => p.id !== id)
      _saveCustom()
    } else if (id > 0) {
      hiddenSet.value = new Set([...hiddenSet.value, id])
      _saveHidden()
    }
  }

  // ── Load data ──────────────────────────────────────────────────────────────────

  async function loadProjects() {
    projectsLoading.value = true
    try { odooProjects.value = await odooApi.projects() }
    catch { odooProjects.value = [] }
    finally { projectsLoading.value = false }
  }

  async function loadChats() {
    chatsLoading.value = true
    try { chatList.value = await chatsApi.list() }
    catch { /* silently ignore */ }
    finally { chatsLoading.value = false }
  }

  // ── Chat actions ───────────────────────────────────────────────────────────────

  async function createChat(project: Project, role: RoleId, title?: string): Promise<ChatOut> {
    const t = title?.trim() || `${ROLES.find(r => r.id === role)?.emoji} ${project.name === 'Без проекта' ? 'Новый чат' : project.name}`
    const chat = await chatsApi.create({
      odoo_project_id: project.id,
      project_name:    project.name,
      ai_role:         role,
      title:           t,
    })
    chatList.value.unshift(chat)
    return chat
  }

  async function openChat(id: number) {
    activeChatId.value   = id
    messages.value       = []
    isPanelLoading.value = false
    error.value          = null
    try {
      const raw      = await chatsApi.messages(id)
      messages.value = groupMessages(raw)
    } catch (e: unknown) {
      error.value = 'Не удалось загрузить историю: ' + (e as Error).message
    }
  }

  async function deleteChat(id: number) {
    await chatsApi.delete(id)
    chatList.value = chatList.value.filter(c => c.id !== id)
    if (activeChatId.value === id) {
      activeChatId.value = null
      messages.value     = []
    }
  }

  async function renameChat(id: number, title: string) {
    const updated = await chatsApi.rename(id, title)
    const idx = chatList.value.findIndex(c => c.id === id)
    if (idx !== -1) chatList.value[idx] = updated
    return updated
  }

  /** Switch role within the same project — finds or creates a chat */
  async function switchRole(newRole: RoleId) {
    const chat = activeChat.value
    if (!chat || chat.ai_role === newRole) return
    const existing = roleChatsMap.value[chat.odoo_project_id]?.[newRole]
    if (existing) {
      await openChat(existing)
    } else {
      const project = allProjects.value.find(p => p.id === chat.odoo_project_id)
        ?? { id: chat.odoo_project_id, name: chat.project_name, description: '', task_count: 0 }
      const newChat = await createChat(project, newRole)
      await openChat(newChat.id)
    }
  }

  // ── Send message with typewriter streaming ─────────────────────────────────────

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading.value || isPanelLoading.value || !activeChatId.value) return
    error.value = null

    const optimistic: Message = { id: Date.now(), role: 'user', content: text.trim(), ts: new Date() }
    messages.value.push(optimistic)
    isLoading.value = true

    try {
      const msg = await chatsApi.send(activeChatId.value, text.trim(), temperature.value)
      const assistantMsg: Message = {
        id:      msg.id,
        role:    'assistant',
        content: msg.content,
        model:   msg.model,
        tokens:  msg.tokens,
        searchQuery: msg.search_query,
        ts:      new Date(msg.created_at),
      }
      messages.value.push(assistantMsg)

      const idx = chatList.value.findIndex(c => c.id === activeChatId.value)
      if (idx !== -1) {
        chatList.value[idx] = { ...chatList.value[idx], updated_at: msg.created_at, message_count: chatList.value[idx].message_count + 2 }
      }

      isLoading.value = false
      await typewriterStream(assistantMsg)

    } catch (e: unknown) {
      messages.value = messages.value.filter(m => isPanelGroup(m) || (m as Message).id !== optimistic.id)
      error.value = (e as Error).message || 'Ошибка отправки'
      isLoading.value = false
    }
  }

  async function sendPanelMessage(text: string) {
    if (!text.trim() || isLoading.value || isPanelLoading.value || !activeChatId.value) return
    error.value          = null
    isPanelLoading.value = true

    try {
      const resp: PanelResponseOut = await chatsApi.panel(activeChatId.value, text.trim(), temperature.value)
      const group: PanelGroup = {
        type:         'panel',
        panel_id:     resp.panel_id,
        user_message: resp.user_message,
        roles:        resp.roles,
        synthesis:    resp.synthesis,
        ts:           new Date(resp.user_message.created_at),
      }
      messages.value.push(group)

      const idx = chatList.value.findIndex(c => c.id === activeChatId.value)
      if (idx !== -1) {
        chatList.value[idx] = { ...chatList.value[idx], updated_at: resp.synthesis.created_at }
      }
    } catch (e: unknown) {
      error.value = (e as Error).message || 'Ошибка панельного аудита'
    } finally {
      isPanelLoading.value = false
    }
  }

  /** Animate the assistant reply character-by-character */
  function typewriterStream(msg: Message): Promise<void> {
    const full = msg.content
    const len  = full.length
    // Duration: 1–6 seconds depending on response length
    const duration = Math.min(Math.max(len * 14, 600), 6000)

    streamingMsgId.value   = msg.id
    streamingContent.value = ''

    return new Promise(resolve => {
      const startTime = performance.now()
      const tick = () => {
        const elapsed  = performance.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        // ease-out quadratic for natural deceleration
        const eased    = 1 - (1 - progress) ** 2
        streamingContent.value = full.slice(0, Math.floor(eased * len))

        if (progress < 1) {
          requestAnimationFrame(tick)
        } else {
          streamingContent.value = full
          streamingMsgId.value   = null
          resolve()
        }
      }
      requestAnimationFrame(tick)
    })
  }

  // ── Misc ───────────────────────────────────────────────────────────────────────

  function setRole(id: RoleId) {
    // Used only from WelcomeScreen context where no chat is open
    if (activeChatId.value) return
    // For welcome screen cosmetic only
  }

  function toggleCheck(idx: number) { checklist.value[idx].done = !checklist.value[idx].done }

  function exportChat() {
    if (!messages.value.length) return
    const c = activeChat.value
    let out = `AuditMate — Экспорт\nПроект: ${c?.project_name ?? ''}\nРоль: ${activeRole.value?.name}\nДата: ${new Date().toLocaleString('ru')}\n${'─'.repeat(48)}\n\n`
    messages.value.forEach(item => {
      if (isPanelGroup(item)) {
        const ts = item.ts?.toLocaleTimeString('ru') ?? ''
        out += `[ПАНЕЛЬНЫЙ АУДИТ] ${ts}\nВопрос: ${item.user_message.content}\n\n`
        for (const [role, msg] of Object.entries(item.roles)) {
          out += `  [${role.toUpperCase()}]\n${msg.content}\n\n`
        }
        if (item.synthesis) out += `  [СИНТЕЗ]\n${item.synthesis.content}\n\n`
        out += '─'.repeat(32) + '\n\n'
      } else {
        const m = item as Message
        out += `[${m.role === 'user' ? 'ВЫ' : 'AUDITMATE'}] ${m.ts?.toLocaleTimeString('ru') ?? ''}\n${m.content}\n\n`
      }
    })
    const blob = new Blob([out], { type: 'text/plain;charset=utf-8' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `auditmate-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return {
    // State
    odooProjects, projectsLoading, customProjects, hiddenSet, nameOverrides,
    chatList, chatsLoading,
    activeChatId, messages, isLoading, isPanelLoading, error, inputText,
    streamingMsgId, streamingContent,
    temperature, setTemperature,
    checklist,
    // Computed
    allProjects, activeChat, activeRole, hasMessages, progress, roleChatsMap,
    // Actions
    loadProjects, loadChats,
    addCustomProject, renameProject, deleteProject,
    createChat, openChat, deleteChat, renameChat, switchRole,
    sendMessage, sendPanelMessage, setRole, toggleCheck, exportChat,
    ROLES,
  }
})
