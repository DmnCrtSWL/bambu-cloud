<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { authFetch } from '../../utils/authFetch';
import { 
  Calendar, 
  DollarSign, 
  CreditCard, 
  ChevronRight, 
  Sun, 
  TrendingUp, 
  CalendarDays,
  User,
  FileText,
  Download,
  Settings,
  ShoppingBag,
  X
} from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth';

// State
const auth = useAuthStore();
const selectedDate = ref(new Date().toISOString().split('T')[0]);
const reportData = ref({
  date: '',
  efectivo: 0,
  tarjeta: 0,
  transferencia: 0,
  uber: 0,
  cortesia: 0,
  cxc: 0,
  total: 0
});
const loading = ref(true);

// Advanced Settings State
const showSettingsMenu = ref(false);
const usersList = ref([]);
// Default to current user if not admin, else 'all'
const selectedUser = ref(auth.isAdmin ? 'all' : auth.user?.id);

const cashierName = computed(() => {
    if (selectedUser.value === 'all') return 'Varios / Todos';
    if (selectedUser.value == auth.user?.id) return auth.user?.name;
    const found = usersList.value.find(u => u.id == selectedUser.value);
    return found ? found.name : 'Desconocido';
});

const detailedReport = ref(null);
const filters = ref({
  sales: false,
  courtesy: false,
  expenses: false,
  purchases: false,
  cxcDay: false,
  cxcTotal: false
});

