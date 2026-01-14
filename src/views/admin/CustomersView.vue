<script setup>
import { ref, onMounted, computed } from 'vue';
import { authFetch } from '../../utils/authFetch';
import { Users, Search, ArrowUpDown } from 'lucide-vue-next';


const customers = ref([]);
const loading = ref(true);
const searchTerm = ref('');
const sortKey = ref('lastOrderDate');
const sortDesc = ref(true);
const showOpenAccountsOnly = ref(false);

const fetchCustomers = async () => {
  try {
    const res = await authFetch('/api/customers');


    if (!res.ok) throw new Error('Failed to fetch customers');
    customers.value = await res.json();
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchCustomers);

const formatDate = (dateStr) => {
    if (!dateStr || new Date(dateStr).getTime() === 0) return 'Sin pedidos';
    return new Date(dateStr).toLocaleDateString('es-MX', { 
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
};

const sort = (key) => {
    if (sortKey.value === key) {
        sortDesc.value = !sortDesc.value;
    } else {
        sortKey.value = key;
        sortDesc.value = true; // Default desc for numbers usually
    }
};

const filteredCustomers = computed(() => {
    let result = customers.value;
    
    // Filter
    if (searchTerm.value) {
        const term = searchTerm.value.toLowerCase();
        result = result.filter(c => 
            c.name.toLowerCase().includes(term) || 
            c.phone.includes(term)
        );
    }

    // Filter by Open Accounts
    if (showOpenAccountsOnly.value) {
        result = result.filter(c => c.accountStatus === 'Abierta');
    }
    
    // Sort
    return result.sort((a, b) => {
        let valA = a[sortKey.value];
        let valB = b[sortKey.value];
        
        // Handle dates
        if (sortKey.value === 'lastOrderDate') {
             valA = new Date(valA || 0).getTime();
             valB = new Date(valB || 0).getTime();
        }

        if (valA < valB) return sortDesc.value ? 1 : -1;
    });
});



const currency = (val) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
};
</script>

<style scoped>
/* Added metric styles */
.header-actions {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}


</style>

<template>
  <div class="customers-view">
    <div class="header">
      <div>
        <h1 class="page-title">Clientes</h1>
        <p class="page-subtitle">Base de datos y análisis de comportamiento.</p>
      </div>
    </div>

    <!-- Toolbar with Search and Filters -->
    <div class="toolbar">
        <div class="search-group">
            <Search class="search-icon" size="18" />
            <input 
                v-model="searchTerm" 
                class="search-input"
                placeholder="Buscar por nombre o teléfono..." 
            />
        </div>

        <button 
            class="filter-btn" 
            :class="{ active: showOpenAccountsOnly }"
            @click="showOpenAccountsOnly = !showOpenAccountsOnly"
        >
            Cuentas Abiertas
        </button>
    </div>

    <div v-if="loading" class="loading-state">
        <p>Cargando clientes...</p>
    </div>

    <div v-else class="table-container">
        <table class="data-table">
            <thead>
                <tr>
                    <th @click="sort('name')">Nombre <ArrowUpDown size="14"/></th>
                    <th>Teléfono</th>
                    <th @click="sort('accountStatus')">Cuenta <ArrowUpDown size="14"/></th>
                    <th @click="sort('totalOrders')">Pedidos <ArrowUpDown size="14"/></th>
                    <th>Platillo Favorito</th>
                    <th @click="sort('lastOrderDate')">Último Pedido <ArrowUpDown size="14"/></th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="c in filteredCustomers" :key="c.id">
                    <td class="font-bold">{{ c.name }}</td>
                    <td class="text-mono">{{ c.phone }}</td>
                    <td>
                         <button 
                            v-if="c.accountStatus === 'Abierta'" 
                            class="status-pill status-open"
                            @click="$router.push({ name: 'admin-cxc', query: { search: c.phone } })"
                        >
                            Abierta
                        </button>
                        <span v-else class="status-pill status-closed">Cerrada</span>
                    </td>
                    <td>
                        <span class="badge">{{ c.totalOrders }}</span>
                    </td>
                    <td>{{ c.favoriteItem }}</td>
                    <td class="text-muted">{{ formatDate(c.lastOrderDate) }}</td>
                </tr>
                <tr v-if="filteredCustomers.length === 0">
                    <td colspan="6" class="empty-row">No se encontraron clientes</td>
                </tr>
            </tbody>
        </table>
    </div>
  </div>
</template>

<style scoped>
.customers-view {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  height: 100%;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}



.table-container {
    background: white;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    border: 1px solid var(--border-color);
}

.data-table {
    width: 100%;
    border-collapse: collapse;
}

.data-table th, .data-table td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid #f1f5f9;
}

.data-table th {
    font-weight: 600;
    color: #64748b;
    font-size: 0.85rem;
    background: #f8fafc;
    cursor: pointer;
    user-select: none;
}
.data-table th:hover { background: #f1f5f9; }

.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover { background: #fdfdfd; }

.font-bold { font-weight: 600; color: var(--text-main); }
.text-mono { font-family: monospace; color: var(--color-primary); }
.text-muted { color: #94a3b8; font-size: 0.9rem; }

.badge {
    background: #eff6ff;
    color: var(--color-primary);
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 0.85rem;
}

.status-pill {
    padding: 0.3rem 0.8rem;
    border-radius: 99px;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
}

.status-closed {
    background: #DCFCE7;
    color: #166534;
    border: 1px solid #bbf7d0;
}

.status-open {
    background: #FFEDD5;
    color: #9A3412;
    border: 1px solid #FED7AA;
    cursor: pointer;
    transition: all 0.2s;
    outline: none;
    text-decoration: none;
}
.status-open:hover {
    background: #FED7AA;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(251, 146, 60, 0.2);
}

.empty-row {
    text-align: center;
    padding: 3rem;
    color: #94a3b8;
}

/* Toolbar Styles */
.toolbar {
    background: white;
    padding: 1.25rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 1rem;
}

.search-group {
    position: relative;
    width: 300px;
}

.search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
}

.search-input {
    width: 100%;
    padding: 0.6rem 1rem 0.6rem 2.4rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    outline: none;
    transition: border-color 0.2s;
}

.search-input:focus {
    border-color: var(--color-primary);
}

.filter-btn {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    background: white;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-main);
}

.filter-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
}

.filter-btn.active {
    background-color: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
}

.loading-state {
    text-align: center;
    padding: 3rem;
    color: #94a3b8;
}

@media (max-width: 768px) {
    .toolbar {
        flex-direction: column;
        align-items: stretch;
    }

    .search-group {
        width: 100%;
    }

    .filter-btn {
        width: 100%;
        text-align: center;
    }
    
    .table-container {
        overflow-x: auto; /* Enable horizontal scrolling */
    }
}
</style>
