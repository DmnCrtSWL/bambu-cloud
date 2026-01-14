<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authFetch } from '../../utils/authFetch';
import { Search, ArrowUpDown, CheckCircle, ShoppingCart } from 'lucide-vue-next';

import { useCartStore } from '../../stores/cart';

const route = useRoute();
const router = useRouter(); 
const cartStore = useCartStore();

const accounts = ref([]);
const loading = ref(true);
const searchTerm = ref('');
const sortKey = ref('createdAt');
const sortDesc = ref(true);

const fetchAccounts = async () => {
    try {
        const res = await authFetch('/api/cxc');

        if (!res.ok) throw new Error('Failed to fetch CXC');
        accounts.value = await res.json();
        
        // Auto-filter if query param exists
        if (route.query.search) {
            searchTerm.value = route.query.search;
        }
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

onMounted(fetchAccounts);

const payAccount = (acc) => {
    // Check if already in cart
    const exists = cartStore.items.find(item => 
        item.type === 'cxc_payment' && 
        item.metadata?.cxcId === acc.id
    );

    if (exists) {
        alert('Esta cuenta ya está en el carrito');
        return;
    }

    cartStore.addItem({
        id: `cxc-${acc.id}`,
        name: `Pago de Cuenta - ${acc.customerName}`,
        price: parseFloat(acc.amount),
        quantity: 1,
        type: 'cxc_payment',
        metadata: { cxcId: acc.id }
    });
    router.push('/pos/terminal');
};

const payAllFiltered = () => {
    if (filteredAccounts.value.length === 0) return;
    
    let addedCount = 0;

    // Add all filtered accounts to cart
    filteredAccounts.value.forEach(acc => {
        // Check duplication
        const exists = cartStore.items.find(item => 
            item.type === 'cxc_payment' && 
            item.metadata?.cxcId === acc.id
        );

        if (!exists) {
            cartStore.addItem({
                id: `cxc-${acc.id}`,
                name: `Pago de Cuenta - ${acc.customerName}`,
                price: parseFloat(acc.amount),
                quantity: 1,
                type: 'cxc_payment',
                metadata: { cxcId: acc.id }
            });
            addedCount++;
        }
    });

    if (addedCount === 0) {
        alert('Las cuentas filtradas ya están en el carrito');
    } else {
        router.push('/pos/terminal');
    }
};



const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-MX', { 
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
};

const currency = (val) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
};

const sort = (key) => {
    if (sortKey.value === key) {
        sortDesc.value = !sortDesc.value;
    } else {
        sortKey.value = key;
        sortDesc.value = true; 
    }
};

const filteredAccounts = computed(() => {
    let result = accounts.value;
    
    // Filter
    if (searchTerm.value) {
        const term = searchTerm.value.toLowerCase();
        result = result.filter(a => 
            a.customerName.toLowerCase().includes(term) || 
            (a.customerPhone && a.customerPhone.includes(term))
        );
    }
    
    // Sort
    return result.sort((a, b) => {
        let valA = a[sortKey.value];
        let valB = b[sortKey.value];
        
        if (sortKey.value === 'createdAt' || sortKey.value === 'amount') {
             // Numeric/Date sort
             valA = new Date(valA).getTime() || parseFloat(valA);
             valB = new Date(valB).getTime() || parseFloat(valB);
        } else {
             valA = valA.toString().toLowerCase();
             valB = valB.toString().toLowerCase();
        }

        if (valA < valB) return sortDesc.value ? 1 : -1;
        if (valA > valB) return sortDesc.value ? -1 : 1;
        return 0;
    });
});

const totalFilteredAmount = computed(() => {
    return filteredAccounts.value.reduce((sum, acc) => sum + Number(acc.amount), 0);
});
</script>

<template>
  <div class="cxc-view">
    <div class="header">
      <div>
        <h1 class="page-title">Cuentas por Cobrar</h1>
        <p class="page-subtitle">Gestión de créditos y deudas pendientes.</p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
        <div class="search-group">
            <Search class="search-icon" size="18" />
            <input 
                v-model="searchTerm" 
                class="search-input"
                placeholder="Buscar por cliente o teléfono..." 
            />
        </div>

        <div class="toolbar-total" v-if="filteredAccounts.length > 0">
             <div class="total-info">
                <span class="total-label">Total Pendiente:</span>
                <span class="total-amount">{{ currency(totalFilteredAmount) }}</span>
            </div>
            
            <button v-if="searchTerm" class="liquidate-btn" @click="payAllFiltered">
                <ShoppingCart size="18" />
                Liquidar Filtrado
            </button>
        </div>
    </div>

    <div v-if="loading" class="loading-state">
        <p>Cargando cuentas...</p>
    </div>

    <div v-else class="table-container">
        <table class="data-table">
            <thead>
                <tr>
                    <th @click="sort('customerName')">Cliente <ArrowUpDown size="14"/></th>
                    <th>Contacto</th>
                    <th @click="sort('amount')">Monto <ArrowUpDown size="14"/></th>
                    <th @click="sort('createdAt')">Fecha <ArrowUpDown size="14"/></th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="acc in filteredAccounts" :key="acc.id">
                    <td class="font-bold">{{ acc.customerName }}</td>
                    <td class="text-mono">{{ acc.customerPhone || '-' }}</td>
                    <td class="amount-cell">{{ currency(acc.amount) }}</td>
                    <td class="text-muted">{{ formatDate(acc.createdAt) }}</td>
                    <td>
                        <button class="action-btn-text" @click="payAccount(acc)" title="Agregar al checkout">
                            <ShoppingCart size="18" />
                            <span>Enviar al Carrito</span>
                        </button>
                    </td>
                </tr>
                <tr v-if="filteredAccounts.length === 0">
                    <td colspan="6" class="empty-row">No hay cuentas pendientes</td>
                </tr>
            </tbody>
        </table>
    </div>
  </div>
</template>

<style scoped>
.cxc-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
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
.text-sm { font-size: 0.9rem; }

.amount-cell {
    font-weight: 700;
    color: #dc2626; /* Red for debt */
}

/* Toolbar Styles */
.toolbar {
    background: white;
    padding: 1.25rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
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

.toolbar-total {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.total-label {
    font-size: 0.9rem;
    color: var(--text-muted);
    font-weight: 600;
}

.total-amount {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-main);
}

.liquidate-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--color-primary);
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: var(--radius-md);
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
    font-size: 0.95rem;
}

.liquidate-btn:hover {
    background-color: #15803d; /* Darker shade of primary/green */
}

.total-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    margin-right: 1rem;
    padding-right: 1rem;
    border-right: 1px solid #e2e8f0;
}

.total-label {
    font-size: 0.8rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
}

.total-amount {
    font-size: 1.25rem;
    font-weight: 800;
    color: #dc2626; /* Red for debt */
    line-height: 1.2;
}

.action-btn-text {
  background: white;
  padding: 0.5rem 1rem;
  color: var(--text-main);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
}

.action-btn-text:hover {
  background-color: var(--bg-app);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.empty-row {
    text-align: center;
    padding: 3rem;
    color: #94a3b8;
}

.loading-state {
    text-align: center;
    padding: 3rem;
    color: #94a3b8;
}
</style>
