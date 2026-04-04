<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { travelsApi } from '@/api/travels'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type { Travel, ForumMessage, ForumParticipant } from '@/types'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

const travelId = computed(() => Number(route.params.id))
const travel   = ref<Travel | null>(null)
const messages = ref<ForumMessage[]>([])
const participants = ref<ForumParticipant[]>([])
const loading  = ref(true)
const error    = ref('')
const messageText = ref('')
const sending  = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

const currentUserId = computed(() => auth.user?.user_id ?? null)
const isClient      = computed(() => auth.user?.role === 'client')
const isManager     = computed(() => auth.user?.role === 'freight_forwarder' || auth.user?.role === 'admin')
const toast         = useToastStore()

// Index du premier message non lu au chargement (pour le séparateur "Nouveaux messages")
const firstUnreadIndex = ref<number | null>(null)

// Bottom sheet "info message" (groupeur uniquement)
const selectedMsg = ref<ForumMessage | null>(null)

function msgReaders(msg: ForumMessage): ForumParticipant[] {
  if (!msg.readers) return []
  return msg.readers
}

function msgNonReaders(msg: ForumMessage): ForumParticipant[] {
  const readerIds = new Set((msg.readers ?? []).map((r) => r.user_id))
  return participants.value.filter((p) => !readerIds.has(p.user_id))
}

function openMsgInfo(msg: ForumMessage) {
  if (!isManager.value || msg.message_type === 'system') return
  selectedMsg.value = msg
}

function isOwnMessage(msg: ForumMessage) {
  return msg.message_type === 'user' && msg.author_id === currentUserId.value
}


