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
        <div class="print-header">
            <h1>Inventario del día: {{ new Date().toLocaleDateString('es-MX') }}</h1>
        </div>

        <div class="print-grid">
            <!-- Headers only appear once at the start of the flow for simplicity, or we rely on page breaks. 
                 For a simple 2-column flow, a visual header row per column is hard without JS split. 
                 We will use a list flow. -->
            <div class="print-row header-row">
                <div class="col-name">Artículo</div>
                <div class="col-date">Última Compra</div>
                <div class="col-sys">Sist.</div>
                <div class="col-real">Real</div>
            </div>
            
            <div v-for="item in inventory" :key="item.product" class="print-row item-row">
                <div class="col-name">
                    <span class="p-name">{{ item.product }}</span>
                    <span class="p-type">{{ item.type }}</span>
                </div>
                <div class="col-date">{{ formatDate(item.lastPurchaseDate) }}</div>
                <div class="col-sys">{{ Number(item.totalQuantity).toLocaleString() }} {{ item.unit }}</div>
                <div class="col-real"><div class="write-box"></div></div>
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
    :global(.admin-layout > .main-content > header), /* Fallback */
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

    /* Document Setup */
    @page {
        margin: 0.8cm;
        size: letter;
    }

    body {
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
        font-family: Arial, sans-serif !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    
    .inventory-view {
        padding: 0 !important;
    }

    /* Print Layout */
    .print-only {
        display: block !important;
        width: 100%;
    }

    .print-header {
        text-align: center;
        margin-bottom: 1rem;
        column-span: all; /* Spans across columns if inside grid */
    }

    .print-header h1 {
        font-size: 18px !important;
        color: black !important;
        margin: 0;
        font-weight: 700;
        text-transform: uppercase;
    }

    /* Multi-column Grid */
    .print-grid {
        column-count: 2;
        column-gap: 1.5rem;
        width: 100%;
        font-size: 12px;
    }

    /* Row Styling */
    .print-row {
        display: flex;
        align-items: center;
        border-bottom: 1px solid #ccc;
        padding: 4px 0;
        break-inside: avoid; /* Prevent splitting rows */
        page-break-inside: avoid;
    }

    .header-row {
        font-weight: bold;
        border-bottom: 2px solid black;
        margin-bottom: 4px;
        /* Sticky doesn't work well in columns, usually. 
           This will appear at start of Col 1. */
    }

    /* Columns Widths */
    .col-name { flex: 2; padding-right: 5px; overflow: hidden; }
    .col-date { width: 70px; text-align: right; }
    .col-sys { width: 50px; text-align: center; }
    .col-real { width: 60px; padding-left: 5px; }

    .p-name { display: block; font-weight: 600; line-height: 1.1; }
    .p-type { display: block; font-size: 10px; color: #555; font-style: italic; }

    /* Box for Existencia Real */
    .write-box {
        border: 1px solid #000 !important;
        height: 18px; 
        background-color: white !important;
        width: 100%;
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
