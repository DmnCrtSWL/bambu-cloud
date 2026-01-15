<script setup>
import { ref, computed, onMounted } from 'vue';
import { authFetch } from '../../utils/authFetch';
import { Printer, Sparkles, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-vue-next';



const inventory = ref([]);
const loading = ref(true);
const filterType = ref('Todos');

// Sorting State
const sortKey = ref('product');
const sortOrder = ref('asc'); // 'asc' or 'desc'

const fetchInventory = async () => {
    loading.value = true;
    try {
        const res = await authFetch('/api/inventory');


        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        inventory.value = data;
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

onMounted(fetchInventory);

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date).replace('.', '');
};

const getStockStatus = (quantity) => {
    const q = Number(quantity);
    if (q <= 0) return { label: 'Agotado', class: 'status-danger' };
    if (q < 5) return { label: 'Bajo', class: 'status-warning' };
    return { label: 'Suficiente', class: 'status-success' };
};

const sortedInventory = computed(() => {
    let items = inventory.value;
    
    // 1. Filter
    if (filterType.value !== 'Todos') {
        items = items.filter(item => item.type === filterType.value);
    }

    // 2. Sort
    return [...items].sort((a, b) => {
        let valA = a[sortKey.value];
        let valB = b[sortKey.value];

        // Specific handling for numbers (Stock)
        if (sortKey.value === 'totalQuantity') {
            valA = Number(valA);
            valB = Number(valB);
        }
        
        // Handle nulls
        if (valA == null) valA = '';
        if (valB == null) valB = '';

        if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1;
        return 0;
    });
});

const sortBy = (key) => {
    if (sortKey.value === key) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortKey.value = key;
        sortOrder.value = 'asc';
    }
};

// Pagination
const itemsPerPage = 10;
const currentPage = ref(1);
const totalPages = computed(() => Math.ceil(sortedInventory.value.length / itemsPerPage));
const paginatedInventory = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    return sortedInventory.value.slice(start, start + itemsPerPage);
});

const currency = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

const handlePrint = () => {
    window.print();
};

const handleSmartList = () => {
    alert('Generando lista de compras inteligente... (Conectando con n8n)');
};
</script>

