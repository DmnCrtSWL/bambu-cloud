<script setup>
import { ref, computed, onMounted } from 'vue';
import { authFetch } from '../../utils/authFetch';
import { Plus, List, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-vue-next';


// Data Fetching
const purchases = ref([]);
const loading = ref(true);

// Filters state
const filterType = ref('today'); // 'today', 'undissected', 'specific', 'range_select'
const selectedRange = ref('this_month');
const dateRange = ref({
    single: new Date().toISOString().split('T')[0]
});

const calculateDateRange = (range) => {
    const end = new Date(); // To date is always "now" except for fixed past ranges like "last month"
    let start = new Date();

    if (range === 'this_month') {
        start.setDate(1); // 1st of current month
    } else if (range === 'last_30_days') {
        start.setDate(end.getDate() - 30);
    } else if (range === 'this_year') {
        start.setMonth(0, 1);
    }

    return {
        from: start.toISOString().split('T')[0],
        to: end.toISOString().split('T')[0]
    };
};

const fetchPurchases = async () => {
    loading.value = true;
    currentPage.value = 1; // Reset to page 1 on filter change
    try {
        let url = '/api/tickets';
        const params = new URLSearchParams();
        
        if (filterType.value === 'today') {
            // Calculate Client's Local "Today" to avoid Server UTC mismatch
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;
            
            params.append('from', todayStr);
            params.append('to', todayStr);
        } else if (filterType.value === 'undissected') {
            params.append('undissected', 'true');
        } else if (filterType.value === 'specific') {
            if (dateRange.value.single && dateRange.value.single.length === 10) {
                const [d, m, y] = dateRange.value.single.split('/');
                const isoDate = `${y}-${m}-${d}`;
                params.append('from', isoDate);
                params.append('to', isoDate);
            }
        } else if (filterType.value === 'range_select') {
            const { from, to } = calculateDateRange(selectedRange.value);
            params.append('from', from);
            params.append('to', to);
        }
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const res = await authFetch(url);

        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
    
        // Transform data
        purchases.value = data.map(t => {
            // Use purchaseDate if available, but parse as local to avoid offset shifts
            const dateStr = t.purchaseDate || t.createdAt;
            const dateObj = new Date(dateStr);
            
            // If it's a date-only string from DB (no time), or we want to avoid offset:
            // many formats like "2025-12-24T00:00:00.000Z" shift when parsed locally.
            // For display purposes in a kitchen ERP, we usually want the literal date stored.
            
            return {
                id: t.id,
                ticketRef: t.ticketRef,
                provider: t.provider,
                date: dateObj,
                total: Number(t.total),
                paymentMethod: t.paymentMethod,
                status: t.status
            };
        });
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};



// Helper for Masking
const handleDateFilterInput = (e) => {
    let v = e.target.value.replace(/\D/g, ''); // Digits only
    if (v.length > 8) v = v.slice(0, 8);
    
    if (v.length > 4) {
        dateRange.value.single = `${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4)}`;
    } else if (v.length > 2) {
        dateRange.value.single = `${v.slice(0,2)}/${v.slice(2)}`;
    } else {
        dateRange.value.single = v;
    }
};

onMounted(() => {
    // Initialize specific filter date to customized format if needed, or leave blank to show placeholder
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    dateRange.value.single = `${d}/${m}/${y}`;
    
    fetchPurchases();
});


// ... Rest of component ...

// In fetchPurchases specific section needs update (see next edit)


// Formatter Helpers
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
};

const formatDate = (date) => {
  const d = new Date(date);
  // Manual formatting to ensure dd/mm/yyyy regardless of locale
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Pagination Logic
const itemsPerPage = 10;
const currentPage = ref(1);

const totalPages = computed(() => Math.ceil(purchases.value.length / itemsPerPage));

const paginatedPurchases = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return purchases.value.slice(start, end);
});

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

const deletePurchase = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este ticket?')) return;
    
    try {
        const res = await authFetch(`/api/tickets/${id}`, {
            method: 'DELETE'
        });

        
        if (!res.ok) throw new Error('Failed to delete');
        
        // Remove from list
        purchases.value = purchases.value.filter(p => p.id !== id);
        alert('Ticket eliminado correctamente');
    } catch (error) {
        console.error(error);
        alert('Error al eliminar el ticket');
    }
};
</script>

