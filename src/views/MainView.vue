<script setup lang="ts">
import { onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import AppHeader    from '@/components/AppHeader.vue'
import AppSidebar   from '@/components/AppSidebar.vue'
import ProjectPicker from '@/components/ProjectPicker.vue'
import ChatView     from '@/components/ChatView.vue'

const chat = useChatStore()

onMounted(async () => {
  await Promise.all([chat.loadProjects(), chat.loadChats()])
})
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <div class="app-body">
      <AppSidebar />
      <ProjectPicker v-if="!chat.activeChatId" />
      <ChatView      v-else />
    </div>
  </div>
</template>

<style scoped>
.app-shell { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
.app-body  { display: flex; flex: 1; overflow: hidden; }
</style>