const fetchReport = async () => {
  loading.value = true;
  try {
    const res = await authFetch(`/api/reports/daily?date=${selectedDate.value}&userId=${selectedUser.value}`);
    if (!res.ok) throw new Error('Failed to fetch report');
    reportData.value = await res.json();
    
    // Also fetch detailed if needed (or always to be ready)
    await fetchDetailedReport();
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const fetchUsers = async () => {
  if (!auth.isAdmin) return;
  try {
    // We borrow logic from typical users endpoint. If not exists, we might need to add it, 
    // but typically explicit User management exists.
    // If this fails (404), the list will be empty and that's fine for now/safe.
    const res = await authFetch('/api/users'); 
    if (res.ok) {
       usersList.value = await res.json();
    }
  } catch (e) {
    console.error('Failed to fetch users', e);
  }
};

const fetchDetailedReport = async () => {
  try {
    const res = await authFetch(`/api/reports/detailed?date=${selectedDate.value}&userId=${selectedUser.value}`);
    if (res.ok) {
        detailedReport.value = await res.json();
    }
  } catch (e) {
    console.error('Detailed report error', e);
  }
};

onMounted(() => {
    fetchReport();
    fetchUsers();
});

// Watchers
watch(selectedDate, fetchReport);
watch(selectedUser, fetchDetailedReport); 

const formatCurrency = (val) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(val || 0);
};

const toggleSettings = () => {
    showSettingsMenu.value = !showSettingsMenu.value;
};
</script>

<template>
  <div class="reports-container">
    <div class="header-section">
      <div>
        <h1 class="page-title">Reporte Diario</h1>
        <p class="page-subtitle">Consolidado de ventas y movimientos por fecha.</p>
      </div>
      
      <div class="header-actions relative">
        <div class="date-picker-wrapper">
          <CalendarDays size="18" class="date-icon" />
          <input type="date" v-model="selectedDate" class="date-input" />
        </div>
        
        <div class="settings-wrapper relative" v-if="auth.isAdmin">
            <button class="btn-settings" @click="toggleSettings">
                <Settings size="20" />
            </button>
            
            <!-- Settings Dropdown -->
            <div v-if="showSettingsMenu" class="settings-dropdown">
                <div class="dropdown-header">
                    <h3>Configuración de Reporte</h3>
                    <button class="close-mini" @click="showSettingsMenu=false"><X size="14"/></button>
                </div>
                
                <div class="dropdown-section">
                    <label class="section-label">Usuario</label>
                    <select v-model="selectedUser" class="user-select">
                        <option value="all">Todos los Usuarios</option>
                        <option v-for="u in usersList" :key="u.id" :value="u.id">{{ u.name }}</option>
                    </select>
                </div>

                <div class="dropdown-section checkboxes">
                    <label class="check-item">
                        <input type="checkbox" v-model="filters.sales"> 
                        <span>Venta total del día</span>
                    </label>
                    <label class="check-item">
                        <input type="checkbox" v-model="filters.courtesy"> 
                        <span>Cortesías</span>
                    </label>
                    <label class="check-item">
                        <input type="checkbox" v-model="filters.expenses"> 
                        <span>Gastos</span>
                    </label>
                    <label class="check-item">
                        <input type="checkbox" v-model="filters.purchases"> 
                        <span>Compras</span>
                    </label>
                    <label class="check-item">
                        <input type="checkbox" v-model="filters.cxcDay"> 
                        <span>CXC del Día</span>
                    </label>
                    <label class="check-item">
                        <input type="checkbox" v-model="filters.cxcTotal"> 
                        <span>CXC Acumulado</span>
                    </label>
                </div>
            </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Generando reporte...</p>
    </div>

    <div v-else class="report-content">
      <!-- Main Summary Cards (Always Visible) -->
      <div class="summary-grid">
        <div class="summary-card main">
          <div class="card-icon total"><TrendingUp size="24" /></div>
          <div class="card-info">
            <span class="label">Total General</span>
            <span class="value">{{ formatCurrency(reportData.total) }}</span>
          </div>
        </div>
        
        <div class="summary-card">
          <div class="card-icon cashier"><User size="24" /></div>
          <div class="card-info">
            <span class="label">Cajero en Turno</span>
            <span class="value name">{{ cashierName }}</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="card-icon date"><Calendar size="24" /></div>
          <div class="card-info">
            <span class="label">Fecha Reporte</span>
            <span class="value date-text">{{ selectedDate }}</span>
          </div>
        </div>
      </div>

      <!-- Breakdown Section (Always Visible) -->
      <div class="breakdown-section">
        <h2 class="section-title">
          <FileText size="18" />
          <span>Resumen por Método de Pago</span>
        </h2>
        
        <div class="payment-methods-grid">
          <div class="method-row">
            <div class="method-name">
              <div class="icon-circle efectivo"><DollarSign size="20" /></div>
              <span>Total Efectivo</span>
            </div>
            <div class="method-value">{{ formatCurrency(reportData.efectivo) }}</div>
          </div>

          <div class="method-row">
            <div class="method-name">
              <div class="icon-circle tarjeta"><CreditCard size="20" /></div>
              <span>Total Tarjetas</span>
            </div>
            <div class="method-value">{{ formatCurrency(reportData.tarjeta) }}</div>
          </div>

          <div class="method-row">
            <div class="method-name">
              <div class="icon-circle transferencia"><ChevronRight size="20" /></div>
              <span>Total Transferencias</span>
            </div>
            <div class="method-value">{{ formatCurrency(reportData.transferencia) }}</div>
          </div>

           <div class="method-row">
            <div class="method-name">
              <div class="icon-circle uber"><ShoppingBag size="20" /></div>
              <span>Total Uber Eats</span>
            </div>
            <div class="method-value">{{ formatCurrency(reportData.uber) }}</div>
          </div>

          <div class="method-row total-footer">
            <div class="method-name">
              <span>TOTAL VENTAS REALES</span>
            </div>
            <div class="method-value">{{ formatCurrency(reportData.total) }}</div>
          </div>
          
           <!-- Non-Revenue / Excluded Section -->
           <div class="method-row cxc-row">
            <div class="method-name">
              <div class="icon-circle cortesia"><Sun size="20" /></div>
              <span>Total Cortesías</span>
            </div>
            <div class="method-value">{{ formatCurrency(reportData.cortesia) }}</div>
          </div>

           <div class="method-row cxc-row">
            <div class="method-name">
              <div class="icon-circle cxc"><ChevronRight size="20" /></div>
              <span>Total CXC (Por Cobrar)</span>
            </div>
            <div class="method-value">{{ formatCurrency(reportData.cxc) }}</div>
          </div>
        </div>
      </div>

      <!-- DETAILED REPORTS (Admin Only Conditionals) -->
      <div v-if="detailedReport" class="detailed-reports-container">
          
          <!-- 1. Venta total del día -->
          <div v-if="filters.sales" class="detail-block">
              <div class="detail-header">
                  <h3>Venta Total del Día</h3>
                  <span class="detail-total positive">{{ formatCurrency(detailedReport.sales.total) }}</span>
              </div>
              <div class="detail-list">
                  <div class="list-item" v-for="(amount, method) in detailedReport.sales.methods" :key="method">
                      <span class="item-name capitalize">{{ method }}</span>
                      <span class="item-value">{{ formatCurrency(amount) }}</span>
                  </div>
              </div>
          </div>

          <!-- 2. Cortesías -->
          <div v-if="filters.courtesy" class="detail-block">
              <div class="detail-header">
                  <h3>Cortesías</h3>
                  <span class="detail-total neutral">{{ formatCurrency(detailedReport.sales.courtesies.reduce((a,b)=>a+b.total,0)) }}</span>
              </div>
              <div class="detail-list full-width">
                  <div class="list-head">
                      <span>Hora</span><span>Cliente</span><span>Total</span>
                  </div>
                  <div class="list-item" v-for="c in detailedReport.sales.courtesies" :key="c.id">
                      <span class="item-name">{{ c.time }}</span>
                      <span class="item-name">{{ c.customer }}</span>
                      <span class="item-value">{{ formatCurrency(c.total) }}</span>
                  </div>
                  <div v-if="detailedReport.sales.courtesies.length === 0" class="empty-msg">No hay cortesías</div>
              </div>
          </div>

          <!-- 3. Gastos -->
          <div v-if="filters.expenses" class="detail-block">
              <div class="detail-header">
                  <h3>Gastos Operativos</h3>
                  <span class="detail-total negative">{{ formatCurrency(detailedReport.expenses.total) }}</span>
              </div>
               <div class="detail-list full-width">
                   <div class="list-head">
                      <span>Concepto</span><span>Total</span>
                  </div>
                  <div class="list-item" v-for="e in detailedReport.expenses.list" :key="e.id">
                      <span class="item-name">{{ e.concept }}</span>
                      <span class="item-value">{{ formatCurrency(e.amount) }}</span>
                  </div>
                  <div v-if="detailedReport.expenses.list.length === 0" class="empty-msg">No hay gastos registrados</div>
              </div>
          </div>

          <!-- 4. Compras -->
          <div v-if="filters.purchases" class="detail-block">
              <div class="detail-header">
                  <h3>Compras (Insumos)</h3>
                  <span class="detail-total negative">{{ formatCurrency(detailedReport.purchases.total) }}</span>
              </div>
              <div class="detail-list full-width">
                   <div class="list-head">
                      <span>Prov.</span><span>Referencia</span><span>Total</span>
                  </div>
                  <div class="list-item" v-for="p in detailedReport.purchases.list" :key="p.id">
                      <span class="item-name">{{ p.provider }}</span>
                      <span class="item-name small">{{ p.ref }}</span>
                      <span class="item-value">{{ formatCurrency(p.total) }}</span>
                  </div>
                  <div v-if="detailedReport.purchases.list.length === 0" class="empty-msg">No hay compras registradas</div>
              </div>
          </div>

          <!-- 5. CXC del Día -->
          <div v-if="filters.cxcDay" class="detail-block">
              <div class="detail-header">
                  <h3>CXC Generado Hoy</h3>
                  <span class="detail-total warning">{{ formatCurrency(detailedReport.cxcDay.total) }}</span>
              </div>
               <div class="detail-list full-width">
                   <div class="list-head">
                      <span>Cliente</span><span>Estado</span><span>Monto</span>
                  </div>
                  <div class="list-item" v-for="c in detailedReport.cxcDay.list" :key="c.id">
                      <span class="item-name">{{ c.customer }}</span>
                      <span class="item-name tag" :class="c.status.toLowerCase()">{{ c.status === 'Pending' ? 'Pendiente' : 'Pagado' }}</span>
                      <span class="item-value">{{ formatCurrency(c.amount) }}</span>
                  </div>
                  <div v-if="detailedReport.cxcDay.list.length === 0" class="empty-msg">No hay CXC hoy</div>
              </div>
          </div>

          <!-- 6. CXC Total -->
           <div v-if="filters.cxcTotal" class="detail-block simple">
              <div class="detail-header">
                  <h3>CXC Total Acumulado</h3>
                  <span class="detail-total warning big">{{ formatCurrency(detailedReport.cxcTotalPending) }}</span>
              </div>
              <p class="detail-note">Total pendiente de cobro {{ selectedUser !== 'all' ? 'generado por este usuario' : 'en sistema' }}.</p>
          </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
.reports-container {
  max-width: 1000px;
  margin: 0 auto;
  padding-bottom: 4rem;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 2rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.relative { position: relative; }

.date-picker-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.date-icon {
  position: absolute;
  left: 1rem;
  color: var(--color-primary);
  pointer-events: none;
}

.date-input {
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-weight: 600;
  color: var(--text-main);
  background: white;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}

.date-input:focus {
  border-color: var(--color-primary);
}

/* Settings Button & Dropdown */
.btn-settings {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-settings:hover {
  background: var(--color-primary-dark);
  /* No rotation as requested */
}

.settings-dropdown {
    position: absolute;
    top: 110%;
    right: 0;
    width: 280px;
    background: white;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 50;
    padding: 1rem;
    animation: fadeIn 0.2s ease-out;
}

.dropdown-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color);
}
.dropdown-header h3 { font-size: 0.9rem; font-weight: 700; color: var(--text-main); margin: 0; }
.close-mini { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 2px; }

.dropdown-section { margin-bottom: 1rem; }
.section-label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.25rem; }
.user-select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
}

