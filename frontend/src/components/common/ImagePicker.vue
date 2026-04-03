<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: File | null
  existing?: string | null   // URL d'une image déjà enregistrée (mode édition)
  required?: boolean         // si true, le X est masqué sur l'image existante
  disabled?: boolean
  label?: string             // texte du placeholder, ex: "Photo 1 *"
}>(), {
  modelValue: null,
  existing: null,
  required: false,
  disabled: false,
  label: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [file: File | null]
  'remove': []  // émis quand l'utilisateur supprime l'image existante
}>()

// preview est géré en interne — pas dérivé de la prop
const preview = ref<string | null>(null)
// removed = l'image existante a été explicitement supprimée par l'utilisateur
const removed = ref(false)

function pickFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = URL.createObjectURL(file)
  removed.value = false
  emit('update:modelValue', file)
  input.value = '' // permet de re-sélectionner le même fichier
}

function clearImage() {
  if (preview.value) {
    // Il y a un nouveau fichier affiché → on l'efface, on retombe sur l'existante (ou vide)
    URL.revokeObjectURL(preview.value)
    preview.value = null
    emit('update:modelValue', null)
  } else {
    // L'image existante est affichée → on la supprime (si non required)
    removed.value = true
    emit('remove')
  }
}

onUnmounted(() => {
  if (preview.value) URL.revokeObjectURL(preview.value)
})
</script>

<template>
  <div
    class="relative aspect-square rounded-[14px] overflow-hidden border-2 transition-colors"
    :class="
      required && !preview && (removed || !existing)
        ? 'border-dashed border-red-400/50 bg-red-500/5'
        : preview || (!removed && existing)
        ? 'border-[var(--primary-50)] bg-transparent'
        : 'border-dashed border-[var(--glass-border)] bg-white/[0.03]'
    "
  >
    <!-- Nouveau fichier sélectionné -->
    <img v-if="preview" :src="preview" class="w-full h-full object-cover" />

    <!-- Image existante (pas de nouveau fichier, pas supprimée) -->
    <img
      v-else-if="!removed && existing"
      :src="existing"
      class="w-full h-full object-cover"
    />

    <!-- Placeholder vide -->
    <div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      <span v-if="label" class="text-[11px] text-app-faint">{{ label }}</span>
    </div>

    <!-- Bouton X — sur un nouveau fichier OU sur l'existante si pas required -->
    <button
      v-if="preview || (!required && !removed && existing)"
      type="button"
      class="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white cursor-pointer border-none"
      :disabled="disabled"
      @click.prevent="clearImage"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>

    <!-- Input fichier invisible sur toute la surface -->
    <input
      type="file"
      accept="image/*"
      class="absolute inset-0 opacity-0 cursor-pointer"
      :disabled="disabled"
      @change="pickFile"
    />
  </div>
</template>
