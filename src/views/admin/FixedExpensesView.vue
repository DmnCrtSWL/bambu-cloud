<script setup>
import { ref, computed, onMounted } from 'vue';
import { authFetch } from '../../utils/authFetch';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-vue-next';


// Data Fetching
const expenses = ref([]);
const loading = ref(true);

// Filters state
const filterType = ref('range_select'); // 'today', 'range_select', 'specific'
const selectedRange = ref('this_month');
const dateRange = ref({
    single: new Date().toISOString().split('T')[0]
});

const calculateDateRange = (range) => {
    const end = new Date();
    let start = new Date();

    if (range === 'this_month') {
        start.setDate(1);
    } else if (range === 'this_week') {
        const day = start.getDay() || 7;
        if (day !== 1) start.setHours(-24 * (day - 1));
    } else if (range === 'last_30_days') {
        start.setDate(end.getDate() - 30);
    } else if (range === 'last_month') {
        start.setMonth(end.getMonth() - 1);
        start.setDate(1);
        const lastDay = new Date(end.getFullYear(), end.getMonth(), 0);
        return { 
            from: start.toISOString().split('T')[0], 
            to: lastDay.toISOString().split('T')[0] 
        };
    } else if (range === 'last_3_months') {
        start.setMonth(end.getMonth() - 3);
        start.setDate(1); 
    } else if (range === 'this_year') {
        start.setMonth(0, 1);
    }

    return {
        from: start.toISOString().split('T')[0],
        to: end.toISOString().split('T')[0]
    };
};

const fetchExpenses = async () => {
    loading.value = true;
    try {
        const params = new URLSearchParams();
        
        if (filterType.value === 'today') {
            params.append('today', 'true');
        } else if (filterType.value === 'specific') {
            params.append('from', dateRange.value.single);
            params.append('to', dateRange.value.single);
        } else if (filterType.value === 'range_select') {
            const { from, to } = calculateDateRange(selectedRange.value);
            params.append('from', from);
            params.append('to', to);
        }

        const res = await authFetch(`/api/fixed-expenses?${params}`);

        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
    
        expenses.value = data.map(e => ({
            id: e.id,
            concept: e.concept,
            amount: Number(e.amount),
            paidTo: e.paidTo,
            paymentMethod: e.paymentMethod,
            frequency: e.frequency,
            date: new Date(e.expenseDate)
        }));
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

onMounted(fetchExpenses);

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

const totalPages = computed(() => Math.ceil(expenses.value.length / itemsPerPage));

const paginatedExpenses = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return expenses.value.slice(start, end);
});

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

const deleteExpense = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este gasto?')) return;
    
    try {
        const res = await authFetch(`/api/fixed-expenses/${id}`, {
            method: 'DELETE'
        });

        
        if (!res.ok) throw new Error('Failed to delete');
        
        expenses.value = expenses.value.filter(e => e.id !== id);
        alert('Gasto eliminado correctamente');
    } catch (error) {
        console.error(error);
        alert('Error al eliminar el gasto');
    }
};
</script>

