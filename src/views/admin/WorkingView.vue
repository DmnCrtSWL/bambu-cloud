<script setup>
import { Construction } from 'lucide-vue-next';

defineProps({
  title: {
    type: String,
    required: true
  }
});
</script>

<template>
  <div class="working-view">
    <div class="content">
      <Construction :size="64" class="icon" />
      <h1 class="title">{{ title }}</h1>
      <p class="subtitle">Módulo en fase de desarrollo.</p>
      <p class="description">Estamos trabajando para traerte esta funcionalidad pronto.</p>
    </div>
  </div>
</template>

<style scoped>
.working-view {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px; /* Ensure vertical centering in container */
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
}

.content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  max-width: 400px;
  padding: 2rem;
}

.icon {
  color: var(--color-primary);
  margin-bottom: 0.5rem;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.subtitle {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-muted);
  margin: 0;
}

.description {
  color: #94a3b8;
  margin: 0;
}
</style>
