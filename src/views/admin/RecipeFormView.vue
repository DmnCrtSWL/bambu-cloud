<script setup>
import { ref, onMounted, computed } from 'vue';
import { authFetch } from '../../utils/authFetch';
import { useRoute, useRouter } from 'vue-router';

import { ArrowLeft, Save, Plus, Trash2, Utensils, Search, X, ChevronDown, CheckCircle, AlertCircle } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const isEdit = computed(() => !!route.params.id);

// --- State ---
const recipe = ref({
    name: '',
    description: '',
    name: '',
    price: '', // Will be ignored/defaulted by backend
    category: '', // Will be ignored/defaulted by backend
    ingredients: []
});

const loading = ref(false);
const saving = ref(false);
const inventory = ref([]); 
const showInventoryModal = ref(false);
const inventorySearch = ref('');
const toast = ref({ show: false, message: '', type: 'success' });
const categories = ['Barra de Café', 'Desayunos', 'Sandwiches', 'Menú del Día', 'Huevos', 'Bebidas', 'Dulcería', 'Extras'];

// --- Methods ---
const showToast = (msg, type = 'success') => {
    toast.value = { show: true, message: msg, type };
    setTimeout(() => toast.value.show = false, 3000);
};

const fetchInventory = async () => {
    try {
        const res = await authFetch('/api/inventory');


        if (res.ok) inventory.value = await res.json();
    } catch (error) {
        console.error(error);
    }
};

const fetchRecipe = async () => {
    if (!isEdit.value) return;
    loading.value = true;
    try {
        const res = await authFetch(`/api/recipes/${route.params.id}`);

        if (res.ok) {
            const data = await res.json();
            recipe.value = {
                ...data,
                price: Number(data.price),
                ingredients: data.ingredients.map(ing => ({ ...ing, quantity: Number(ing.quantity) }))
            };
        }
    } catch (error) {
        console.error(error);
        showToast('Error al cargar la receta', 'error');
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchRecipe();
    fetchInventory();
});

const addIngredient = (item) => {
    recipe.value.ingredients.push({
        productName: item.product,
        quantity: 1,
        unit: item.unit
    });
    showInventoryModal.value = false;
    showToast(`${item.product} agregado`);
};

const removeIngredient = (index) => {
    recipe.value.ingredients.splice(index, 1);
};

const saveRecipe = async () => {
    if (!recipe.value.name) {
        showToast('El nombre es obligatorio', 'error');
        return;
    }

    saving.value = true;
    try {
        const url = isEdit.value 
            ? `http://localhost:3000/api/recipes/${route.params.id}` 
            : 'http://localhost:3000/api/recipes';
        
        // Ensure numeric fields are strings for Drizzle/PG
        const payload = {
            ...recipe.value,
            price: String(recipe.value.price || '0'), 
            isPublic: true, 
            variations: [],
            ingredients: recipe.value.ingredients.map(ing => ({
                productName: ing.productName,
                quantity: String(ing.quantity || '0'), // Safe conversion
                unit: ing.unit
            }))
        };

        console.log('Saving Recipe Payload:', JSON.stringify(payload, null, 2));

        const res = await authFetch(url, {
            method: isEdit.value ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });


        if (res.ok) {
            showToast('Receta guardada exitosamente');
            setTimeout(() => router.push('/admin/recipes'), 1000);
        } else {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to save');
        }
    } catch (error) {
        console.error(error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        saving.value = false;
    }
};

const cancel = () => {
    router.push('/admin/recipes');
};

const filteredInventory = computed(() => {
    if (!inventorySearch.value) return inventory.value;
    const q = inventorySearch.value.toLowerCase();
    return inventory.value.filter(i => i.product.toLowerCase().includes(q));
});
// Cost logic
const productionCost = computed(() => {
    return recipe.value.ingredients.reduce((total, ing) => {
        // Find current cost in inventory
        const item = inventory.value.find(i => i.product === ing.productName);
        const cost = item ? Number(item.avgUnitPrice) : 0;
        return total + (cost * (Number(ing.quantity) || 0));
    }, 0);
});

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
};
</script>

