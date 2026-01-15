<script setup>
import { ref, onMounted, computed } from 'vue';
import { Plus, Search, ChevronRight, Utensils, Trash2 } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { authFetch } from '../../utils/authFetch';

const router = useRouter();
const recipesList = ref([]);
const inventory = ref([]); // Add inventory ref
const loading = ref(true);
const searchQuery = ref('');

const fetchRecipes = async () => {
    loading.value = true;
    try {
        const [recipesRes, inventoryRes] = await Promise.all([
            authFetch('/api/recipes'),
            authFetch('/api/inventory')
        ]);
        
        if (!recipesRes.ok) throw new Error('Failed to fetch recipes');
        
        recipesList.value = await recipesRes.json();
        if (inventoryRes.ok) {
            inventory.value = await inventoryRes.json();
        }
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

onMounted(fetchRecipes);

// Calculate production cost helper
const getProductionCost = (ingredients) => {
    if (!ingredients || ingredients.length === 0) return 0;
    return ingredients.reduce((total, ing) => {
        const item = inventory.value.find(i => i.product === ing.productName);
        const cost = item ? Number(item.avgUnitPrice) : 0;
        return total + (cost * (Number(ing.quantity) || 0));
    }, 0);
};

const currentPage = ref(1);
const itemsPerPage = 9;

const filteredRecipes = computed(() => {
    let result = recipesList.value.map(r => ({
        ...r,
        productionCost: getProductionCost(r.ingredients) // Calculate cost here
    }));

    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        result = result.filter(r => 
            r.name.toLowerCase().includes(q)
        );
    }
    
    return result;
});

const paginatedRecipes = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredRecipes.value.slice(start, end);
});

const totalPages = computed(() => Math.ceil(filteredRecipes.value.length / itemsPerPage));

const nextPage = () => {
    if (currentPage.value < totalPages.value) currentPage.value++;
};

const prevPage = () => {
    if (currentPage.value > 1) currentPage.value--;
};

const currency = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

    const deleteRecipe = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta receta?')) return;
    try {
        const res = await authFetch(`/api/recipes/${id}`, { method: 'DELETE' });
        if (res.ok) {
            recipesList.value = recipesList.value.filter(r => r.id !== id);
        }
    } catch (error) {
        console.error(error);
        alert('Error al eliminar');
    }
};
</script>

<template>
  <div class="recipes-view">
    <div class="header">
      <div>
        <h1 class="page-title">Recetas</h1>
        <p class="page-subtitle">Define la producción de tus alimentos.</p>
      </div>
      <button class="primary-btn" @click="router.push('/admin/recipes/new')">
        <Plus :size="20" />
        <span>Nueva Receta</span>
      </button>
    </div>

    <div class="toolbar">
      <div class="search-box">
        <Search :size="18" class="search-icon" />
        <input type="text" v-model="searchQuery" placeholder="Buscar receta..." />
      </div>
    </div>

    <div v-if="!loading && filteredRecipes.length > 0">
      <div class="recipes-grid">
        <div v-for="recipe in paginatedRecipes" :key="recipe.id" class="recipe-card">
          <div class="card-content">
            <div class="recipe-icon">
              <Utensils :size="24" />
            </div>
            <div class="recipe-details">
              <h3 class="recipe-name">{{ recipe.name }}</h3>
              <div class="recipe-meta">
                  <span>{{ recipe.ingredients?.length || 0 }} Insumos</span>
                  <span class="meta-separator">•</span>
                  <span class="recipe-cost">{{ currency(recipe.productionCost) }}</span>
              </div>
            </div>
          </div>
          
          <div class="card-actions">
            <button class="action-btn delete" title="Eliminar" @click="deleteRecipe(recipe.id)">
              <Trash2 :size="18" />
            </button>
             <button class="action-btn edit" @click="router.push(`/admin/recipes/${recipe.id}/edit`)" title="Editar">
              <ChevronRight :size="20" />
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination Controls -->
      <div v-if="totalPages > 1" class="pagination-controls">
        <button class="pagination-btn" @click="prevPage" :disabled="currentPage === 1">
          Anterior
        </button>
        <span class="page-info">Página {{ currentPage }} de {{ totalPages }}</span>
        <button class="pagination-btn" @click="nextPage" :disabled="currentPage === totalPages">
          Siguiente
        </button>
      </div>
    </div>

    <div v-else-if="loading" class="loading-state">
      Cargando recetas...
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon"><Utensils size="48" /></div>
      <h3>No hay recetas aún</h3>
      <p>Comienza creando una nueva receta para tus platillos.</p>
      <button class="secondary-btn" @click="router.push('/admin/recipes/new')">Crear mi primera receta</button>
    </div>
  </div>
</template>

<style scoped>
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

.search-box {
  position: relative;
  max-width: 400px;
  margin-bottom: 2rem;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-box input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.8rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  background: white;
  font-size: 0.95rem;
}

.recipes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
}

.recipe-card {
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  padding: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s;
  cursor: pointer; /* Hint clickable */
}

.recipe-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
  border-color: var(--color-primary);
}

.card-content {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.recipe-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    background: var(--bg-surface);
    color: var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
}

.recipe-name {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--text-main);
    margin: 0 0 0.25rem 0;
}

.recipe-meta {
    font-size: 0.85rem;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.recipe-cost {
    font-weight: 600;
    color: var(--text-main);
}

.meta-separator {
    color: var(--border-color);
}

.card-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.action-btn {
  background: transparent;
  border: none;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
    background: var(--bg-surface);
    color: var(--color-primary);
}

.action-btn.delete:hover {
    background: #FFF1F2;
    color: #E11D48;
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding-bottom: 2rem;
}

.pagination-btn {
  background: var(--color-primary);
  color: white;
  border: 1px solid var(--color-primary);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.loading-state, .empty-state {
  text-align: center;
  padding: 5rem 2rem;
  background: white;
  border-radius: var(--radius-lg);
  border: 1px dashed var(--border-color);
  color: var(--text-muted);
}

.empty-icon {
  margin-bottom: 1.5rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  color: var(--text-main);
  margin-bottom: 0.5rem;
}

.empty-state p {
  margin-bottom: 2rem;
}

.secondary-btn {
  background: white;
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
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
