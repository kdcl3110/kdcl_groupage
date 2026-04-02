<script setup lang="ts">
import { ref } from 'vue'
import { VueTelInput } from 'vue-tel-input'
import 'vue-tel-input/vue-tel-input.css'

withDefaults(defineProps<{
  modelValue: string
  disabled?: boolean
  placeholder?: string
}>(), {
  disabled: false,
  placeholder: 'Numéro de téléphone',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  valid: [value: boolean]
}>()

const touched = ref(false)
const isValid = ref<boolean | null>(null)

function onValidate(phoneObject: { isValid?: boolean; valid?: boolean }) {
  const valid = phoneObject.isValid ?? phoneObject.valid ?? false
  isValid.value = valid
  emit('valid', valid)
}

function onBlur() {
  touched.value = true
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <VueTelInput
      :model-value="modelValue"
      default-country="BE"
      :auto-default-country="false"
      :preferred-countries="['BE', 'FR', 'CD', 'CG', 'CM', 'CI', 'SN', 'GA', 'GN', 'TG', 'BJ', 'MA', 'DZ', 'TN', 'AO', 'MG']"
      mode="international"
      :disabled="disabled"
      :input-options="{
        placeholder,
        autocomplete: 'tel',
      }"
      :dropdown-options="{
        showDialCodeInList: true,
        showFlags: true,
        showSearchBox: true,
        searchBoxPlaceholder: 'Rechercher un pays…',
      }"
      :style-classes="{
        'phone-valid': touched && isValid === true,
        'phone-invalid': touched && isValid === false,
      }"
      @update:model-value="$emit('update:modelValue', $event)"
      @validate="onValidate"
      @blur="onBlur"
    />

    <Transition name="fade">
      <p v-if="touched && isValid === false" class="text-[12px] text-red-400 flex items-center gap-1 pl-0.5">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        Numéro de téléphone invalide
      </p>
    </Transition>
  </div>
</template>

<style scoped>
/* ── Wrapper ─────────────────────────────────────────────────────────────── */
:deep(.vue-tel-input) {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 12px;
  box-shadow: none;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

:deep(.vue-tel-input:focus-within) {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-15);
  outline: none;
}

:deep(.vue-tel-input.phone-valid) {
  border-color: rgba(74, 222, 128, 0.6);
}

:deep(.vue-tel-input.phone-invalid) {
  border-color: rgba(248, 113, 113, 0.6);
}

:deep(.vue-tel-input.phone-invalid:focus-within) {
  border-color: rgba(248, 113, 113, 0.7);
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.1);
}

/* ── Country dropdown button ─────────────────────────────────────────────── */
:deep(.vti__dropdown) {
  background: transparent;
  border-right: 1px solid var(--input-border);
  border-radius: 11px 0 0 11px;
  padding: 0 10px;
  transition: background 0.15s;
}

:deep(.vti__dropdown:hover),
:deep(.vti__dropdown.open) {
  background: rgba(255, 255, 255, 0.05);
}

:deep(.vti__selection) {
  display: flex;
  align-items: center;
  gap: 6px;
}

:deep(.vti__country-code) {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
}

:deep(.vti__dropdown-arrow) {
  color: var(--text-faint);
  border-top-color: var(--text-faint);
  font-size: 10px;
}

/* ── Phone number input ──────────────────────────────────────────────────── */
:deep(.vti__input) {
  background: transparent;
  color: var(--text-primary);
  font-size: 15px;
  font-family: inherit;
  padding: 13px 14px;
  border-radius: 0 11px 11px 0;
  caret-color: var(--primary);
}

:deep(.vti__input::placeholder) {
  color: var(--text-faint);
}

:deep(.vti__input:focus) {
  outline: none;
}

/* ── Dropdown list ───────────────────────────────────────────────────────── */
:deep(.vti__dropdown-list) {
  background: var(--glass-bg, rgba(20, 20, 30, 0.97));
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  padding: 4px 0;
  width: 280px;
  max-height: 280px;
  overflow-y: auto;
  z-index: 100;
  scrollbar-width: none;
}

:deep(.vti__dropdown-list::-webkit-scrollbar) {
  display: none;
}

:deep(.vti__dropdown-list.below) {
  top: calc(100% + 4px);
}

:deep(.vti__dropdown-list.above) {
  bottom: calc(100% + 4px);
}

:deep(.vti__dropdown-item) {
  color: var(--text-primary);
  font-size: 14px;
  padding: 9px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: background 0.12s;
}

:deep(.vti__dropdown-item:hover),
:deep(.vti__dropdown-item.highlighted) {
  background: rgba(255, 255, 255, 0.06);
}

:deep(.vti__dropdown-item strong) {
  color: var(--text-faint);
  font-size: 12px;
  font-weight: 400;
  margin-left: auto;
}

/* ── Search box ──────────────────────────────────────────────────────────── */
:deep(.vti__search_box) {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  padding: 8px 12px;
  margin: 8px;
  width: calc(100% - 16px);
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s;
}

:deep(.vti__search_box::placeholder) {
  color: var(--text-faint);
}

:deep(.vti__search_box:focus) {
  border-color: var(--primary);
}
</style>
