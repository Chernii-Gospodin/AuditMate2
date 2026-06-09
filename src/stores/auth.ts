import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type User } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('am_token') ?? '')
  const user  = ref<User | null>(JSON.parse(localStorage.getItem('am_user') ?? 'null'))

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  async function login(login: string, password: string): Promise<void> {
    const data = await authApi.login(login, password)
    token.value = data.access_token
    user.value  = { id: data.user_id, odoo_uid: data.odoo_uid, name: data.name, email: data.email }
    localStorage.setItem('am_token', token.value)
    localStorage.setItem('am_user',  JSON.stringify(user.value))
  }

  function logout() {
    token.value = ''
    user.value  = null
    localStorage.removeItem('am_token')
    localStorage.removeItem('am_user')
  }

  return { token, user, isAuthenticated, login, logout }
})
