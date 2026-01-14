<script setup>
import { ref, onMounted, computed } from 'vue';
import { authFetch } from '../../utils/authFetch';
import { Search, Edit, Trash2, Plus } from 'lucide-vue-next';

import { useRouter } from 'vue-router';

const router = useRouter();
const recipesList = ref([]);
const loading = ref(true);
const searchQuery = ref('');
const inventory = ref([]);

const toast = ref({ show: false, message: '', type: 'success' });
const showEditModal = ref(false);
const editingItem = ref(null);
const saving = ref(false);

const showToast = (msg, type = 'success') => {
    toast.value = { show: true, message: msg, type };
    setTimeout(() => toast.value.show = false, 3000);
};

const fetchData = async () => {
    loading.value = true;
    try {
        const [recipesRes, inventoryRes] = await Promise.all([
            authFetch('/api/menu-items'),
            authFetch('/api/inventory')
        ]);


        if (recipesRes.ok) {
            recipesList.value = await recipesRes.json();
        }
        if (inventoryRes.ok) {
            inventory.value = await inventoryRes.json();
        }
    } catch (error) {
        console.error(error);
        showToast('Error al cargar datos', 'error');
    } finally {
        loading.value = false;
    }
};

onMounted(fetchData);

const getProductionCost = (ingredients) => {
    if (!ingredients || ingredients.length === 0) return 0;
    return ingredients.reduce((total, ing) => {
        const item = inventory.value.find(i => i.product === ing.productName);
        const cost = item ? Number(item.avgUnitPrice) : 0;
        return total + (cost * (Number(ing.quantity) || 0));
    }, 0);
};

const filteredItems = computed(() => {
    let items = recipesList.value.map(r => ({
        ...r,
        realCost: getProductionCost(r.ingredients),
        price: Number(r.price)
    }));

    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        items = items.filter(i => i.name.toLowerCase().includes(q));
    }
    
    return items;
});

const currency = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);


const openEditModal = (item) => {
    // Instead of modal, navigate to edit page
    router.push(`/admin/menu/${item.id}/edit`);
};

// Logic for Variations Presentation
const hasVariations = (item) => {
    return item.variations && Array.isArray(item.variations) && item.variations.length > 0;
};

const getPriceDisplay = (item) => {
    if (!hasVariations(item)) {
        return currency(item.price);
    }

    // Calculate Range
    let minTotal = 0;
    let maxTotal = 0;

    item.variations.forEach(group => {
        if (group.options && group.options.length > 0) {
            const prices = group.options.map(o => Number(o.price) || 0);
            minTotal += Math.min(...prices);
            maxTotal += Math.max(...prices);
        }
    });

    if (minTotal === maxTotal) return currency(minTotal);
    return `${currency(minTotal)} - ${currency(maxTotal)}`;
};

const deleteItem = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este platillo de la carta? (Se eliminará la receta)')) return;
    try {
        const res = await authFetch(`/api/menu-items/${id}`, { method: 'DELETE' });

        if (res.ok) {
            recipesList.value = recipesList.value.filter(r => r.id !== id);
            showToast('Eliminado correctamente');
        }
    } catch (error) {
        console.error(error);
        showToast('Error al eliminar', 'error');
    }
};
</script>

<template>
  <div class="menu-view">
    <div class="header">
      <div>
        <h1 class="page-title">Carta</h1>
        <p class="page-subtitle">Administra precios y visibilidad de tus productos.</p>
      </div>
      <router-link to="/admin/menu/new" class="primary-btn">
        <Plus size="20" />
        <span>Nuevo Platillo</span>
      </router-link>
    </div>

    <div class="toolbar">
        <div class="search-box">
            <Search :size="18" class="search-icon" />
            <input type="text" v-model="searchQuery" placeholder="Buscar producto..." />
        </div>
    </div>

    <!-- Table -->
    <div class="table-container">
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Costo Real</th>
                    <th>Tipo</th>
                    <th>Precio Venta</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody v-if="loading">
                <tr><td colspan="7" class="text-center p-8 text-muted">Cargando carta...</td></tr>
            </tbody>
            <tbody v-else-if="filteredItems.length === 0">
                <tr><td colspan="7" class="text-center p-8 text-muted">No hay productos registrados.</td></tr>
            </tbody>
            <tbody v-else>
                <tr v-for="item in filteredItems" :key="item.id">
                    <td class="font-medium text-main">{{ item.name }}</td>
                    <td class="text-muted">{{ item.category || '-' }}</td>
                    <td class="text-muted">{{ currency(item.realCost) }}</td>
                    <td>
                        <span class="badge" :class="hasVariations(item) ? 'badge-purple' : 'badge-blue'">
                            {{ hasVariations(item) ? 'Variable' : 'Sencillo' }}
                        </span>
                    </td>
                    <td class="font-bold text-primary">{{ getPriceDisplay(item) }}</td>
                    <td>
                        <span class="status-pill" :class="item.isActive ? 'status-success' : 'status-warning'">
                            {{ item.isActive ? 'Público' : 'Privado' }}
                        </span>
                    </td>
                    <td class="actions-cell">
                        <div class="action-buttons">
                            <button class="action-btn" @click="openEditModal(item)" title="Editar">
                                <Edit :size="18" />
                            </button>
                            <button class="action-btn delete" @click="deleteItem(item.id)" title="Eliminar">
                                <Trash2 :size="18" />
                            </button>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Edit Modal -->



    <!-- Toast -->
    <Transition name="fade">
        <div v-if="toast.show" class="toast" :class="toast.type">
            <span>{{ toast.message }}</span>
        </div>
    </Transition>

  </div>