.checkboxes { display: flex; flex-direction: column; gap: 0.5rem; }
.check-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; cursor: pointer; user-select: none; }
.check-item input { accent-color: var(--color-primary); }

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Existing Summary Styles */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.summary-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.summary-card.main {
  background: var(--bg-app);
  border-color: var(--color-primary);
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.card-icon.total { background: var(--color-primary); }
.card-icon.cashier { background: #8B5CF6; }
.card-icon.date { background: #F59E0B; }

.card-info {
  display: flex;
  flex-direction: column;
}

.card-info .label {
  font-size: 0.875rem;
  color: var(--text-muted);
  font-weight: 500;
}

.card-info .value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.2;
}

.card-info .value.name { font-size: 1.1rem; }
.card-info .value.date-text { font-size: 1.1rem; }

/* Existing Breakdown Styles */
.breakdown-section {
  background: white;
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.1rem;
  color: var(--text-main);
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.payment-methods-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.method-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  background: var(--bg-app);
}

.method-name {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
  color: var(--text-main);
}

.method-value {
  font-weight: 600;
  font-size: 1.1rem;
}

.icon-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.icon-circle.efectivo { background: #10B981; }
.icon-circle.tarjeta { background: #3B82F6; }
.icon-circle.transferencia { background: #8B5CF6; }
.icon-circle.uber { background: #06C167; }
.icon-circle.cortesia { background: #F59E0B; }
.icon-circle.cxc { background: #EF4444; }

.total-footer {
  background: var(--text-main);
  color: white;
  margin-top: 0.5rem;
}

.total-footer .method-name { color: white; }
.cxc-row { background: white; border: 1px dashed var(--border-color); }

/* Detailed Reports Styles */
.detailed-reports-container {
    margin-top: 2rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    animation: fadeIn 0.3s ease-out;
}

.detail-block {
    background: white;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
}

.detail-header {
    padding: 1rem;
    background: #f8fafc;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.detail-header h3 { margin: 0; font-size: 1rem; color: var(--text-main); }
.detail-total { font-weight: 700; font-size: 1.1rem; }
.detail-total.positive { color: var(--color-primary); }
.detail-total.negative { color: #EF4444; }
.detail-total.neutral { color: #F59E0B; }
.detail-total.warning { color: #F97316; }

.detail-list { padding: 0.5rem; max-height: 200px; overflow-y: auto; }
.detail-list.full-width { padding: 0; }

.list-head, .list-item { 
    display: flex; 
    justify-content: space-between; 
    padding: 0.5rem 1rem; 
    border-bottom: 1px solid #f1f5f9; 
    font-size: 0.9rem;
}
.list-head { background: #f8fafc; color: var(--text-muted); font-weight: 600; font-size: 0.8rem; }
.list-item:last-child { border-bottom: none; }
.item-name { color: var(--text-main); }
.item-name.small { font-size: 0.8rem; color: var(--text-muted); }
.item-name.tag { font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; }
.item-name.tag.pending { background: #ffedd5; color: #c2410c; }
.item-name.tag.paid { background: #dcfce7; color: #166534; }
.item-value { font-weight: 600; }
.capitalize { text-transform: capitalize; }
.empty-msg { padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.9rem; font-style: italic; }

.detail-block.simple { text-align: center; padding: 2rem; }
.detail-note { font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem; }
.detail-total.big { font-size: 2rem; }

@media (max-width: 768px) {
  .header-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .header-actions {
    width: 100%;
    flex-direction: column-reverse; /* Button first (bottom of HTML), then Date */
    align-items: stretch;
    gap: 1rem;
  }

  .date-picker-wrapper {
    width: 100%;
  }
  
  .date-input {
    width: 100%;
    padding: 0.8rem 1rem 0.8rem 2.75rem; /* Taller */
    font-size: 1rem;
  }

  /* Make settings wrapper part of flow */
  .settings-wrapper {
      position: relative;
      transform: none;
      width: 100%;
      top: auto;
      right: auto;
  }

  .btn-settings {
      width: 100%;
      padding: 0.8rem; /* Taller matches date input */
      justify-content: center;
      background: #f1f5f9; /* Neutral bg for mobile secondary action? Or keep primary? User didn't specify, keeping primary but full width may be overwhelming. Keeping primary for now as per "boton" usually implies existing style */
      color: var(--color-primary); /* Let's make it secondary style to not compete with date? No, stick to existing class style, just layout */
      background: white; 
      border: 1px solid var(--border-color);
  }
  
  .btn-settings:hover {
      background: #f8fafc;
  }

  .summary-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .detailed-reports-container {
      grid-template-columns: 1fr;
  }
  
  .page-title {
      font-size: 1.5rem;
  }
}
</style>
