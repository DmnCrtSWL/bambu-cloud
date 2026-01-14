<script setup>
import { ref, onMounted } from 'vue';
import { authFetch } from '../../utils/authFetch';
import { useRouter } from 'vue-router';

import { 
  Plus, 
  Search, 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield, 
} from 'lucide-vue-next';

const router = useRouter();
const users = ref([]);
const loading = ref(true);
const searchQuery = ref('');

const fetchUsers = async () => {
    loading.value = true;
    try {
        const res = await authFetch('/api/users');


        if (!res.ok) throw new Error('Error al obtener usuarios');
        users.value = await res.json();
    } catch (err) {
        console.error(err);
        // Error handling
    } finally {
        loading.value = false;
    }
};

onMounted(fetchUsers);

const openCreate = () => {
    router.push('/admin/users/new');
};

const openEdit = (user) => {
    router.push(`/admin/users/${user.id}/edit`);
};



const deleteUser = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
        const res = await authFetch(`/api/users/${id}`, { method: 'DELETE' });

        if (!res.ok) throw new Error('Error al eliminar');
        await fetchUsers();
    } catch (err) {
        alert(err.message);
    }
};

const getRoleBadgeClass = (role) => {
    if (role === 'Administrador') return 'badge-admin';
    if (role === 'Gerencia') return 'badge-gerencia';
    return 'badge-operativo';
};
</script>

<template>
  <div class="users-view">
    <div class="header">
      <div>
        <h1 class="page-title">Operadores</h1>
        <p class="page-subtitle">Administra los operadores del sistema y sus niveles de acceso.</p>
      </div>
      <button class="primary-btn" @click="openCreate">
        <Plus size="20" />
        <span>Nuevo Operador</span>
      </button>
    </div>

    <div class="filters-bar">
      <div class="search-box">
        <Search :size="18" class="search-icon" />
        <input type="text" v-model="searchQuery" placeholder="Buscar por nombre, usuario o correo..." />
      </div>
    </div>

    <div class="table-container card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Usuario</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="text-center py-8 text-muted">Cargando usuarios...</td>
          </tr>
          <tr v-else-if="users.length === 0">
            <td colspan="5" class="text-center py-8 text-muted">No hay usuarios registrados.</td>
          </tr>
          <tr v-for="user in users" :key="user.id">
            <td>
              <div class="user-info">
                <div class="avatar-sm">{{ user.name.charAt(0) }}</div>
                <span>{{ user.name }}</span>
              </div>
            </td>
            <td><code class="username-code">{{ user.username }}</code></td>
            <td>{{ user.email }}</td>
            <td>
              <span class="badge" :class="getRoleBadgeClass(user.role)">
                <Shield :size="12" />
                {{ user.role }}
              </span>
            </td>
            <td>
              <div class="actions">
                <button class="action-btn" @click="openEdit(user)" title="Editar">
                  <Edit :size="18" />
                </button>
                <button class="action-btn delete" @click="deleteUser(user.id)" title="Eliminar">
                  <Trash2 :size="18" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>


  </div>
</template>

<style scoped>
.users-view {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.page-title {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}

.page-subtitle {
  color: var(--text-muted);
}

.card {
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
}

.filters-bar {
  display: flex;
  gap: 1rem;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-box input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.8rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.95rem;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th {
  padding: 1rem 1.5rem;
  background: #f8fafc;
  color: #64748b;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border-color);
}

.data-table td {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  color: #1e293b;
  font-size: 0.95rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar-sm {
  width: 32px;
  height: 32px;
  background: var(--color-accent);
  color: var(--color-primary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
}

.username-code {
  background: #f1f5f9;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-family: monospace;
  font-weight: 600;
  color: #475569;
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.badge-admin { background: #fee2e2; color: #991b1b; }
.badge-gerencia { background: #fef9c3; color: #854d0e; }
.badge-operativo { background: #dcfce7; color: #166534; }

.actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: transparent;
  padding: 6px;
  color: var(--text-muted);
  border-radius: 6px;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background-color: var(--bg-app);
  color: var(--color-primary);
}

.action-btn.delete:hover {
  background-color: #FFEBEE;
  color: #D32F2F;
}

.primary-btn {
  background-color: var(--color-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-md);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-btn:hover {
  background-color: var(--color-primary-dark);
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .primary-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
