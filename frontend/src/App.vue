<script setup lang="ts">
import { RouterView } from 'vue-router'
import { isLoading } from '@/stores/loading'
</script>

<template>
  <div class="loading-bar-wrap" :class="{ active: isLoading }">
    <div class="loading-bar" />
  </div>
  <RouterView />
</template>

<style scoped>
.loading-bar-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  z-index: 9999;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
}
.loading-bar-wrap.active {
  opacity: 1;
}
.loading-bar {
  height: 100%;
  width: 45%;
  background: linear-gradient(90deg, #A813B7, #d946ef, #A813B7);
  background-size: 200% 100%;
  border-radius: 0 3px 3px 0;
  animation: loading-slide 1.2s ease-in-out infinite;
}
@keyframes loading-slide {
  0%   { transform: translateX(-120%); }
  100% { transform: translateX(320%); }
}
</style>