</template>

<style scoped>
/* Removed max-width to match PurchasesView full width usage */
.menu-view {
    /* max-width removed */
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}

.page-subtitle {
  color: var(--text-muted);
}

.primary-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.2s;
  font-weight: 500;
}
.primary-btn:hover { background-color: var(--color-primary-dark); }

.toolbar {
    background: white;
    padding: 1.25rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    margin-bottom: 1.5rem;
}

.search-box {
  position: relative;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-box input {
  width: 100%;
  padding: 0.6rem 1rem 0.6rem 2.4rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  outline: none;
}
.search-box input:focus { border-color: var(--color-primary); }


.table-container {
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
    overflow-x: auto;
    margin-bottom: 1.5rem;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
    white-space: nowrap;
}

.data-table th {
    text-align: left;
    padding: 1rem 1.5rem;
    background-color: #FAFCFC;
    color: var(--text-muted);
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border-color);
}

.data-table td {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
    font-size: 0.95rem;
    vertical-align: middle;
}
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background-color: #F8FAFB; }

/* Status Pills */
.status-pill {
  display: inline-flex;
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.status-success { background-color: var(--color-accent); color: var(--color-primary-dark); }
.status-warning { background-color: #f1f5f9; color: #64748b; } 

.badge {
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}
.badge-blue { background-color: #E0F2FE; color: #0369A1; }
.badge-purple { background-color: #F3E8FF; color: #7E22CE; }

.text-right { text-align: right; }
.text-center { text-align: center; }
.text-muted { color: var(--text-muted); }
.text-primary { color: var(--color-primary); }
.font-bold { font-weight: 700; }
.font-medium { font-weight: 500; }
.text-main { color: var(--text-main); }
.actions-cell { width: 120px; }

.action-buttons {
  display: flex;
  justify-content: flex-start;
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
  cursor: pointer;
}
.action-btn:hover { background-color: var(--bg-app); color: var(--color-primary); }
.action-btn.delete:hover { background: #FFEBEE; color: #D32F2F; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 50; backdrop-filter: blur(2px); }
.modal { background: white; width: 400px; border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-xl); animation: fadeIn 0.2s ease-out; }
.modal-header { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; font-weight: 700; }
.modal-body { padding: 1.5rem; }
.close-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); }

.input-wrapper { position: relative; display: flex; align-items: center; }
.prefix { position: absolute; left: 0.75rem; color: var(--text-muted); }
.form-input { width: 100%; padding: 0.6rem 1rem 0.6rem 2rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); outline: none;}
.form-input:focus { border-color: var(--color-primary); }

.radio-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }

.btn { padding: 0.6rem 1.25rem; border-radius: var(--radius-md); font-weight: 500; cursor: pointer; transition: all 0.2s; }
.btn.primary { background: var(--color-primary); color: white; border: none; }
.btn.primary:hover { background: var(--color-primary-dark); }
.btn.secondary { background: transparent; border: 1px solid var(--border-color); color: var(--text-muted); }
.btn.secondary:hover { background: #f8fafc; color: var(--text-main); }

/* Toast */
.toast { position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 1.5rem; border-radius: var(--radius-md); background: white; box-shadow: var(--shadow-md); z-index: 100; border-left: 4px solid; font-weight: 500; }
.toast.success { border-left-color: #22c55e; color: #15803d; }
.toast.error { border-left-color: #ef4444; color: #b91c1c; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }

@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

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
