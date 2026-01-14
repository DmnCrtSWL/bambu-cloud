<script setup>
defineProps({
  title: String
})
</script>

<template>
  <div class="placeholder-view">
    <h1 class="view-title">{{ title }}</h1>
    <div class="message-box">
      <p>Sección en construcción</p>
    </div>
  </div>
</template>

<style scoped>
.placeholder-view {
  padding: 1rem;
}
.view-title {
  font-size: 2rem;
  margin-bottom: 2rem;
  color: var(--color-primary);
}
.message-box {
  background: var(--bg-surface);
  padding: 3rem;
  border-radius: var(--radius-lg);
  border: 1px dashed var(--border-color);
  text-align: center;
  color: var(--text-muted);
}
</style>
