import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastSeverity = 'success' | 'error' | 'info' | 'warn'

export interface Toast {
  id: number
  severity: ToastSeverity
  summary: string
  detail?: string
  life?: number
}

let _id = 0

export const useToastStore = defineStore('toast', () => {
  const items = ref<Toast[]>([])

  function add(t: Omit<Toast, 'id'>) {
    const toast = { ...t, id: ++_id }
    items.value.push(toast)
    setTimeout(() => remove(toast.id), toast.life ?? 4000)
  }

  function remove(id: number) {
    items.value = items.value.filter(t => t.id !== id)
  }

  const success = (summary: string, detail?: string) => add({ severity: 'success', summary, detail })
  const error   = (summary: string, detail?: string) => add({ severity: 'error',   summary, detail })
  const info    = (summary: string, detail?: string) => add({ severity: 'info',    summary, detail })

  return { items, add, remove, success, error, info }
})
