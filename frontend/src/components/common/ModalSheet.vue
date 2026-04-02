<script setup lang="ts">
defineProps<{
  modelValue: boolean
  title?: string
  maxWidth?: string
}>()

defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="overlay flex items-end md:items-center justify-center"
        @click.self="$emit('update:modelValue', false)"
      >
        <Transition name="slide-up">
          <div
            v-if="modelValue"
            class="sheet w-full md:rounded-3xl rounded-t-3xl flex flex-col"
            :style="`max-width: ${maxWidth ?? '480px'}; max-height: 92dvh;`"
          >
            <!-- Handle -->
            <div class="w-9 h-1 bg-[var(--primary-30)] rounded-full mx-auto mt-4 shrink-0" />

            <!-- Header -->
            <template v-if="title || $slots.header">
              <div class="flex items-center justify-between px-5 py-4 shrink-0">
                <slot name="header">
                  <h2 class="text-[17px] font-extrabold text-app-primary">{{ title }}</h2>
                </slot>
                <button
                  class="w-8 h-8 rounded-full glass flex items-center justify-center text-app-muted cursor-pointer border-none text-lg leading-none transition-colors hover:text-app-primary"
                  @click="$emit('update:modelValue', false)"
                  aria-label="Fermer"
                >×</button>
              </div>
              <div class="border-t border-[var(--glass-border)] shrink-0" />
            </template>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto">
              <slot />
            </div>

            <!-- Footer -->
            <template v-if="$slots.footer">
              <div class="border-t border-[var(--glass-border)] shrink-0 px-5 py-4">
                <slot name="footer" />
              </div>
            </template>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
