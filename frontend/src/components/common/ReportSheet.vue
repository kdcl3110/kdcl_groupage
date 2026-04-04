<script setup lang="ts">
import { ref } from 'vue'
import { reportsApi } from '@/api/reports'
import type { ReportTargetType, ReportReason } from '@/api/reports'
import { useToastStore, apiError } from '@/stores/toast'

const props = defineProps<{
  modelValue: boolean
  targetType: ReportTargetType
  targetId:   number
  targetLabel: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'reported'): void
}>()

const toast = useToastStore()

const REASONS: { value: ReportReason; label: string; sub: string }[] = [
  { value: 'false_info',    label: 'Informations fausses',    sub: 'Données incorrectes ou trompeuses' },
  { value: 'fraud',         label: 'Fraude / Arnaque',        sub: 'Comportement frauduleux ou escroquerie' },
  { value: 'inappropriate', label: 'Contenu inapproprié',     sub: 'Contenu offensant ou hors-sujet' },
  { value: 'spam',          label: 'Spam',                    sub: 'Activité répétitive non sollicitée' },
  { value: 'other',         label: 'Autre',                   sub: 'Une autre raison' },
]

const selectedReason = ref<ReportReason | null>(null)
const description     = ref('')
const loading         = ref(false)
const done            = ref(false)

function close() {
  if (loading.value) return
  emit('update:modelValue', false)
  // reset after transition
  setTimeout(() => {
    selectedReason.value = null
    description.value = ''
    done.value = false
  }, 300)
}

async function submit() {
  if (!selectedReason.value) return
  loading.value = true
  try {
    await reportsApi.create({
      target_type:  props.targetType,
      target_id:    props.targetId,
      reason:       selectedReason.value,
      description:  description.value.trim() || undefined,
    })
    done.value = true
    emit('reported')
  } catch (err: unknown) {
    toast.error(apiError(err, 'Impossible d\'envoyer le signalement.'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet-overlay">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-end justify-center"
        style="background: var(--overlay-bg); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);"
        @click.self="close"
      >
        <Transition name="sheet-up">
          <div
            v-if="modelValue"
            class="w-full max-w-lg rounded-t-[28px] flex flex-col border border-b-0 border-[var(--glass-border)]"
            style="background: var(--sheet-bg); max-height: 90dvh; padding-bottom: env(safe-area-inset-bottom, 0px);"
          >
            <!-- Handle -->
            <div class="flex justify-center pt-3 pb-1 shrink-0">
              <div class="w-10 h-1 rounded-full bg-[var(--glass-border)]" />
            </div>

            <!-- Header -->
            <div class="flex items-center justify-between px-5 py-3 shrink-0 border-b border-[var(--glass-border)]">
              <h2 class="text-base font-bold text-app-primary">Signaler</h2>
              <button
                class="w-8 h-8 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center text-app-muted cursor-pointer"
                @click="close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div class="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">

              <!-- Success state -->
              <template v-if="done">
                <div class="flex flex-col items-center gap-3 py-8 text-center">
                  <div class="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-400">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-[15px] font-bold text-app-primary">Signalement envoyé</p>
                    <p class="text-[13px] text-app-muted mt-1">Merci. Notre équipe examinera ce signalement dans les plus brefs délais.</p>
                  </div>
                  <button
                    class="mt-2 px-6 py-2.5 rounded-full bg-[var(--primary)] text-white text-sm font-semibold cursor-pointer border-none"
                    @click="close"
                  >
                    Fermer
                  </button>
                </div>
              </template>

              <template v-else>
                <!-- Target label -->
                <p class="text-[13px] text-app-muted">
                  Vous signalez : <strong class="text-app-primary">{{ targetLabel }}</strong>
                </p>

                <!-- Reason list -->
                <div class="flex flex-col gap-2">
                  <p class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Raison</p>
                  <div class="flex flex-col gap-1.5">
                    <button
                      v-for="r in REASONS"
                      :key="r.value"
                      class="flex items-center gap-3 px-4 py-3 rounded-[14px] border text-left cursor-pointer transition-colors"
                      :class="selectedReason === r.value
                        ? 'border-[var(--primary)] bg-[var(--primary-10)]'
                        : 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)]'"
                      @click="selectedReason = r.value"
                    >
                      <div
                        class="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors"
                        :class="selectedReason === r.value ? 'border-[var(--primary)]' : 'border-[var(--glass-border)]'"
                      >
                        <div
                          v-if="selectedReason === r.value"
                          class="w-2 h-2 rounded-full bg-[var(--primary)]"
                        />
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-[14px] font-semibold text-app-primary">{{ r.label }}</p>
                        <p class="text-[12px] text-app-muted">{{ r.sub }}</p>
                      </div>
                    </button>
                  </div>
                </div>

                <!-- Optional description -->
                <div class="flex flex-col gap-1.5">
                  <p class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Détails (optionnel)</p>
                  <textarea
                    v-model="description"
                    placeholder="Décrivez le problème en quelques mots..."
                    rows="3"
                    class="input-field resize-none"
                    style="border-radius: 14px; font-size: 14px;"
                  />
                </div>

                <!-- Submit -->
                <button
                  class="w-full py-[14px] rounded-[16px] text-[15px] font-semibold transition-colors cursor-pointer border-none"
                  :class="selectedReason
                    ? 'bg-red-500 text-white active:bg-red-600'
                    : 'bg-white/[0.06] text-app-faint cursor-not-allowed'"
                  :disabled="!selectedReason || loading"
                  @click="submit"
                >
                  <span v-if="loading" class="flex items-center justify-center gap-2">
                    <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                    </svg>
                    Envoi...
                  </span>
                  <span v-else>Envoyer le signalement</span>
                </button>
              </template>

            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-overlay-enter-active,
.sheet-overlay-leave-active { transition: opacity 0.25s ease; }
.sheet-overlay-enter-from,
.sheet-overlay-leave-to { opacity: 0; }

.sheet-up-enter-active,
.sheet-up-leave-active { transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
.sheet-up-enter-from,
.sheet-up-leave-to { transform: translateY(100%); }
</style>
