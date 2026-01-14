<script setup>
import { ref, computed, onMounted } from 'vue';
import { authFetch } from '../../utils/authFetch';
import { 
    Search, 
    Calendar, 
    Eye, 
    Clock, 
    User, 
    MapPin, 
    CreditCard, 
    Banknote, 
    Smartphone, 
    X, 
    Loader2 
} from 'lucide-vue-next';

// State
const sales = ref([]);
const loading = ref(true);
const searchQuery = ref('');
const selectedDate = ref(new Date().toISOString().split('T')[0]); // Default Today
const showDatePicker = ref(false);
const filterMode = ref('today'); // 'today', 'specific'

// Modal State
const selectedSale = ref(null);
const showModal = ref(false);

// API
const fetchSales = async () => {
    loading.value = true;
    try {
        let url = '/api/sales';
        const params = new URLSearchParams();
        
        if (filterMode.value === 'today') {
            params.append('today', 'true');
        } else if (filterMode.value === 'specific') {
            params.append('from', selectedDate.value);
            params.append('to', selectedDate.value);
        }
        
        url += `?${params.toString()}`;
        
        const res = await authFetch(url);

        if (!res.ok) throw new Error('Failed to fetch sales');
        sales.value = await res.json();
    } catch (error) {
        console.error(error);
        alert('Error al cargar el historial');
    } finally {
        loading.value = false;
    }
};

onMounted(fetchSales);

// Computed
const filteredSales = computed(() => {
    if (!searchQuery.value) return sales.value;
    const term = searchQuery.value.toLowerCase();
    return sales.value.filter(s => 
        (s.customerName || 'Venta en Barra').toLowerCase().includes(term) ||
        s.id.toString().includes(term)
    );
});

// Formatters
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

const getPaymentIcon = (method) => {
    if (!method) return Banknote;
    const m = method.toLowerCase();
    if (m.includes('tarjeta') || m.includes('terminal')) return CreditCard;
    if (m.includes('transferencia')) return Smartphone;
    return Banknote;
};

// Actions
// Actions
const setToday = () => {
    filterMode.value = 'today';
    fetchSales();
};

const setSpecific = () => {
    filterMode.value = 'specific';
    fetchSales();
};

const setDate = (e) => {
    selectedDate.value = e.target.value;
    filterMode.value = 'specific';
    fetchSales();
};

const openDetails = (sale) => {
    selectedSale.value = sale;
    showModal.value = true;
};

const closeModal = () => {
    selectedSale.value = null;
    showModal.value = false;
};
</script>

<template>
    <div class="history-view">
        <!-- Header & Toolbar -->
        <div class="header-section">
            <h1 class="page-title">Historial de Ventas</h1>
            
            <div class="toolbar-card">
                <div class="search-box">
                    <Search size="18" />
                    <input v-model="searchQuery" type="text" placeholder="Buscar por nombre..." />
                </div>

                <div class="divider"></div>

                <div class="filters">
                    <button 
                        class="filter-btn" 
                        :class="{ active: filterMode === 'today' }"
                        @click="setToday"
                    >
                        Hoy
                    </button>
                    
                    <button 
                        class="filter-btn" 
                        :class="{ active: filterMode === 'specific' }"
                        @click="setSpecific"
                    >
                        Día
                    </button>

                    <div v-if="filterMode === 'specific'" class="animate-fade-in inline-picker">
                        <input 
                            type="date" 
                            :value="selectedDate" 
                            @change="setDate"
                            class="date-input"
                        />
                    </div>
                </div>
            </div>
        </div>

        <!-- Table -->
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th width="80">Orden #</th>
                        <th>Nombre</th>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Total</th>
                        <th>Forma de Pago</th>
                        <th width="80">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="loading">
                        <td colspan="7" class="loading-cell">
                            <Loader2 class="animate-spin" /> Cargando...
                        </td>
                    </tr>
                    <tr v-else-if="filteredSales.length === 0">
                        <td colspan="7" class="empty-cell">No se encontraron ventas</td>
                    </tr>
                    <tr v-for="sale in filteredSales" :key="sale.id">
                        <td class="id-cell">#{{ sale.id }}</td>
                        <td class="name-cell">
                            <div class="customer-info" :class="{ 'no-name': !sale.customerName }">
                                {{ sale.customerName || 'Venta en Barra' }}
                            </div>
                        </td>
                        <td>{{ formatDate(sale.createdAt) }}</td>
                        <td>
                            <div class="time-badge">
                                <Clock size="14" />
                                {{ formatTime(sale.createdAt) }}
                            </div>
                        </td>
                        <td class="amount-cell">{{ formatCurrency(sale.total) }}</td>
                        <td>
                            <div class="payment-badge">
                                <component :is="getPaymentIcon(sale.paymentMethod)" size="14" />
                                {{ sale.paymentMethod }}
                            </div>
                        </td>
                        <td>
                            <button class="action-btn" @click="openDetails(sale)">
                                <Eye size="18" />
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Details Modal -->
        <div v-if="showModal && selectedSale" class="modal-overlay" @click.self="closeModal">
            <div class="modal-card">
                <button class="modal-close" @click="closeModal"><X size="24" /></button>
                
                <div class="modal-header">
                    <div class="header-main">
                        <h2>Orden #{{ selectedSale.id }}</h2>
                        <div class="time-display">
                            <Clock size="20" class="text-primary" />
                            <span>{{ formatTime(selectedSale.createdAt) }}</span>
                            <span class="date-sub">{{ formatDate(selectedSale.createdAt) }}</span>
                        </div>
                    </div>
                </div>

                <div class="modal-body">
                    <!-- Customer Info -->
                    <div class="info-section">
                        <h3>Cliente</h3>
                        <div class="info-grid">
                            <div class="info-row">
                                <User size="16" />
                                <strong>{{ selectedSale.customerName || 'Venta en Barra' }}</strong>
                            </div>
                            <div class="info-row" v-if="selectedSale.customerPhone">
                                <Smartphone size="16" />
                                <span>{{ selectedSale.customerPhone }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Products -->
                    <div class="info-section">
                        <h3>Productos</h3>
                        <ul class="modal-items-list">
                            <li v-for="item in selectedSale.items" :key="item.id" class="modal-item">
                                <span class="item-qty">{{ item.quantity }}x</span>
                                <span class="item-name">{{ item.productName }}</span>
                                <span class="item-total">{{ formatCurrency(item.total) }}</span>
                            </li>
                        </ul>
                    </div>

                    <!-- Financials -->
                    <div class="info-section total-section">
                        <h3>Resumen</h3>
                        <div class="summary-row">
                            <span>Forma de Pago:</span>
                            <div class="payment-badge inline">
                                <component :is="getPaymentIcon(selectedSale.paymentMethod)" size="14" />
                                {{ selectedSale.paymentMethod }}
                            </div>
                        </div>
                        <div class="summary-row total-row">
                            <span>Total</span>
                            <span class="total-big">{{ formatCurrency(selectedSale.total) }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.history-view {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    height: 100%;
    overflow: hidden;
}

.header-section {
    flex-shrink: 0;
}

.page-title {
    font-size: 1.8rem;
    font-weight: 800;
    color: var(--text-main);
    margin-bottom: 1rem;
}

/* Toolbar */
.toolbar-card {
    background: white;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.search-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #f8fafc;
    border: 1px solid var(--border-color);
    padding: 0.6rem 1rem;
    border-radius: var(--radius-md);
    width: 300px;
}

.search-box input {
    border: none;
    background: transparent;
    width: 100%;
    outline: none;
    font-size: 0.95rem;
}

.divider {
    width: 1px;
    height: 24px;
    background: var(--border-color);
}

.filters {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.filter-btn {
    background: white;
    border: 1px solid var(--border-color);
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md);
    color: var(--text-muted);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
}

.filter-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
}

.filter-btn.active {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
}

.inline-picker {
    display: flex;
    align-items: center;
    margin-left: 0.5rem;
}

.date-input {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-main);
    outline: none;
    background-color: white;
    font-size: 0.9rem;
    cursor: pointer;
}

