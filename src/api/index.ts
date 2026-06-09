import axios from 'axios'

// ── HTTP client ────────────────────────────────────────────────────────────────
const _http = axios.create({ baseURL: '/api', headers: { 'Content-Type': 'application/json' } })

_http.interceptors.request.use(cfg => {
  const token = localStorage.getItem('am_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

_http.interceptors.response.use(
  res => res.data,   // unwrap — all calls return data directly
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('am_token')
      localStorage.removeItem('am_user')
      window.location.hash = '#/login'
    }
    return Promise.reject(
      new Error(err.response?.data?.detail ?? err.message ?? 'Ошибка запроса')
    )
  },
)

export const http = {
  get:    <T = unknown>(path: string)             => _http.get<never, T>(path),
  post:   <T = unknown>(path: string, body: unknown) => _http.post<never, T>(path, body),
  patch:  <T = unknown>(path: string, body: unknown) => _http.patch<never, T>(path, body),
  delete: <T = unknown>(path: string)             => _http.delete<never, T>(path),
}

// ── Types ──────────────────────────────────────────────────────────────────────
export interface User { id: number; odoo_uid: number; name: string; email: string }

export interface Project { id: number; name: string; description: string; task_count: number }

export type RoleId = 'founder' | 'investor' | 'mentor' | 'critic' | 'marketer' | 'financier' | 'lawyer'
export interface Role { id: RoleId; name: string; emoji: string; color: string; desc: string }

export interface ChatOut {
  id: number; odoo_project_id: number; project_name: string
  ai_role: RoleId; title: string; created_at: string; updated_at: string; message_count: number
}

export interface MessageOut {
  id: number; chat_id: number; role: 'user' | 'assistant'
  content: string; model: string | null; tokens: number | null; created_at: string
  panel_id?: string | null; sub_role?: string | null; search_query?: string | null
}

export interface PanelResponseOut {
  panel_id: string
  user_message: MessageOut
  roles: Record<string, MessageOut>   // "founder"|"investor"|"mentor"|"critic"
  synthesis: MessageOut
  tokens_total: number
}

// ── API calls ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (login: string, password: string) =>
    http.post<{ access_token: string; user_id: number; odoo_uid: number; name: string; email: string }>(
      '/auth/login', { login, password }),
  me: () => http.get<User>('/auth/me'),
}

export const odooApi = {
  projects: () => http.get<Project[]>('/odoo/projects?limit=50'),
  tasks:    (id: number) => http.get(`/odoo/projects/${id}/tasks`),
}

export const chatsApi = {
  list:     ()                           => http.get<ChatOut[]>('/chats'),
  create:   (body: object)               => http.post<ChatOut>('/chats', body),
  rename:   (id: number, title: string)  => http.patch<ChatOut>(`/chats/${id}`, { title }),
  delete:   (id: number)                 => http.delete(`/chats/${id}`),
  messages: (id: number)                 => http.get<MessageOut[]>(`/chats/${id}/messages`),
  send:     (id: number, content: string, temperature?: number | null) =>
    http.post<MessageOut>(`/chats/${id}/messages`, { content, ...(temperature != null ? { temperature } : {}) }),
  panel:    (id: number, content: string, temperature?: number | null) =>
    http.post<PanelResponseOut>(`/chats/${id}/panel`, { content, ...(temperature != null ? { temperature } : {}) }),
}
