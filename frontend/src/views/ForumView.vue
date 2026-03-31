<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { travelsApi } from '@/api/travels'
import { useAuthStore } from '@/stores/auth'
import type { Travel, ForumMessage } from '@/types'

const route = useRoute()
const auth = useAuthStore()

const travels = ref<Travel[]>([])
const messages = ref<ForumMessage[]>([])
const selectedTravelId = ref<number | null>(null)
const selectedTravel = computed(() =>
  travels.value.find((t) => t.travel_id === selectedTravelId.value) ?? null
)

const loading = ref(false)
const loadingTravels = ref(true)
const messageText = ref('')
const sending = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

const currentUserId = computed(() => auth.user?.user_id ?? null)

function isOwnMessage(msg: ForumMessage) {
  return msg.message_type === 'user' && msg.author_id === currentUserId.value
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateGroup(date: string) {
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function getAuthorName(msg: ForumMessage) {
  if (msg.author) return `${msg.author.first_name} ${msg.author.last_name}`
  return 'Utilisateur'
}

async function fetchTravels() {
  loadingTravels.value = true
  try {
    const { data } = await travelsApi.getAll()
    travels.value = data
  } catch {
    // silent
  } finally {
    loadingTravels.value = false
  }
}

async function fetchMessages(travelId: number) {
  loading.value = true
  messages.value = []
  try {
    const { data } = await travelsApi.getForumMessages(travelId)
    messages.value = data
    await nextTick()
    scrollToBottom()
  } catch {
    // silent
  } finally {
    loading.value = false
  }
}

async function sendMessage() {
  if (!messageText.value.trim() || !selectedTravelId.value || sending.value) return
  const content = messageText.value.trim()
  messageText.value = ''
  sending.value = true
  try {
    const { data } = await travelsApi.postForumMessage(selectedTravelId.value, content)
    messages.value.push(data)
    await nextTick()
    scrollToBottom()
  } catch {
    messageText.value = content
  } finally {
    sending.value = false
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function selectTravel(id: number) {
  selectedTravelId.value = id
  fetchMessages(id)
}

watch(selectedTravelId, (id) => {
  if (id) fetchMessages(id)
})

onMounted(async () => {
  await fetchTravels()
  const qid = route.query.travel_id
  if (qid) {
    selectedTravelId.value = Number(qid)
  } else if (travels.value.length > 0) {
    selectedTravelId.value = travels.value[0].travel_id
  }
})
</script>

<template>
  <AppLayout>
    <div class="p-4 sm:p-6 lg:p-8 flex flex-col gap-3 h-[calc(100dvh-64px-calc(80px+24px+env(safe-area-inset-bottom,0px)))] lg:h-[calc(100dvh-64px-32px)]">
      <!-- Header -->
      <div class="flex items-center shrink-0">
        <h1 class="text-2xl font-extrabold text-app-primary tracking-tight">Forum</h1>
      </div>

      <!-- Travel selector -->
      <div v-if="!loadingTravels && travels.length > 0" class="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 shrink-0">
        <button
          v-for="t in travels"
          :key="t.travel_id"
          class="chip shrink-0"
          :class="{ active: selectedTravelId === t.travel_id }"
          @click="selectTravel(t.travel_id)"
        >
          {{ t.origin_country }} → {{ t.destination_country }}
        </button>
      </div>

      <div v-else-if="loadingTravels" class="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 shrink-0">
        <div v-for="i in 3" :key="i" class="skeleton h-[34px] w-[120px] rounded-full shrink-0" />
      </div>

      <!-- No travels -->
      <div v-if="!loadingTravels && travels.length === 0" class="flex flex-col items-center gap-3 py-12 px-6 text-center text-app-muted">
        <span class="text-5xl opacity-40">💬</span>
        <p class="font-semibold text-app-primary">Aucun voyage</p>
        <p class="text-sm">Le forum est associé aux voyages. Aucun voyage disponible.</p>
      </div>

      <template v-else-if="selectedTravelId">
        <!-- Travel info pill -->
        <div v-if="selectedTravel" class="glass rounded-full flex items-center justify-between px-3.5 py-2.5 shrink-0">
          <div class="flex items-center gap-1.5 text-[13px] text-app-muted">
            <strong class="text-app-primary">{{ selectedTravel.origin_country }}</strong>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
            <strong class="text-app-primary">{{ selectedTravel.destination_country }}</strong>
          </div>
          <span class="text-xs text-app-muted">{{ messages.length }} messages</span>
        </div>

        <!-- Messages area -->
        <div ref="messagesContainer" class="flex-1 flex flex-col gap-1 min-h-0 overflow-y-auto scrollbar-hide py-1">
          <div v-if="loading" class="flex-1 flex items-center justify-center">
            <div class="w-10 h-10 rounded-full border-[3px] border-[var(--primary-20)] border-t-[var(--primary)] animate-spin" />
          </div>

          <div v-else-if="messages.length === 0" class="flex flex-col items-center gap-3 py-8 text-center text-app-muted">
            <span class="text-4xl opacity-40">💬</span>
            <p class="font-semibold text-app-primary">Pas encore de messages</p>
            <p class="text-sm">Soyez le premier à écrire dans ce forum.</p>
          </div>

          <template v-else>
            <template v-for="(msg, index) in messages" :key="msg.message_id">
              <!-- Date separator -->
              <div
                v-if="index === 0 || formatDateGroup(messages[index - 1].creation_date) !== formatDateGroup(msg.creation_date)"
                class="flex items-center justify-center my-3"
              >
                <span class="text-[11px] font-medium text-app-faint bg-white/5 border border-[var(--glass-border)] px-3 py-0.5 rounded-full">
                  {{ formatDateGroup(msg.creation_date) }}
                </span>
              </div>

              <!-- System message -->
              <div v-if="msg.message_type === 'system'" class="flex justify-center my-1">
                <span class="text-xs text-app-muted bg-white/[0.06] border border-[var(--glass-border)] px-3.5 py-1 rounded-full text-center max-w-[80%]">
                  {{ msg.content }}
                </span>
              </div>

              <!-- User message -->
              <div
                v-else
                class="flex py-0.5"
                :class="isOwnMessage(msg) ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="max-w-[78%] px-3.5 py-2.5"
                  :class="isOwnMessage(msg)
                    ? 'bg-[var(--primary-25)] border border-[var(--primary-30)] rounded-[18px_18px_4px_18px]'
                    : 'bg-white/[0.07] border border-[var(--glass-border)] rounded-[18px_18px_18px_4px]'"
                >
                  <p v-if="!isOwnMessage(msg)" class="text-[11px] font-semibold text-[var(--primary)] mb-1">{{ getAuthorName(msg) }}</p>
                  <p class="text-sm leading-snug break-words text-app-primary">{{ msg.content }}</p>
                  <p class="text-[10px] text-app-faint mt-1 text-right">{{ formatTime(msg.creation_date) }}</p>
                </div>
              </div>
            </template>
          </template>
        </div>

        <!-- Input bar -->
        <div class="glass rounded-full flex items-center gap-2.5 px-3.5 py-2.5 shrink-0">
          <input
            v-model="messageText"
            type="text"
            class="flex-1 bg-transparent border-none outline-none text-sm text-app-primary font-[inherit] placeholder:text-app-faint"
            placeholder="Écrire un message..."
            @keydown.enter.prevent="sendMessage"
            :disabled="sending"
          />
          <button
            class="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] border-none text-white flex items-center justify-center cursor-pointer transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            @click="sendMessage"
            :disabled="!messageText.trim() || sending"
            aria-label="Envoyer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </template>
    </div>
  </AppLayout>
</template>