<template>
  <div class="form-view">
    <!-- Header consistent with PurchaseForm -->
    <div class="header">
      <button class="back-btn" @click="cancel">
        <ArrowLeft size="20" />
      </button>
      <div>
        <h1 class="page-title">{{ isEdit ? 'Editar Receta' : 'Nueva Receta' }}</h1>
        <p class="page-subtitle">{{ isEdit ? 'Actualiza los detalles del producto.' : 'Registra un nuevo producto en el menú.' }}</p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
    </div>

    <div v-else class="form-container">
        <form @submit.prevent="saveRecipe" class="recipe-form">
            
            <div class="form-grid">
                <!-- Name -->
                <div class="form-group">
                    <label>Nombre del Platillo</label>
                    <input type="text" v-model="recipe.name" placeholder="Ej. Cappuccino Grande" required />
                </div>
                
                <!-- Production Cost (Read Only) -->
                <div class="form-group">
                    <label>Costo de Producción (Estimado)</label>
                    <div class="input-wrapper readonly">
                        <span class="prefix text-muted">$</span>
                        <input 
                            type="text" 
                            :value="productionCost.toFixed(2)" 
                            readonly 
                            class="text-muted font-medium bg-gray-50 cursor-not-allowed"
                        />
                    </div>
                </div>
            </div>

            <!-- Ingredients Section (Styled to match form aesthetics) -->
            <div class="ingredients-section mt-6">
                <div class="section-header">
                    <label class="section-label">Receta / Insumos</label>
                    <button type="button" class="btn small action-btn-add" @click="showInventoryModal = true">
                        <Plus size="16" /> Agregar Insumo
                    </button>
                </div>

                <div class="table-container">
                    <table class="ingredients-table">
                        <thead>
                            <tr>
                                <th>Insumo</th>
                                <th class="text-center w-32">Cantidad</th>
                                <th class="text-center w-24">Unidad</th>
                                <th class="w-16"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="recipe.ingredients.length === 0">
                                <td colspan="4" class="empty-cell">Sin ingredientes asignados.</td>
                            </tr>
                            <tr v-for="(ing, idx) in recipe.ingredients" :key="idx">
                                <td class="font-medium">{{ ing.productName }}</td>
                                <td class="text-center">
                                    <input type="number" v-model="ing.quantity" class="qty-input" step="0.01" min="0">
                                </td>
                                <td class="text-center text-muted text-sm">{{ ing.unit }}</td>
                                <td class="text-right">
                                    <button type="button" class="btn-icon danger" @click="removeIngredient(idx)">
                                        <Trash2 size="16" />
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn secondary" @click="cancel">
                    <X size="18" />
                    <span>Cancelar</span>
                </button>
                <button type="submit" class="btn primary" :disabled="saving">
                    <Save size="18" />
                    <span>{{ saving ? 'Guardando...' : 'Guardar Receta' }}</span>
                </button>
            </div>

        </form>
    </div>
    
    <!-- Inventory Modal -->
     <div v-if="showInventoryModal" class="modal-overlay" @click.self="showInventoryModal = false">
        <div class="modal">
            <div class="modal-header">
                <h3>Seleccionar Ingrediente</h3>
                <button class="close-btn" @click="showInventoryModal = false"><X :size="20"/></button>
            </div>
            <div class="modal-body">
                <div class="search-bar">
                    <Search :size="18" class="search-icon" />
                    <input type="text" v-model="inventorySearch" placeholder="Buscar insumo..." class="w-full" autofocus>
                </div>
                <div class="inventory-list-modal">
                    <div 
                        v-for="item in filteredInventory" 
                        :key="item.id" 
                        class="inventory-option"
                        @click="addIngredient(item)"
                    >
                        <span class="font-medium">{{ item.product }}</span>
                        <span class="badge">{{ item.unit }}</span>
                    </div>
                     <div v-if="filteredInventory.length === 0" class="p-4 text-center text-muted">
                        No se encontraron insumos.
                    </div>
                </div>
            </div>
        </div>
     </div>

     <!-- Toast -->
     <Transition name="fade">
        <div v-if="toast.show" class="toast" :class="toast.type">
            <CheckCircle v-if="toast.type === 'success'" :size="20"/>
            <AlertCircle v-else :size="20"/>
            <span>{{ toast.message }}</span>
        </div>
     </Transition>

  </div>