function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
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

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function sendMessage() {
  if (!messageText.value.trim() || sending.value) return
  const content = messageText.value.trim()
  messageText.value = ''
  sending.value = true
  try {
    const { data } = await travelsApi.postForumMessage(travelId.value, content)
    messages.value.push(data)
    await nextTick()
    scrollToBottom()
  } catch (err) {
    messageText.value = content
    const e = err as { response?: { data?: { message?: string } } }
    toast.error(e.response?.data?.message ?? 'Impossible d\'envoyer le message.')
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const [travelRes, msgsRes] = await Promise.all([
      travelsApi.getById(travelId.value),
      travelsApi.getForumMessages(travelId.value),
    ])
    travel.value = travelRes.data
    messages.value = msgsRes.data.messages
    participants.value = msgsRes.data.participants ?? []
    // Repérer le premier message non lu avant marquage (pour le séparateur client)
    const firstUnread = msgsRes.data.messages.findIndex(
      (m) => m.message_type === 'user' && !m.is_read,
    )
    firstUnreadIndex.value = firstUnread >= 0 ? firstUnread : null
    await nextTick()
    scrollToBottom()
  } catch (e: unknown) {
    const err = e as { response?: { status?: number } }
    if (err.response?.status === 403) {
      error.value = "Vous n'avez pas accès à ce forum."
    } else {
      error.value = 'Impossible de charger le forum.'
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <AppLayout>
    <div class="flex flex-col h-[calc(100dvh-64px-24px)] lg:h-[calc(100dvh-40px)]">

      <!-- Header -->
      <div class="px-4 sm:px-6 pt-4 pb-3 shrink-0 flex items-center gap-3 border-b border-[var(--glass-border)]">
        <button
          class="w-9 h-9 rounded-full glass flex items-center justify-center cursor-pointer border-none text-app-muted transition-colors hover:text-app-primary shrink-0"
          @click="router.back()"
          aria-label="Retour"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <template v-if="travel">
          <!-- Avatar -->
          <div
            class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-[var(--primary-25)]"
            :class="travel.transport_type === 'ship' ? 'bg-blue-500/10' : 'bg-sky-400/10'"
          >
            <svg v-if="travel.transport_type === 'ship'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
              <path d="M2 21c.6.5 1.2 1 2.5 1C7 22 7 21 9.5 21s2.5 1 5 1 2.5-1 5-1c1.3 0 1.9.5 2.5 1"/>
              <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
              <path d="M19 13V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v6"/>
              <path d="M12 10v4"/><path d="M12 2v3"/>
            </svg>
            <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="text-sky-400">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4H6L4 2 2 2v2l2 2-3 7 2.8.6"/>
              <path d="M15 15l-5.4-5.4"/><path d="M5 19 7 21"/><path d="M19 19l2 2"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[15px] font-bold text-app-primary leading-tight truncate">
              {{ travel.origin.name }} → {{ travel.destination.name }}
            </p>
            <p class="text-[12px] text-app-muted truncate">
              {{ travel.itinerary || (travel.transport_type === 'ship' ? 'Maritime' : 'Aérien') }}
            </p>
          </div>
        </template>
        <div v-else-if="loading" class="flex-1 flex flex-col gap-1.5">
          <div class="skeleton h-4 w-[50%]" />
          <div class="skeleton h-3 w-[35%]" />
        </div>
      </div>

      <!-- Error state -->
      <div v-if="error" class="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center text-app-muted">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="opacity-40">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p class="font-semibold text-app-primary">Erreur</p>
        <p class="text-sm">{{ error }}</p>
      </div>

      <template v-else>
        <!-- Messages area -->
        <div ref="messagesContainer" class="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-4 sm:px-6 py-3 flex flex-col gap-1">

          <div v-if="loading" class="flex-1 flex items-center justify-center">
            <div class="w-10 h-10 rounded-full border-[3px] border-[var(--primary-20)] border-t-[var(--primary)] animate-spin" />
          </div>

          <div v-else-if="messages.length === 0" class="flex-1 flex flex-col items-center justify-center gap-3 py-8 text-center text-app-muted">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="opacity-30">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
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

              <!-- Séparateur "Nouveaux messages" (client uniquement) -->
              <div
                v-if="isClient && firstUnreadIndex !== null && index === firstUnreadIndex"
                class="flex items-center gap-2 my-2"
              >
                <div class="flex-1 h-px bg-[var(--primary-30)]" />
                <span class="text-[11px] font-semibold text-[var(--primary)] shrink-0">Nouveaux messages</span>
                <div class="flex-1 h-px bg-[var(--primary-30)]" />
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
                class="flex flex-col py-0.5"
                :class="isOwnMessage(msg) ? 'items-end' : 'items-start'"
              >
                <!-- Bulle -->
                <div
                  class="max-w-[78%] px-3.5 py-2.5"
                  :class="[
                    isOwnMessage(msg)
                      ? 'bg-[var(--primary-25)] border border-[var(--primary-30)] rounded-[18px_18px_4px_18px]'
                      : 'bg-white/[0.07] border border-[var(--glass-border)] rounded-[18px_18px_18px_4px]',
                    isClient && !msg.is_read ? 'ring-1 ring-[var(--primary-40)]' : '',
                    isManager ? 'cursor-pointer active:opacity-70' : '',
                  ]"
                  @click="openMsgInfo(msg)"
                >
                  <p v-if="!isOwnMessage(msg)" class="text-[11px] font-semibold text-[var(--primary)] mb-1">{{ getAuthorName(msg) }}</p>
                  <p class="text-sm leading-snug break-words text-app-primary">{{ msg.content }}</p>
                  <div class="flex items-center justify-end gap-1.5 mt-1">
                    <p class="text-[10px] text-app-faint">{{ formatTime(msg.creation_date) }}</p>
                    <!-- Double coche pour les messages du groupeur -->
                    <template v-if="isManager && isOwnMessage(msg)">
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                        :class="msg.readers && msg.readers.length > 0 ? 'text-[var(--primary)]' : 'text-app-faint'"
                      >
                        <polyline points="18 6 8 16 4 12"/>
                        <polyline points="22 6 14 14"/>
                      </svg>
                    </template>
                  </div>
                </div>
              </div>
            </template>
          </template>
        </div>

        <!-- Input bar — groupeurs et admins uniquement -->
        <div v-if="!isClient" class="px-4 sm:px-6 pb-3 pt-2 shrink-0">
          <div class="glass rounded-full flex items-center gap-2.5 px-3.5 py-2.5">
            <input
              v-model="messageText"
              type="text"
              class="flex-1 bg-transparent border-none outline-none text-sm text-app-primary font-[inherit] placeholder:text-app-faint"
              placeholder="Écrire un message..."
              @keydown.enter.prevent="sendMessage"
              :disabled="sending || loading"
            />
            <button
              class="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] border-none text-white flex items-center justify-center cursor-pointer transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              @click="sendMessage"
              :disabled="!messageText.trim() || sending || loading"
              aria-label="Envoyer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
        <!-- Lecture seule pour les clients -->
        <div v-else class="px-4 sm:px-6 pb-3 pt-2 shrink-0">
          <div class="glass rounded-full flex items-center justify-center gap-2 px-4 py-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint shrink-0">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span class="text-[12px] text-app-faint">Seuls les transitaires peuvent écrire dans ce forum</span>
          </div>
        </div>
      </template>

    </div>

    <!-- Bottom sheet : info du message (groupeur uniquement) -->
    <Teleport to="body">
      <Transition name="sheet">
        <div
          v-if="selectedMsg"
          class="fixed inset-0 z-50 flex flex-col justify-end"
          @click.self="selectedMsg = null"
        >
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/50" @click="selectedMsg = null" />

          <!-- Sheet -->
          <div class="relative glass rounded-t-2xl px-4 pb-8 pt-3 max-h-[70vh] flex flex-col">
            <!-- Handle -->
            <div class="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4 shrink-0" />

            <!-- Message preview -->
            <div class="mb-4 px-3.5 py-2.5 rounded-2xl bg-[var(--primary-25)] border border-[var(--primary-30)] max-w-[80%] shrink-0">
              <p class="text-sm text-app-primary leading-snug break-words line-clamp-2">{{ selectedMsg.content }}</p>
              <p class="text-[10px] text-app-faint mt-1">{{ formatTime(selectedMsg.creation_date) }}</p>
            </div>

            <div class="overflow-y-auto flex-1 flex flex-col gap-4">
              <!-- Lu par -->
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-[var(--primary)] shrink-0">
                    <polyline points="18 6 8 16 4 12"/><polyline points="22 6 14 14"/>
                  </svg>
                  <span class="text-[12px] font-semibold text-[var(--primary)]">Lu ({{ msgReaders(selectedMsg).length }})</span>
                </div>
                <div v-if="msgReaders(selectedMsg).length === 0" class="text-[12px] text-app-faint px-1">Personne n'a encore lu ce message.</div>
                <div v-else class="flex flex-col gap-1">
                  <div
                    v-for="r in msgReaders(selectedMsg)"
                    :key="r.user_id"
                    class="flex items-center gap-2.5 py-1.5 px-1"
                  >
                    <div class="w-7 h-7 rounded-full bg-[var(--primary-20)] flex items-center justify-center shrink-0">
                      <span class="text-[11px] font-bold text-[var(--primary)]">{{ r.first_name[0] }}{{ r.last_name[0] }}</span>
                    </div>
                    <span class="text-[13px] text-app-primary">{{ r.first_name }} {{ r.last_name }}</span>
                  </div>
                </div>
              </div>

              <!-- Pas encore lu -->
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint shrink-0">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span class="text-[12px] font-semibold text-app-muted">Pas encore lu ({{ msgNonReaders(selectedMsg).length }})</span>
                </div>
                <div v-if="msgNonReaders(selectedMsg).length === 0" class="text-[12px] text-app-faint px-1">Tout le monde a lu ce message.</div>
                <div v-else class="flex flex-col gap-1">
                  <div
                    v-for="r in msgNonReaders(selectedMsg)"
                    :key="r.user_id"
                    class="flex items-center gap-2.5 py-1.5 px-1"
                  >
                    <div class="w-7 h-7 rounded-full bg-white/[0.06] border border-[var(--glass-border)] flex items-center justify-center shrink-0">
                      <span class="text-[11px] font-medium text-app-faint">{{ r.first_name[0] }}{{ r.last_name[0] }}</span>
                    </div>
                    <span class="text-[13px] text-app-muted">{{ r.first_name }} {{ r.last_name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </AppLayout>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.2s ease;
}
.sheet-enter-active .relative,
.sheet-leave-active .relative {
  transition: transform 0.25s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .relative,
.sheet-leave-to .relative {
  transform: translateY(100%);
}
</style>
