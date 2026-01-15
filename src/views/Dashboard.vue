<script setup>
import { ref, onMounted } from 'vue';
import { authFetch } from '../utils/authFetch';
import { 
    DollarSign, 
    ShoppingBag, 
    Target, 
    Wallet, 
    Calendar,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-vue-next';

// State
const loading = ref(true);
const stats = ref({
    summary: { totalSales: 0, totalOrders: 0, goal: 5500, totalCXC: 0 },
    comparison: { current: 0, previous: 0, diff: 0 },
    topProducts: [],
    topCustomers: [],
    topDebtors: []
});

// Filters
const filterMode = ref('today'); // today, specific, range
const selectedDate = ref(new Date().toISOString().split('T')[0]);
const dateRange = ref({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
});

// Fetch Data
const fetchDashboardData = async () => {
    loading.value = true;
    try {
        const params = new URLSearchParams();
        
        let from, to;
        const now = new Date();

        if (filterMode.value === 'today') {
            from = now.toISOString().split('T')[0];
            to = now.toISOString().split('T')[0];
        } else if (filterMode.value === 'specific') {
            from = selectedDate.value;
            to = selectedDate.value;
        } else if (filterMode.value === 'range') {
            from = dateRange.value.from;
            to = dateRange.value.to;
        }

        params.append('from', from);
        params.append('to', to);

        // Replace the single fetch with multiple fetches using Promise.all
        const [summaryRes, comparisonRes, topProductsRes, topCustomersRes, weeklyStatsRes, topDebtorsRes] = await Promise.all([
            authFetch(`/api/dashboard/summary?${params}`).then(r => r.json()),
            authFetch(`/api/dashboard/comparison?${params}`).then(r => r.json()),
            authFetch(`/api/dashboard/top-products?${params}`).then(r => r.json()),
            authFetch(`/api/dashboard/top-customers?${params}`).then(r => r.json()),
            authFetch(`/api/dashboard/weekly-stats?${params}`).then(r => r.json()),
            authFetch(`/api/dashboard/top-debtors?${params}`).then(r => r.json()).catch(() => [])
        ]);

        // Update the stats ref with the results from multiple fetches
        stats.value = {
            summary: summaryRes,
            comparison: comparisonRes,
            topProducts: topProductsRes,
            topCustomers: topCustomersRes,
            weeklyStats: weeklyStatsRes,
            topDebtors: topDebtorsRes
        };

    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

onMounted(fetchDashboardData);

// Actions
const setMode = (mode) => {
    filterMode.value = mode;
    if (mode === 'today') fetchDashboardData();
};

const handleDateChange = () => fetchDashboardData();

// Formatters
const formatCurrency = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
</script>

<template>
  <div class="dashboard">
    <!-- Header With Filters -->
    <div class="header-section animate-fade-in">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Resumen general de tu negocio</p>
      </div>

      <!-- Filters Toolbox -->
      <div class="filters-toolbox">
          <button 
            class="filter-btn" 
            :class="{ active: filterMode === 'today' }"
            @click="setMode('today')"
          >
            Hoy
          </button>
          
          <div class="filter-group">
            <button 
                class="filter-btn" 
                :class="{ active: filterMode === 'specific' }"
                @click="setMode('specific')"
            >
                Día
            </button>
            <input 
                v-if="filterMode === 'specific'"
                type="date" 
                v-model="selectedDate" 
                class="inline-input animate-slide-right"
                @change="handleDateChange"
            />
          </div>

          <div class="filter-group">
            <button 
                class="filter-btn" 
                :class="{ active: filterMode === 'range' }"
                @click="setMode('range')"
            >
                Rango
            </button>
            <div v-if="filterMode === 'range'" class="range-inputs animate-slide-right">
                <input type="date" v-model="dateRange.from" class="inline-input" @change="handleDateChange">
                <span class="separator">-</span>
                <input type="date" v-model="dateRange.to" class="inline-input" @change="handleDateChange">
            </div>
          </div>
      </div>
    </div>

    <!-- Stats 4-Grid -->
    <div class="stats-grid">
      <!-- 1. Total Sales -->
      <div class="stat-card primary-card">
        <div class="icon-box"><DollarSign size="24" /></div>
        <div class="stat-content">
            <span class="stat-label">Ventas Totales</span>
            <span class="stat-value">{{ formatCurrency(stats.summary.totalSales) }}</span>
        </div>
      </div>

      <!-- 2. Total Orders -->
      <div class="stat-card info-card">
        <div class="icon-box"><ShoppingBag size="24" /></div>
        <div class="stat-content">
            <span class="stat-label">Órdenes</span>
            <span class="stat-value">{{ stats.summary.totalOrders }}</span>
        </div>
      </div>

      <!-- 3. Daily Goal -->
      <div class="stat-card success-card">
        <div class="icon-box"><Target size="24" /></div>
        <div class="stat-content">
            <span class="stat-label">Meta Diaria</span>
            <span class="stat-value">{{ formatCurrency(stats.summary.goal) }}</span>
            <div class="progress-bar">
                <div 
                    class="progress-fill" 
                    :style="{ width: Math.min((stats.summary.totalSales / stats.summary.goal) * 100, 100) + '%' }"
                ></div>
            </div>
            <span class="progress-text">
                {{ Math.round((stats.summary.totalSales / stats.summary.goal) * 100) }}% completado
            </span>
        </div>
      </div>

      <!-- 4. CXC (Pending Debt) -->
      <div class="stat-card warning-card">
        <div class="icon-box"><Wallet size="24" /></div>
        <div class="stat-content">
            <span class="stat-label">CXC</span>
            <span class="stat-value">{{ formatCurrency(stats.summary.totalCXC) }}</span>
            <span class="stat-sub">Del día</span>
        </div>
      </div>
    </div>

    <!-- Main Content Split -->
    <div class="content-split">
        
        <!-- ROW 1: 3-Column Layout -->
        <div class="row-split-3">
            
            <!-- 1. Top Clientes (Pie Chart) -->
            <div class="card graph-card">
                <h3 class="card-title">Top Clientes Frecuentes</h3>
                <div class="pie-container" v-if="stats.topCustomers.length > 0">
                    <div class="css-pie" :style="{
                        background: `conic-gradient(
                            #4F46E5 0% ${stats.topCustomers[0]?.percentage || 0}%, 
                            #10B981 0% ${Number(stats.topCustomers[0]?.percentage || 0) + Number(stats.topCustomers[1]?.percentage || 0)}%,
                            #F59E0B 0% 100%
                        )`
                    }"></div>
                    <div class="legend">
                        <div v-for="(customer, idx) in stats.topCustomers.slice(0, 3)" :key="idx" class="legend-item">
                            <span class="dot" :class="['dot-' + idx]"></span>
                            <span class="name">{{ customer.name }}</span>
                            <span class="percent">{{ customer.count }} visitas</span>
                        </div>
                    </div>
                </div>
                <div v-else class="empty-state">Sin datos de clientes</div>
            </div>

            <!-- 2. Top Debtors (CXC) -->
            <div class="card compare-card">
                <h3 class="card-title">Top Deudores (CXC)</h3>
                <div class="table-container">
                    <table class="simple-table">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th style="text-align: right;">Adeudo</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(debtor, i) in stats.topDebtors" :key="i">
                                <td class="font-bold" style="color: var(--text-main);">{{ debtor.name }}</td>
                                <td style="text-align: right; color: #DC2626; font-weight: 700;">
                                    {{ formatCurrency(Number(debtor.totalDebt)) }}
                                </td>
                            </tr>
                            <tr v-if="!stats.topDebtors || stats.topDebtors.length === 0" class="muted-row">
                                <td colspan="2" style="text-align: center; padding: 2rem;">Todo al corriente</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- 3. Top Selling Products -->
            <div class="card full-width">
                <h3 class="card-title">Más Vendidos</h3>
                <div class="products-list small-list">
                    <div v-for="item in stats.topProducts.slice(0, 5)" :key="item.name" class="product-row">
                        <div class="prod-name">
                            <div class="prod-icon">{{ item.name.charAt(0) }}</div>
                            <span class="truncate-text">{{ item.name }}</span>
                        </div>
                        <span class="text-right font-bold text-primary">{{ item.count }}</span>
                    </div>
                    <div v-if="stats.topProducts.length === 0" class="empty-row">Sin datos</div>
                </div>
            </div>

        </div>

        <!-- Monthly Goal Card -->
        <div class="card full-width monthly-goal-card" v-if="stats.summary.monthlyStats">
             <div class="card-header-row">
                <div class="flex items-center gap-2">
                    <div class="icon-box-sm"><Target size="18" /></div>
                    <h3 class="card-title mb-0">Meta Mensual - {{ stats.summary.monthlyStats.monthName }}</h3>
                </div>
                <span class="goal-badges">{{ formatCurrency(stats.summary.monthlyStats.current) }} / {{ formatCurrency(stats.summary.monthlyStats.goal) }}</span>
            </div>
            <div class="progress-bar big-bar">
                <div 
                    class="progress-fill" 
                    :style="{ width: Math.min((stats.summary.monthlyStats.current / stats.summary.monthlyStats.goal) * 100, 100) + '%' }"
                ></div>
            </div>
            <p class="goal-subtitle">
                Has alcanzado el <strong>{{ Math.round((stats.summary.monthlyStats.current / stats.summary.monthlyStats.goal) * 100) }}%</strong> de tu meta mensual.
            </p>
        </div>

    </div>
  </div>
</template>

<style scoped>
.dashboard {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding-bottom: 2rem;
}

/* Header & Filters */
.header-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 1rem;
}

.page-title {
    font-size: 1.8rem;
    font-weight: 800;
    color: var(--text-main);
    margin-bottom: 0.25rem;
}

.page-subtitle {
    color: var(--text-muted);
}

.filters-toolbox {
    display: flex;
    gap: 0.75rem;
    background: white;
    padding: 0.5rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
}

.filter-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.filter-btn {
    background: transparent;
    border: 1px solid transparent;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md);
    color: var(--text-muted);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.filter-btn:hover {
    color: var(--color-primary);
    background: var(--bg-app);
}

.filter-btn.active {
    background: var(--color-primary);
    color: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.inline-input {
    border: 1px solid var(--border-color);
    padding: 0.45rem;
    border-radius: var(--radius-md);
    font-family: inherit;
    color: var(--text-main);
    outline: none;
    font-size: 0.9rem;
}

.inline-input:focus { border-color: var(--color-primary); }

.range-inputs { display: flex; align-items: center; gap: 0.5rem; }
.separator { color: var(--text-muted); font-weight: bold; }

/* Stats Grid */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.5rem;
}

.stat-card {
    background: white;
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1.25rem;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
    position: relative;
    overflow: hidden;
}

.icon-box {
    width: 50px;
    height: 50px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
}

.primary-card .icon-box { background: #EEF2FF; color: #4F46E5; }
.info-card .icon-box { background: #E0F2FE; color: #0284C7; }
.success-card .icon-box { background: #ECFDF5; color: #10B981; }
.warning-card .icon-box { background: #FFFBEB; color: #F59E0B; }

.stat-content {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.stat-label { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
.stat-value { font-size: 1.6rem; font-weight: 800; color: var(--text-main); margin-top: 0.25rem; }
.stat-sub { font-size: 0.8rem; color: var(--text-muted); }

/* Progress Bar for Goal */
.progress-bar {
    height: 6px;
    background: #E2E8F0;
    border-radius: 3px;
    margin-top: 0.75rem;
    overflow: hidden;
}
.progress-fill {
    height: 100%;
    background: #10B981;
    border-radius: 3px;
    transition: width 1s ease-out;
}
.progress-text { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; }

/* Content Split */
.content-split {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

/* 3-Column Layout */
.row-split-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1.5rem;
}

@media (max-width: 1024px) {
    .row-split-3 {
        grid-template-columns: 1fr;
    }
}

.card {
    background: white;
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
    height: 100%; /* Match height */
}

.card-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-main);
    margin-bottom: 1.25rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
}

/* Pie Chart */
.pie-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 0;
}

.css-pie {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    position: relative;
}

.css-pie::after {
    content: "";
    position: absolute;
    inset: 25px;
    background: white;
    border-radius: 50%;
}

.legend { display: flex; flex-direction: column; gap: 0.5rem; width: 100%; }
.legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot-0 { background: #4F46E5; }
.dot-1 { background: #10B981; }
.dot-2 { background: #F59E0B; }
.percent { font-weight: 600; margin-left: auto; color: var(--text-main); }

/* Comparison Table */
.simple-table { width: 100%; border-collapse: collapse; }
.simple-table th { text-align: left; color: var(--text-muted); font-size: 0.8rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color); }
.simple-table td { padding: 1rem 0.25rem; font-size: 0.95rem; color: var(--text-main); }
.simple-table tr:not(:last-child) td { border-bottom: 1px dashed var(--border-color); }
.muted-row td { color: var(--text-muted); }

.badge { 
    display: inline-flex; 
    align-items: center; 
    gap: 0.25rem; 
    padding: 0.25rem 0.5rem; 
    border-radius: 4px; 
    font-weight: 600; 
    font-size: 0.85rem; 
}
.badge-up { background: #DCFCE7; color: #166534; }
.badge-down { background: #FEE2E2; color: #991B1B; }
.change-cell { text-align: right; vertical-align: middle; }

/* Products List */
.products-list { display: flex; flex-direction: column; gap: 0.5rem; }
.product-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid #f1f5f9; }
.product-row:last-child { border-bottom: none; }
.prod-name { display: flex; align-items: center; gap: 0.75rem; font-weight: 500; font-size: 0.9rem; overflow: hidden; }
.truncate-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
.prod-icon { width: 28px; height: 28px; background: #EEF2FF; color: #4F46E5; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; flex-shrink: 0; }
.empty-row { padding: 2rem; text-align: center; color: var(--text-muted); font-style: italic; }

.animate-fade-in { animation: fadeIn 0.4s ease-out; }
.animate-slide-right { animation: slideRight 0.3s ease-out; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideRight { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }

/* Mobile Responsiveness */
@media (max-width: 768px) {
    .header-section {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
    }

    .filters-toolbox {
        width: 100%; /* Full width card */
        flex-wrap: wrap; /* Allow buttons/inputs to flow */
        gap: 0.5rem;
    }

    /* Make filter groups wrap their content (Button + Input) */
    .filter-group {
        flex-wrap: wrap;
    }

    /* Force inputs to break to new line and take full width */
    .filter-group .inline-input,
    .filter-group .range-inputs {
        width: 100%;
        margin-top: 0.5rem;
        order: 2; /* Ensure input stays below button */
    }
    
    /* Improve range inputs layout on mobile */
    .range-inputs {
        display: flex;
        justify-content: space-between;
    }
    
    .range-inputs .inline-input {
        width: 48%; /* Split width for From-To */
        margin-top: 0;
    }
    
    /* Ensure only the active filter group expands, others stay compact */
    .filter-group:has(.inline-input), 
    .filter-group:has(.range-inputs) {
        width: 100%; /* Active group takes full row to give space for input */
    }
}

/* Monthly Goal Card specific styles */
.monthly-goal-card {
    background: linear-gradient(to right, #ffffff, #f8fafc);
    /* border removed to match other cards */
}

.card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.icon-box-sm {
    width: 32px;
    height: 32px;
    background: #ECFDF5;
    color: #10B981;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.mb-0 { margin-bottom: 0 !important; }

.goal-badges {
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--text-main);
}

.big-bar {
    height: 12px;
    background: #e2e8f0;
}

.goal-subtitle {
    margin-top: 1rem;
    color: var(--text-muted);
    font-size: 0.95rem;
}
</style>