<template>
  <div class="inventory-view">
    
    <!-- Print Only Section -->
    <div class="print-only">
        <!-- Header Grid -->
        <div class="print-header-grid">
            <div class="ph-col-3 left-align">
                 <img src="/logo-bambu.png" alt="Logo" class="print-logo" />
            </div>
            <div class="ph-col-6 center-align">
                <h1 class="print-title">Inventario</h1>
            </div>
            <div class="ph-col-3 right-align">
                <span class="print-date">{{ new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</span>
            </div>
        </div>
        
        <hr class="print-hr" />

        <!-- List Content (2 Columns Flow) -->
        <div class="print-content-flow">
            <!-- Items Loop -->
             <div v-for="item in inventory" :key="item.product" class="print-item-row">
                <div class="pi-info">
                    <span class="pi-name">{{ item.product }}</span>
                    <span class="pi-meta">{{ item.type }} | Últ. Compra: {{ formatDate(item.lastPurchaseDate) }}</span>
                </div>
                <div class="pi-stock">
                    <span class="pi-val">{{ Number(item.totalQuantity).toLocaleString() }}</span>
                    <span class="pi-unit">{{ item.unit }}</span>
                </div>
                <div class="pi-manual">
                    <div class="manual-box"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Screen Only Content -->
    <div class="screen-only">
        <div class="header">
        <div>
            <h1 class="page-title">Inventario</h1>
            <p class="page-subtitle">Visualiza el stock disponible calculado desde tus compras.</p>
        </div>
        <div class="header-actions">
            <button class="primary-btn" @click="handlePrint">
            <Printer size="20" />
            <span>Imprimir Inventario</span>
            </button>
            <button class="primary-btn" @click="handleSmartList">
            <Sparkles size="20" />
            <span>Lista de Compras</span>
            </button>
        </div>
        </div>

        <!-- Filters Toolbar -->
        <div class="toolbar">
        <div class="filter-section">
            <div class="quick-filters">
            <button 
                v-for="type in ['Todos', 'Insumo', 'Terminado', 'Operativo']" 
                :key="type"
                class="filter-btn"
                :class="{ active: filterType === type }"
                @click="filterType = type; currentPage = 1"
            >
                {{ type }}
            </button>
            </div>
        </div>
        </div>

        <div class="table-container">
        <table class="data-table">
            <thead>
            <tr>
                <th @click="sortBy('product')" class="sortable">
                    <div class="th-content">
                        Nombre del Producto
                        <span v-if="sortKey === 'product'">
                            <ArrowUp v-if="sortOrder === 'asc'" size="14" />
                            <ArrowDown v-else size="14" />
                        </span>
                    </div>
                </th>
                <th @click="sortBy('type')" class="sortable">
                    <div class="th-content">
                        Tipo
                        <span v-if="sortKey === 'type'">
                            <ArrowUp v-if="sortOrder === 'asc'" size="14" />
                            <ArrowDown v-else size="14" />
                        </span>
                    </div>
                </th>
                <th>Cantidad</th>
                <th>U/M</th>
                <th>Costo Promedio</th>
                <th>Última Compra</th>
                <th @click="sortBy('totalQuantity')" class="sortable">
                    <div class="th-content">
                        Stock
                        <span v-if="sortKey === 'totalQuantity'">
                            <ArrowUp v-if="sortOrder === 'asc'" size="14" />
                            <ArrowDown v-else size="14" />
                        </span>
                    </div>
                </th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="item in paginatedInventory" :key="item.product">
                <td class="font-medium text-primary">{{ item.product }}</td>
                <td><span class="type-badge">{{ item.type || 'N/A' }}</span></td>
                <td>{{ Number(item.totalQuantity).toLocaleString() }}</td>
                <td class="text-muted">{{ item.unit }}</td>
                <td class="font-bold">{{ currency(item.avgUnitPrice) }}</td>
                <td class="capitalize">{{ formatDate(item.lastPurchaseDate) }}</td>
                <td>
                <span 
                    class="status-badge" 
                    :class="getStockStatus(item.totalQuantity).class"
                >
                    {{ getStockStatus(item.totalQuantity).label }}
                </span>
                </td>
            </tr>
            <tr v-if="!loading && inventory.length === 0">
                <td colspan="7" class="empty-state">No hay productos desglosados para mostrar en inventario.</td>
            </tr>
            <tr v-if="loading">
                <td colspan="7" class="loading-state">Calculando inventario...</td>
            </tr>
            </tbody>
        </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" v-if="sortedInventory.length > 0">
        <span class="page-info">
            Mostrando {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, sortedInventory.length) }} de {{ sortedInventory.length }} productos
        </span>
        <div class="pagination-controls">
            <button 
            class="page-btn" 
            :disabled="currentPage === 1"
            @click="currentPage--"
            >
            <ChevronLeft size="18" />
            </button>
            <span class="current-page">{{ currentPage }}</span>
            <button 
            class="page-btn" 
            :disabled="currentPage === totalPages"
            @click="currentPage++"
            >
            <ChevronRight size="18" />
            </button>
        </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* Header & Layout */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.page-title {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}

.page-subtitle {
  color: var(--text-muted);
}

/* Buttons */
.primary-btn, .secondary-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-btn {
  background-color: var(--color-primary);
  color: white;
  border: none;
}

.primary-btn:hover {
  background-color: var(--color-primary-dark);
}

.secondary-btn {
  background-color: transparent;
  color: var(--text-muted);
  border: 1px solid transparent;
}

.secondary-btn:hover {
  background-color: var(--bg-app);
  color: var(--text-main);
  border-color: transparent;
}

