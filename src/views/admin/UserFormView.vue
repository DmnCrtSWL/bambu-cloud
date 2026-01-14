<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Save, X, ArrowLeft, User, Mail, Shield, Lock } from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

const isEdit = computed(() => !!route.params.id);
const loading = ref(false);
const saving = ref(false);

const roles = ['Administrador', 'Gerencia', 'Operativo'];

const form = ref({
  name: '',
  username: '',
  email: '',
  email: '',
  password: '',
  role: 'Operativo',
  accessPin: ''
});

const fetchUser = async () => {
    if (!isEdit.value) return;

    loading.value = true;
    try {
        const res = await authFetch(`/api/users/${route.params.id}`);

        if (!res.ok) throw new Error('Error al cargar usuario');
        const data = await res.json();
        
        form.value = {
            name: data.name,
            username: data.username,
            email: data.email,
            role: data.role,
            role: data.role,
            password: '', // Don't show hash
            accessPin: data.accessPin || ''
        };
    } catch (error) {
        console.error(error);
        alert('Error al cargar datos del usuario');
        router.push('/admin/users');
    } finally {
        loading.value = false;
    }
};

onMounted(fetchUser);

const saveUser = async () => {
    saving.value = true;
    try {
        const url = isEdit.value 
            ? `/api/users/${route.params.id}`
            : '/api/users';
        
        const method = isEdit.value ? 'PUT' : 'POST';

        // Filter out empty password on edit if not changed
        const payload = { ...form.value };
        if (isEdit.value && !payload.password) {
            delete payload.password;
        }

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Error al guardar usuario');
        
        router.push('/admin/users');
    } catch (error) {
        console.error(error);
        alert('Error al guardar el usuario');
    } finally {
        saving.value = false;
    }
};

const cancel = () => {
    router.back();
};
</script>

<template>
  <div class="form-view">
    <div class="header">
      <button class="back-btn" @click="cancel">
        <ArrowLeft size="20" />
      </button>
      <div>
        <h1 class="page-title">{{ isEdit ? 'Editar Operador' : 'Nuevo Operador' }}</h1>
        <p class="page-subtitle">{{ isEdit ? 'Actualiza los datos del operador.' : 'Registra un nuevo operador en el sistema.' }}</p>
      </div>
    </div>

    <div class="form-container">
      <form @submit.prevent="saveUser" class="user-form">
        
        <div class="form-grid">
            <div class="form-group full">
                <label>Nombre Completo</label>
                <div class="input-wrapper">
                    <User size="18" class="input-icon" />
                    <input v-model="form.name" required placeholder="Ej. Juan Pérez" class="pl-icon" />
                </div>
            </div>

            <div class="form-group">
                <label>Usuario</label>
                <div class="input-wrapper">
                    <User size="18" class="input-icon" />
                    <input v-model="form.username" required placeholder="Ej. jperez" class="pl-icon" />
                </div>
            </div>

            <div class="form-group">
                <label>Rol</label>
                <div class="input-wrapper">
                    <Shield size="18" class="input-icon" />
                    <select v-model="form.role" required class="pl-icon">
                        <option v-for="role in roles" :key="role" :value="role">{{ role }}</option>
                    </select>
                </div>
            </div>

            <div class="form-group full">
                <label>Correo Electrónico</label>
                <div class="input-wrapper">
                    <Mail size="18" class="input-icon" />
                    <input type="email" v-model="form.email" required placeholder="correo@ejemplo.com" class="pl-icon" />
                </div>
            </div>

            <div class="form-group full">
                <label>{{ isEdit ? 'Nueva Contraseña (Opcional)' : 'Contraseña' }}</label>
                <div class="input-wrapper">
                    <Lock size="18" class="input-icon" />
                    <input type="password" v-model="form.password" :required="!isEdit" placeholder="••••••••" class="pl-icon" />
                </div>
            </div>

            <div class="form-group full" v-if="form.role !== 'Administrador'">
                <label>PIN de Acceso (4 dígitos/letras)</label>
                <div class="input-wrapper">
                    <Lock size="18" class="input-icon" />
                    <input type="text" v-model="form.accessPin" maxlength="4" required placeholder="Ej. 1234" class="pl-icon" />
                </div>
                <small class="text-muted">Requerido para desbloqueo rápido.</small>
            </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn secondary" @click="cancel">
            <X size="18" />
            <span>Cancelar</span>
          </button>
          <button type="submit" class="btn primary" :disabled="saving">
            <Save size="18" />
            <span>{{ isEdit ? 'Actualizar Operador' : 'Guardar Operador' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.form-view {
  max-width: 800px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.back-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  cursor: pointer;
}

.back-btn:hover {
  background-color: var(--bg-surface);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.page-title {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.page-subtitle {
  color: var(--text-muted);
}

.form-container {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 2rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.user-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group.full {
    grid-column: 1 / -1;
}

label {
  font-weight: 500;
  font-size: 0.9rem;
  color: var(--text-main);
}

input, select {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background-color: var(--bg-app);
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--text-main);
  transition: all 0.2s;
  width: 100%;
}

input:focus, select:focus {
  outline: none;
  border-color: var(--color-primary);
  background-color: #fff;
  box-shadow: 0 0 0 3px var(--color-accent);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1rem;
  color: var(--text-muted);
  pointer-events: none;
}

.pl-icon {
    padding-left: 2.5rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all 0.2s;
}

.btn.primary {
  background-color: var(--color-primary);
  color: white;
  border: 1px solid transparent;
}

.btn.primary:hover {
  background-color: var(--color-primary-dark);
}

.btn.primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn.secondary {
  background-color: transparent;
  color: var(--text-muted);
  border: 1px solid transparent;
}

.btn.secondary:hover {
  background-color: var(--bg-app);
  color: var(--text-main);
}
</style>