</template>

<style scoped>
/* Matching PurchaseForm styling */
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

.recipe-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* Force 2 columns */
  gap: 1.5rem;
}
.col-span-2 { grid-column: span 2; }

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-weight: 500;
  font-size: 0.9rem;
  color: var(--text-main);
}

.section-label {
    font-weight: 600;
    font-size: 1rem;
    color: var(--color-primary);
}

.section-header {
    margin-bottom: 20px; /* Explicit separation from table */
    display: flex;
    justify-content: space-between;
    align-items: center;
}

input, select {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background-color: var(--bg-app); /* Matched bg */
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

.prefix {
  position: absolute;
  left: 1rem;
  color: var(--text-muted);
  font-weight: 500;
}

.input-wrapper input {
  padding-left: 2rem;
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

.btn.secondary {
  background-color: transparent;
  color: var(--text-muted);
  border: 1px solid transparent;
}

.btn.secondary:hover {
  background-color: var(--bg-app);
  color: var(--text-main);
}

/* Ingredients Table Specifics */
.table-container {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    overflow: hidden;
}

.ingredients-table {
    width: 100%;
    border-collapse: collapse;
}

.ingredients-table th {
    background: #f8fafc;
    padding: 0.75rem 1rem;
    text-align: left;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    border-bottom: 1px solid var(--border-color);
}

.ingredients-table td {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
}
.ingredients-table tr:last-child td { border-bottom: none; }

.qty-input {
    width: 100%; 
    padding: 0.5rem; 
    text-align: center; 
    background: white; /* In table inputs look better white */
}

.btn-icon.danger {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.4rem;
    border-radius: 6px;
}
.btn-icon.danger:hover {
    background: #fee2e2;
    color: #ef4444;
}

.action-btn-add {
    background: white;
    border: 1px dashed var(--border-color);
    color: var(--color-primary);
    padding: 0.5rem 1rem;
}
.action-btn-add:hover {
    background: #f0fdfa;
    border-color: var(--color-primary);
}

.text-center { text-align: center; }
.text-right { text-align: right; }
.text-muted { color: var(--text-muted); }
.text-sm { font-size: 0.85rem; }
.font-medium { font-weight: 500; }
.empty-cell { padding: 2rem; color: var(--text-muted); font-style: italic; text-align: center;}

/* Modal (Keep existing clean modal styles) */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 50; backdrop-filter: blur(2px); }
.modal { background: white; width: 450px; border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-md); animation: slideUp 0.3s ease-out; }
.modal-header { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; font-weight: 700; color: var(--color-primary); }
.modal-body { padding: 1.5rem; }
.search-bar { position: relative; display: flex; align-items: center; margin-bottom: 1rem; }
.search-icon { position: absolute; left: 0.8rem; color: var(--text-muted); }
.search-bar input { padding-left: 2.5rem; width: 100%; }
.inventory-list-modal { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; }
.inventory-option { padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid #f1f5f9; display: flex; justify-content: space-between; cursor: pointer; transition: all 0.2s; }
.inventory-option:hover { background: #f0f9ff; border-color: var(--color-primary); }
.inventory-option .badge { font-size: 0.75rem; background: #e2e8f0; padding: 0.2rem 0.5rem; border-radius: 4px; }

/* Toast */
.toast { position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 1.5rem; border-radius: var(--radius-md); background: white; box-shadow: var(--shadow-md); display: flex; align-items: center; gap: 0.75rem; font-weight: 500; z-index: 100; border-left: 4px solid; }
.toast.success { border-left-color: #22c55e; color: #15803d; }
.toast.error { border-left-color: #ef4444; color: #b91c1c; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