<template>
  <div class="expenses-view">
    <div class="header">
      <div>
        <h1 class="page-title">Gastos</h1>
        <p class="page-subtitle">Administra tus gastos recurrentes y fijos.</p>
      </div>
      <button class="primary-btn" @click="$router.push('/admin/fixed-expenses/new')">
        <Plus size="20" />
        <span>Nuevo Gasto</span>
      </button>
    </div>

    <!-- Filters Toolbar -->
    <div class="filters-container animate-fade-in">
      <div class="quick-filters">
          <button 
            class="filter-btn" 
            :class="{ active: filterType === 'today' }"
            @click="filterType = 'today'; fetchExpenses()"
          >
            Hoy
          </button>

          <button 
            class="filter-btn" 
            :class="{ active: filterType === 'range_select' }"
            @click="filterType = 'range_select'; fetchExpenses()"
          >
            Todos
          </button>

          <button 
            class="filter-btn" 
            :class="{ active: filterType === 'specific' }"
            @click="filterType = 'specific'; fetchExpenses()"
          >
            Día
          </button>

          <div v-if="filterType === 'range_select'" class="date-group animate-fade-in inline-picker">
            <span class="range-label">Datos de:</span>
            <select v-model="selectedRange" class="range-select" @change="fetchExpenses">
              <option value="this_month">Este Mes</option>
              <option value="this_week">Esta Semana</option>
              <option value="last_30_days">Últimos 30 días</option>
              <option value="last_month">Último Mes</option>
              <option value="last_3_months">Últimos 3 Meses</option>
              <option value="this_year">Este año</option>
            </select>
          </div>

          <div v-if="filterType === 'specific'" class="date-group animate-fade-in inline-picker">
            <input type="date" v-model="dateRange.single" class="date-input" @change="fetchExpenses" />
          </div>
      </div>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Concepto</th>
            <th>Fecha</th>
            <th>Monto</th>
            <th>Pagado A</th>
            <th>Forma de Pago</th>
            <th>Frecuencia</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="expense in paginatedExpenses" :key="expense.id">
            <td class="font-medium text-primary">{{ expense.concept }}</td>
            <td class="capitalize">{{ formatDate(expense.date) }}</td>
            <td class="font-bold">{{ formatCurrency(expense.amount) }}</td>
            <td>{{ expense.paidTo }}</td>
            <td>
              <span class="badge">{{ expense.paymentMethod }}</span>
            </td>
            <td>
              <span class="frequency-pill">{{ expense.frequency }}</span>
            </td>
            <td class="actions-cell">
              <div class="action-buttons">
                <button 
                  class="action-btn" 
                  title="Editar"
                  @click="$router.push(`/admin/fixed-expenses/${expense.id}/edit`)"
                >
                  <Edit size="18" />
                </button>
                <button 
                  class="action-btn delete" 
                  title="Eliminar"
                  @click="deleteExpense(expense.id)"
                >
                  <Trash2 size="18" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && expenses.length === 0">
            <td colspan="7" class="text-center empty-state">No hay gastos fijos registrados.</td>
          </tr>
          <tr v-if="loading">
            <td colspan="7" class="text-center loading-state">Cargando gastos...</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination" v-if="expenses.length > 0">
      <span class="page-info">
        Mostrando {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, expenses.length) }} de {{ expenses.length }}
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

.text-right { text-align: right; }
.text-center { text-align: center; }
.font-medium { font-weight: 500; }
.font-bold { font-weight: 700; }
.text-primary { color: var(--color-primary); }
.capitalize { text-transform: capitalize; }

.badge {
  background-color: var(--bg-app);
  color: var(--text-main);
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  border: 1px solid var(--border-color);
}

.frequency-pill {
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  background-color: #E3F2FD;
  color: #1976D2;
}

.actions-cell {
  width: 100px;
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
  cursor: pointer;
}

.action-btn:hover {
  background-color: var(--bg-app);
  color: var(--color-primary);
}

.action-btn.delete:hover {
  background-color: #FFEBEE;
  color: #D32F2F;
}

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

.page-btn:not(:disabled):hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.current-page {
  font-weight: 600;
  min-width: 2rem;
  text-align: center;
}

.empty-state, .loading-state {
    padding: 3rem !important;
    color: var(--text-muted);
}

/* Filters Styles */
.filters-container {
    margin-bottom: 1.5rem;
    background: white;
    padding: 1rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
}

.quick-filters {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
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
    background-color: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
}

.inline-picker {
    display: flex;
    align-items: center;
    margin-left: 0.5rem;
}

.range-label {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-right: 0.5rem;
}

.range-select, .date-input {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-main);
    outline: none;
    background-color: white;
    font-size: 0.9rem;
    cursor: pointer;
}

.range-select:focus, .date-input:focus {
    border-color: var(--color-primary);
}

.animate-fade-in {
    animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
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