<template>
  <div class="purchases-view">
    <div class="header">
      <div>
        <h1 class="page-title">Compras</h1>
        <p class="page-subtitle">Gestiona y desglosa tus tickets de compra.</p>
      </div>
      <button class="primary-btn" @click="$router.push('/admin/purchases/new')">
        <Plus size="20" />
        <span>Nuevo Ticket</span>
      </button>
    </div>

    <!-- Filters Toolbar -->
    <div class="toolbar">
      <div class="filter-section">
        <div class="quick-filters">
          <button 
            class="filter-btn" 
            :class="{ active: filterType === 'today' }"
            @click="filterType = 'today'; fetchPurchases()"
          >
            Hoy
          </button>
          
          <button 
            class="filter-btn" 
            :class="{ active: filterType === 'undissected' }"
            @click="filterType = 'undissected'; fetchPurchases()"
          >
            Sin Desglose
          </button>

          <button 
            class="filter-btn" 
            :class="{ active: filterType === 'specific' }"
            @click="filterType = 'specific'; fetchPurchases()"
          >
            Día
          </button>

          <div v-if="filterType === 'specific'" class="date-group animate-fade-in inline-picker">
            <input 
                type="text" 
                v-model="dateRange.single" 
                class="date-input text-filter" 
                placeholder="dd/mm/aaaa"
                maxlength="10"
                @input="handleDateFilterInput"
                @blur="fetchPurchases"
                @keyup.enter="fetchPurchases"
            />
          </div>

          <button 
            class="filter-btn" 
            :class="{ active: filterType === 'range_select' }"
            @click="filterType = 'range_select'; fetchPurchases()"
          >
            Todos
          </button>

          <div v-if="filterType === 'range_select'" class="date-group animate-fade-in inline-picker">
            <span class="range-label">Datos de:</span>
            <select v-model="selectedRange" class="range-select" @change="fetchPurchases">
              <option value="this_month">Este Mes</option>
              <option value="last_30_days">Últimos 30 días</option>
              <option value="this_year">Este año</option>
            </select>
          </div>
        </div>
      </div>
    </div>



    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th># Ticket</th>
            <th>Proveedor</th>
            <th>Fecha de Compra</th>
            <th>Total</th>
            <th>Forma de Pago</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="purchase in paginatedPurchases" :key="purchase.id">
            <td class="font-medium text-primary">{{ purchase.ticketRef }}</td>
            <td>{{ purchase.provider }}</td>
            <td class="capitalize">{{ formatDate(purchase.date) }}</td>
            <td class="font-bold">{{ formatCurrency(purchase.total) }}</td>
            <td>
              <span class="payment-badge">{{ purchase.paymentMethod }}</span>
            </td>
            <td>
              <span 
                class="status-pill" 
                :class="purchase.status === 'Desglosado' ? 'status-success' : 'status-warning'"
              >
                {{ purchase.status }}
              </span>
            </td>
            <td class="actions-cell">
              <div class="action-buttons">
                <button 
                  class="action-btn" 
                  title="Desglosar"
                  @click="$router.push(`/admin/purchases/${purchase.id}/breakdown`)"
                >
                  <List size="18" />
                </button>
                <button 
                  class="action-btn" 
                  title="Editar"
                  @click="$router.push(`/admin/purchases/${purchase.id}/edit`)"
                >
                  <Edit size="18" />
                </button>
                <button 
                  class="action-btn delete" 
                  title="Eliminar"
                  @click="deletePurchase(purchase.id)"
                >
                  <Trash2 size="18" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination">
      <span class="page-info">
        Mostrando {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, purchases.length) }} de {{ purchases.length }}
      </span>
      <div class="pagination-controls">
        <button 
          class="page-btn" 
          :disabled="currentPage === 1"
          @click="prevPage"
        >
          <ChevronLeft size="18" />
        </button>
        <span class="current-page">{{ currentPage }}</span>
        <button 
          class="page-btn" 
          :disabled="currentPage === totalPages"
          @click="nextPage"
        >
          <ChevronRight size="18" />
        </button>
      </div>
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

.primary-btn:hover {
  background-color: var(--color-primary-dark);
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

.search-group {
    position: relative;
    width: 100%;
}

.search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
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

.date-group {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.date-input-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-muted);
    font-size: 0.9rem;
}

.date-input {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-main);
    outline: none;
}

/* Filter Section */
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
    align-items: center; /* Align items vertically */
}

/* Inline Picker Style */
.inline-picker {
    display: flex;
    align-items: center;
    margin-left: 0.5rem; /* Add some space after the button */
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

.range-label {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-right: 0.5rem;
}

.range-select {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-main);
    outline: none;
    background-color: white;
    font-size: 0.9rem;
    cursor: pointer;
}

.range-select:focus {
    border-color: var(--color-primary);
}

.date-input {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-main);
    outline: none;
    background-color: white;
    font-size: 0.9rem;
    width: 100px;
    text-align: center;
}

.date-input:focus {
    border-color: var(--color-primary);
}

.filter-btn.active {
    background-color: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
}

/* Sortable Headers */
.sortable {
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s;
}

.sortable:hover {
    background-color: #f1f3f4;
}

.th-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.justify-end {
    justify-content: flex-end;
}

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

.data-table tr:last-child td {
  border-bottom: none;
}

.data-table tr:hover td {
  background-color: #F8FAFB;
}

/* Utilities inside table */
.text-right { text-align: right; }
.text-center { text-align: center; }
.font-medium { font-weight: 500; }
.font-bold { font-weight: 700; }
.text-primary { color: var(--color-primary); }
.capitalize { text-transform: capitalize; }

/* Badges & Pills */
.payment-badge {
  background-color: var(--bg-app);
  color: var(--text-main);
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  border: 1px solid var(--border-color);
}

.status-pill {
  display: inline-flex;
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.status-success {
  background-color: var(--color-accent); /* Using brand accent (minty) */
  color: var(--color-primary-dark);
}

.status-warning {
  background-color: #FFF3E0;
  color: #E65100;
}

/* Actions */
.actions-cell {
  width: 160px;
}

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
}

.action-btn:hover {
  background-color: var(--bg-app);
  color: var(--color-primary);
}

.action-btn.delete:hover {
  background-color: #FFEBEE;
  color: #D32F2F;
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
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-btn:not(:disabled):hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.current-page {
  font-weight: 600;
  min-width: 2rem;
  text-align: center;
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