/* Table */
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
}

.data-table tr:last-child td {
  border-bottom: none;
}

.sortable {
    cursor: pointer;
    user-select: none;
}

.sortable:hover {
    background-color: #f1f5f9;
}

.th-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.text-center { text-align: center; }
.font-medium { font-weight: 500; }
.text-primary { color: var(--color-primary); }
.text-muted { color: var(--text-muted); }
.capitalize { text-transform: capitalize; }

.status-badge {
    padding: 0.35rem 0.85rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
}

.status-success {
    background-color: #E8F5E9;
    color: #2E7D32;
}

.status-warning {
    background-color: #FFF3E0;
    color: #EF6C00;
}

.status-danger {
    background-color: #FFEBEE;
    color: #C62828;
}

.empty-state, .loading-state {
    padding: 4rem !important;
    text-align: center;
    color: var(--text-muted);
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0.5rem;
}

.page-info {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-btn {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  padding: 0.4rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.current-page {
  font-weight: 600;
  min-width: 2rem;
  text-align: center;
}


/* Toolbar */
.toolbar {
    background: white;
    padding: 1.25rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.filter-section {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.quick-filters {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
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

.type-badge {
    background: #f0f4f8;
    color: var(--text-muted);
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.8rem;
    font-weight: 600;
}

/* Print Styles */
.print-only {
    display: none;
}

@media print {
    /* Globally Hide Sidebar, Header, etc. */
    :global(.sidebar), 
    :global(.topbar),
    :global(.admin-layout > .main-content > header),
    .screen-only {
        display: none !important;
    }

    /* Reset Layout Margins */
    :global(.main-content) {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
    }
    
    :global(.page-container) {
        padding: 0 !important;
    }

    body {
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    @page { size: letter; margin: 1cm; }

    /* Layout Structure */
    .print-only {
        display: block !important;
        width: 100%;
        font-family: 'Nunito', sans-serif !important;
    }

    /* Header Grid (12 Columns Concept) */
    .print-header-grid {
        display: flex;
        align-items: center;
        width: 100%;
        margin-bottom: 0.5rem;
    }

    .ph-col-3 { width: 25%; }
    .ph-col-6 { width: 50%; }
    
    .left-align { text-align: left; }
    .center-align { text-align: center; }
    .right-align { text-align: right; }

    .print-logo {
        height: 50px;
        width: auto;
    }

    .print-title {
        font-size: 24px;
        font-weight: 800;
        text-transform: uppercase;
        margin: 0;
        color: black;
    }

    .print-date {
        font-size: 14px;
        color: #444;
        text-transform: capitalize;
    }

    .print-hr {
        border: none;
        border-top: 2px solid black;
        margin: 0.5rem 0 1rem 0;
    }

    /* Content Flow (2 Columns) */
    .print-content-flow {
        column-count: 2;
        column-gap: 2rem;
        widows: 2;
        orphans: 2;
    }
    
    .print-item-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.4rem 0;
        border-bottom: 1px dashed #ccc;
        break-inside: avoid;
        page-break-inside: avoid;
        font-size: 14px; /* Requested 14px */
    }

    .pi-info {
        flex: 1;
        padding-right: 0.5rem;
    }

    .pi-name {
        display: block;
        font-weight: 700;
        color: black;
    }

    .pi-meta {
        display: block;
        font-size: 12px; /* Smaller meta info */
        color: #555;
    }

    .pi-stock {
        text-align: right;
        min-width: 60px;
        margin-right: 1rem;
    }

    .pi-val { font-weight: 700; font-size: 14px; }
    .pi-unit { font-size: 12px; color: #666; margin-left: 2px; }

    /* Manual Box */
    .pi-manual {
        width: 60px;
    }

    .manual-box {
        width: 100%;
        height: 24px;
        border: 1px solid black;
        background: white;
    }
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
    gap: 0.5rem;
  }

  .primary-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
