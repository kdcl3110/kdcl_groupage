<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

interface Option {
  value: string
  label: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  options: Option[]
  placeholder?: string
  disabled?: boolean
}>(), {
  placeholder: 'Rechercher…',
  disabled: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const query    = ref('')
const isOpen   = ref(false)
const container = ref<HTMLDivElement | null>(null)

// Sync display text when value changes from outside
watch(
  () => props.modelValue,
  (val) => {
    const opt = props.options.find(o => o.value === val)
    query.value = opt ? opt.label : ''
  },
  { immediate: true },
)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter(o => o.label.toLowerCase().includes(q))
})

function onFocus() {
  if (props.disabled) return
  query.value = ''   // clear so user sees all options and can type freely
  isOpen.value = true
}

function onInput() {
  isOpen.value = true
  if (!query.value) emit('update:modelValue', '')
}

function select(opt: Option) {
  emit('update:modelValue', opt.value)
  query.value = opt.label
  isOpen.value = false
}

// Restore label on blur (small delay to let the click on an option register first)
function onBlur() {
  setTimeout(() => {
    isOpen.value = false
    const opt = props.options.find(o => o.value === props.modelValue)
    query.value = opt ? opt.label : ''
  }, 160)
}

function handleClickOutside(e: MouseEvent) {
  if (container.value && !container.value.contains(e.target as Node)) {
    isOpen.value = false
    const opt = props.options.find(o => o.value === props.modelValue)
    query.value = opt ? opt.label : ''
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<template>
  <div ref="container" class="relative">
    <!-- Input -->
    <div class="relative">
      <input
        :value="query"
        :placeholder="placeholder"
        :disabled="disabled"
        type="text"
        class="input-field w-full"
        style="padding-right: 36px;"
        autocomplete="off"
        @focus="onFocus"
        @blur="onBlur"
        @input="query = ($event.target as HTMLInputElement).value; onInput()"
      />
      <!-- Chevron -->
      <svg
        class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200 text-app-faint"
        :style="isOpen ? 'transform: translateY(-50%) rotate(180deg)' : ''"
        width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      >
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>

    <!-- Dropdown -->
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="absolute z-50 w-full mt-1.5 rounded-[14px] overflow-hidden"
        style="background: var(--glass-bg); backdrop-filter: blur(20px); border: 1px solid var(--glass-border); box-shadow: 0 8px 32px rgba(0,0,0,0.25);"
      >
        <!-- No results -->
        <div
          v-if="filtered.length === 0"
          class="px-4 py-3 text-sm text-app-faint text-center"
        >
          Aucun résultat
        </div>

        <!-- Options -->
        <button
          v-for="opt in filtered"
          :key="opt.value"
          type="button"
          class="w-full text-left px-4 py-2.5 text-sm text-app-primary transition-colors cursor-pointer border-none"
          :style="opt.value === modelValue
            ? 'background: var(--primary-15); color: var(--primary-light); font-weight: 600;'
            : 'background: transparent;'"
          @mousedown.prevent="select(opt)"
        >
          <span class="flex items-center justify-between gap-2">
            {{ opt.label }}
            <svg
              v-if="opt.value === modelValue"
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
