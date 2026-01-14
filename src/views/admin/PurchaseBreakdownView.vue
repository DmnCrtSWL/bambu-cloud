<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authFetch } from '../../utils/authFetch';
import { ArrowLeft, Save, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-vue-next';


const route = useRoute();
const router = useRouter();

// State
const ticket = ref(null);
const loading = ref(true);
const error = ref(null);

// Fetch ticket on mount


const API_URL = '/api';

const fetchTicket = async () => {
  try {
    // For now getting ticket #1 or from route param if exists
    const id = route.params.id || 1;
    const res = await authFetch(`/api/tickets/${id}`);
    if (!res.ok) throw new Error('Ticket not found');
    const data = await res.json();
    
    ticket.value = {
      id: data.id,
      ticketRef: data.ticketRef,
      provider: data.provider,
      total: Number(data.total),
      paymentMethod: data.paymentMethod,
      status: data.status
    };
    
    // If ticket has items we could load them here too, but for Breakdown View 
    // we assume we are creating them usually? Or editing?
    // Let's load existing items if any
    if (data.items && data.items.length > 0) {
        items.value = data.items.map(i => ({
            ...i,
            unitPrice: Number(i.unitPrice),
            quantity: Number(i.quantity),
            discount: Number(i.discount),
            total: Number(i.total)
        }));
    }

  } catch (e) {
    error.value = e.message;
    // Mock for demo if no DB yet
    console.warn("Using mock data due to error:", e);
    ticket.value = {
        id: 'TKT-MOCK-001', 
        ticketRef: 'TKT-2025-0015',
        provider: 'Walmart Supercenter (MOCK)', 
        total: 4567.80, 
        paymentMethod: 'Tarjeta', 
        status: 'No Desglosado'
    };
  } finally {
    loading.value = false;
  }
};


const inventoryItems = ref([]);
const fetchInventory = async () => {
    try {
        const res = await authFetch(`/api/inventory`);
        if (res.ok) {
            const data = await res.json();
            // Store full objects: { product, unit, ... }
            inventoryItems.value = data;
        }
    } catch (e) {
        console.error("Failed to fetch inventory for autocomplete", e);
    }
};


onMounted(() => {
    fetchTicket();
    fetchInventory();
});

// Item Form State
const itemForm = ref({
  product: '',
  quantity: '',
  unit: 'Pzas',
  unitPrice: '',
  discount: 0,
  type: 'Insumo'
});

// Autocomplete
const showSuggestions = ref(false);
const filteredSuggestions = computed(() => {
    if (!itemForm.value.product) return [];
    return inventoryItems.value.filter(item => 
        item.product.toLowerCase().includes(itemForm.value.product.toLowerCase()) && 
        item.product !== itemForm.value.product
    ).slice(0, 5);
});

const selectSuggestion = (item) => {
    itemForm.value.product = item.product;
    if (item.unit) {
        itemForm.value.unit = item.unit;
    }
    showSuggestions.value = false;
};

// Items List
const items = ref([]);

// Computed properties for calculations
const formSubtotal = computed(() => {
    const qty = Number(itemForm.value.quantity) || 0;
    const price = Number(itemForm.value.unitPrice) || 0;
    return qty * price;
});

const itemTotal = computed(() => {
  const discount = Number(itemForm.value.discount) || 0;
  return Math.max(0, formSubtotal.value - discount);
});

const currentTotal = computed(() => {
  return items.value.reduce((sum, item) => sum + item.total, 0);
});

const remainingTotal = computed(() => {
  return ticket.value.total - currentTotal.value;
});

const isBalanced = computed(() => {
  return Math.abs(remainingTotal.value) < 0.01; // Float precision tolerance
});

// Actions
const addItem = () => {
    if (!itemForm.value.product || !itemForm.value.unitPrice) return; // Keep validation

    const item = { ...itemForm.value };
    if (!item.discount) item.discount = 0;
    
    // Calculate total for local display (backend also calculates it)
    item.total = (Number(item.quantity) * Number(item.unitPrice)) - Number(item.discount);
    item.id = Date.now(); // Add ID for keying

    items.value.push(item);
    
    // Reset form
    itemForm.value = {
        product: '',
        quantity: '',
        unit: itemForm.value.unit, // Keep unit from previous entry
        unitPrice: '',
        discount: 0,
        type: 'Insumo'
    };
};

const removeItem = (index) => {
  items.value.splice(index, 1);
};


const handleBlur = () => {
    setTimeout(() => {
        showSuggestions.value = false;
    }, 200);
};

const saveBreakdown = async () => {
  if (!isBalanced.value) return;
  
  try {
    const res = await authFetch(`/api/tickets/${route.params.id}/breakdown`, { // Corrected endpoint to /api/tickets
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            items: items.value
        })
    });


    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to save (${res.status}): ${errText}`);
    }
    
    const result = await res.json();
    alert('Desglose guardado exitosamente!');
    // Redirect to purchases view
    router.push('/admin/purchases');
    
  } catch (e) {
    console.error(e);
    alert('Error al guardar el desglose: ' + e.message);
  }
};

// Formatting
const currency = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
</script>

<template>
  <div class="breakdown-view">
    <div v-if="loading" class="loading-state">Cargando información del ticket...</div>
    <div v-else-if="error" class="error-state">Error: {{ error }}</div>
    <template v-else-if="ticket">
      <!-- Header: Navigation & Title -->
      <div class="view-header">
        <button class="back-link" @click="$router.back()">
          <ArrowLeft size="20" />
        </button>
        <div>
          <h1 class="page-title">Desglose de Compra</h1>
          <p class="page-subtitle">Detalla los productos adquiridos en el ticket {{ ticket.ticketRef }}</p>
        </div>
      </div>

      <!-- Ticket Summary Card (Header Info) -->
      <div class="ticket-header-card">
        <div class="ticket-field">
          <label># Ticket</label>
          <div class="value">{{ ticket.ticketRef }}</div>
        </div>
        <div class="ticket-field">
          <label>Proveedor</label>
          <div class="value">{{ ticket.provider }}</div>
        </div>
        <div class="ticket-field">
          <label>Forma de Pago</label>
          <div class="value">{{ ticket.paymentMethod }}</div>
        </div>
        <div class="ticket-field total-field">
          <label>Total Ticket</label>
          <div class="value total">{{ currency(ticket.total) }}</div>
        </div>
      </div>

      <!-- Input Form Area -->
      <div class="entry-section">
        <h2 class="section-title">Agregar Concepto</h2>
        <form @submit.prevent="addItem" class="item-form-grid">
          
          <div class="input-group col-span-3 product-input-group">
            <label>Nombre del Producto</label>
            <div class="autocomplete-wrapper">
                <input 
                  type="text" 
                  v-model="itemForm.product" 
                  required 
                  placeholder="Buscar o crear..." 
                  @focus="showSuggestions = true"
                  @blur="handleBlur"
                />
                <ul v-if="showSuggestions && filteredSuggestions.length > 0" class="suggestions-list">
                    <li 
                        v-for="suggestion in filteredSuggestions" 
                        :key="suggestion.product"
                        @click="selectSuggestion(suggestion)"
                    >
                        {{ suggestion.product }}
                    </li>
                </ul>
            </div>
          </div>
          
          <div class="input-group col-span-1">
            <label>Cant.</label>
            <input type="number" v-model="itemForm.quantity" required min="0" step="0.000001" placeholder="0.000000" />
          </div>

          <div class="input-group col-span-2">
            <label>Unidad</label>
            <select v-model="itemForm.unit">
              <option>Kg</option>
              <option>Gr</option>
              <option>Lt</option>
              <option>Ml</option>
              <option>Pzas</option>
            </select>
          </div>

          <div class="input-group col-span-2">
            <label>Precio Unit.</label>
            <input type="number" v-model="itemForm.unitPrice" required placeholder="$0.000000" step="0.000001" />
          </div>

           <div class="input-group col-span-2">
            <label>Subtotal</label>
            <div class="readonly-value">{{ currency(formSubtotal) }}</div>
          </div>

          <div class="input-group col-span-1">
            <label>Desc.</label>
            <input type="number" v-model="itemForm.discount" placeholder="0" step="0.01" />
          </div>

          <!-- Hidden Type Selector (Defaulted or inferred, keeping it simple as it's not in requested fields but logic needs it) -->
          <!-- We'll keep it visible but smaller or just implicit? User didn't ask to remove it, but didn't list it. 
               Let's keep it for now as it's important for inventory classification. -->
           <!-- Changed col-span to fit better -->
          <div class="input-group col-span-2">
            <label>Tipo</label>
            <select v-model="itemForm.type">
              <option value="Insumo">Insumo</option>
              <option value="Terminado">Terminado</option>
              <option value="Operativo">Operativo</option>
            </select>
          </div>
          
           <div class="input-group col-span-2 total-display">
             <label>Total</label>
             <div class="total-value">{{ currency(itemTotal) }}</div>
           </div>

          <div class="input-group col-span-1 button-container">
            <button type="submit" class="add-btn-icon" title="Agregar">
              <Plus :size="24" />
            </button>
          </div>

        </form>
      </div>

      <!-- Breakdown Table -->
      <div class="items-table-container">
        <table class="items-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th class="text-center">Tipo</th>
              <th class="text-center">Cant.</th>
              <th class="text-center">Unidad</th>
              <th class="text-right">P. Unitario</th>
              <th class="text-right">Desc.</th>
              <th class="text-right">Importe</th>
              <th class="text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in items" :key="index">
              <td class="font-medium">{{ item.product }}</td>
              <td class="text-center">
                <span class="type-badge" :class="item.type?.toLowerCase()">
                  {{ item.type || 'Insumo' }}
                </span>
              </td>
              <td class="text-center">{{ item.quantity }}</td>
              <td class="text-center text-muted">{{ item.unit }}</td>
              <td class="text-right">{{ currency(item.unitPrice) }}</td>
              <td class="text-right text-muted">-{{ currency(item.discount) }}</td>
              <td class="text-right font-bold">{{ currency(item.total) }}</td>
              <td class="text-center">
                <button @click="removeItem(index)" class="delete-icon">
                  <Trash2 size="16" />
                </button>
              </td>
            </tr>
            <tr v-if="items.length === 0">
              <td colspan="7" class="empty-state">No hay conceptos agregados aún.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Balancing Footer -->
      <div class="balance-footer">
        <div class="balance-info">
          <span class="label">Total Desglosado:</span>
          <span class="amount" :class="{ 'balanced': isBalanced }">{{ currency(currentTotal) }}</span>
        </div>
        <div class="balance-status" :class="{ 'error': !isBalanced, 'success': isBalanced }">
          <AlertCircle v-if="!isBalanced" size="20" />
          <CheckCircle v-else size="20" />
          <span>{{ isBalanced ? 'Desglose Cuadrado' : `Faltan ${currency(remainingTotal)}` }}</span>
        </div>
        <button 
          class="save-btn" 
          :disabled="!isBalanced"
          @click="saveBreakdown"
        >
          <Save size="20" />
          <span>Guardar Desglose</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.breakdown-view {
  max-width: 1200px;
  margin: 0 auto;
}

.view-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.back-link {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  cursor: pointer;
}

.back-link:hover {
  background-color: var(--bg-surface);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.ticket-header-card {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  background: white;
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  margin-bottom: 2rem;
  box-shadow: var(--shadow-sm);
}

.ticket-field label {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  display: block;
  margin-bottom: 0.4rem;
}

.ticket-field .value {
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--text-main);
}

.total-field .value {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-primary);
}

/* Entry Form */
.entry-section {
  background: #FAFCFC;
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1rem;
  margin-bottom: 1rem;
  color: var(--text-muted);
  font-weight: 600;
}

/* 12-Column Grid Layout */
.item-form-grid {
  display: grid;
  grid-template-columns: repeat(16, 1fr); /* Expanded columns to fit new fields */
  gap: 1rem;
  align-items: flex-end;
}
.col-span-3 { grid-column: span 3; }
.col-span-2 { grid-column: span 2; }
.col-span-1 { grid-column: span 1; }

.product-input-group {
    grid-column: span 3;
    position: relative;
    z-index: 10;
}

.autocomplete-wrapper {
    position: relative;
    width: 100%;
}

.suggestions-list {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    max-height: 200px;
    overflow-y: auto;
    z-index: 20;
    list-style: none;
    padding: 0;
    margin: 4px 0 0 0;
}

.suggestions-list li {
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 0.9rem;
}

.suggestions-list li:hover {
    background-color: #f1f5f9;
}

.readonly-value {
    padding: 0.6rem;
    background: #f1f5f9;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    color: var(--text-muted);
}

.total-value {
    padding: 0.6rem;
    font-weight: 700;
    color: var(--color-primary);
    font-size: 1.1rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.input-group label {
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.input-group input, .input-group select {
  padding: 0.6rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  width: 100%;
}

.button-container {
  display: flex;
  justify-content: center;
}

.add-btn-icon {
  width: 100%;
  height: 42px; /* Match input height roughly */
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.add-btn-icon:hover {
  background-color: var(--color-primary-dark);
}

/* Items Table */
.items-table-container {
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  margin-bottom: 2rem;
  overflow: hidden;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
}

.items-table th {
  background: #F8FAFB;
  padding: 0.8rem 1rem;
  text-align: left;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-color);
}

.items-table td {
  padding: 0.8rem 1rem;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.95rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  font-style: italic;
}

.delete-icon {
  background: transparent;
  border: none;
  color: #CCC;
  cursor: pointer;
  padding: 4px;
}

.delete-icon:hover { color: #D32F2F; }

.type-badge {
    padding: 0.25rem 0.6rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
}

.type-badge.insumo {
    background-color: #E3F2FD;
    color: #1565C0;
}

.type-badge.terminado {
    background-color: #E8F5E9;
    color: #2E7D32;
}

.type-badge.operativo {
    background-color: #FFF3E0;
    color: #EF6C00;
}

/* Footer & Balancing */
.balance-footer {
  position: sticky;
  bottom: 20px;
  background: white;
  padding: 1rem 1.5rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2rem;
  border: 1px solid var(--border-color);
}

.balance-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.balance-info .label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.balance-info .amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: #D32F2F; /* Default NOT balanced (red) */
  transition: color 0.3s;
}

.balance-info .amount.balanced {
  color: var(--color-primary); /* Green when balanced */
}

.balance-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
}

.balance-status.error {
  background-color: #FFEBEE;
  color: #D32F2F;
}

.balance-status.success {
  background-color: var(--color-accent);
  color: var(--color-primary);
}

.save-btn {
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.save-btn:disabled {
  background-color: var(--border-color);
  cursor: not-allowed;
  opacity: 0.7;
}

/* Utilities */
.text-right { text-align: right; }
.text-center { text-align: center; }
.font-bold { font-weight: 700; }
.font-medium { font-weight: 500; }
.text-muted { color: var(--text-muted); }
</style>