.date-input:focus {
    border-color: var(--color-primary);
}

.animate-fade-in {
    animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Table */
.table-container {
    background: white;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    overflow: auto;
    flex: 1;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
}

.data-table th {
    text-align: left;
    padding: 1rem;
    background: #f8fafc;
    color: var(--text-muted);
    font-weight: 600;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    position: sticky;
    top: 0;
}

.data-table td {
    padding: 1rem;
    border-bottom: 1px solid #f1f5f9;
    color: var(--text-main);
    font-size: 0.95rem;
}

.id-cell {
    font-family: monospace;
    font-weight: 700;
    color: #64748b;
}

.customer-info {
    font-weight: 600;
}
.customer-info.no-name {
    color: var(--text-muted);
    font-style: italic;
    font-weight: 400;
}

.time-badge {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: #f1f5f9;
    padding: 2px 8px;
    border-radius: 4px;
    width: fit-content;
    font-size: 0.85rem;
    color: #64748b;
}

.payment-badge {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--text-muted);
    font-weight: 500;
}

.payment-badge.inline {
    background: #f1f5f9;
    padding: 4px 8px;
    border-radius: 4px;
}

.amount-cell {
    font-weight: 700;
    color: var(--text-main);
}

.action-btn {
    padding: 0.4rem;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    transition: color 0.2s;
}

.action-btn:hover {
    color: var(--color-primary);
}

.loading-cell, .empty-cell {
    text-align: center;
    padding: 3rem;
    color: var(--text-muted);
}

.animate-spin {
    animation: spin 1s linear infinite;
    margin-right: 0.5rem;
}

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Modal */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
}

.modal-card {
    background: white;
    width: 100%;
    max-width: 500px;
    border-radius: 20px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    position: relative;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
}

.modal-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
}

.modal-header {
    padding: 2rem;
    background: #f8fafc;
    border-bottom: 1px solid var(--border-color);
}

.header-main h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text-main);
}

.time-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
    color: var(--color-primary);
    font-weight: 600;
}

.date-sub {
    color: var(--text-muted);
    font-weight: 400;
    padding-left: 0.5rem;
    border-left: 1px solid #cbd5e1;
}

.modal-body {
    padding: 2rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.info-section h3 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
    margin-bottom: 1rem;
}

.info-grid {
    display: grid;
    gap: 0.75rem;
}

.info-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--text-main);
}

.modal-items-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.modal-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 1rem;
    border-bottom: 1px dashed #e2e8f0;
}

.modal-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
}

.item-qty {
    font-weight: 700;
    color: var(--color-primary);
    width: 40px;
}

.item-name {
    flex: 1;
    color: var(--text-main);
    font-weight: 500;
}

.item-total {
    font-weight: 600;
}

.total-section {
    background: #f8fafc;
    margin: 0 -2rem -2rem;
    padding: 2rem;
    border-top: 1px solid var(--border-color);
}

.summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    color: var(--text-muted);
}

.total-row {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px dashed #cbd5e1;
    color: var(--text-main);
    font-weight: 700;
    font-size: 1.2rem;
}

.total-big {
    font-size: 1.5rem;
    color: var(--color-primary);
}
</style>
