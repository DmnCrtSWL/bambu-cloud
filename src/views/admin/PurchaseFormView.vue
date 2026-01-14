<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { authFetch } from '../../utils/authFetch';
import { Save, X, ArrowLeft } from 'lucide-vue-next';


const router = useRouter();
const route = useRoute();

const isEdit = computed(() => !!route.params.id);

const form = ref({
  ticketId: '',
  provider: '',
  date: '', // Will be set in onMounted to "dd/mm/yyyy"
  total: '',
  paymentMethod: 'Efectivo',
  status: 'No Desglosado'
});

const loading = ref(false);

// Helper to format Date -> dd/mm/yyyy
const formatDateDDMMYYYY = (dateObj) => {
  const d = String(dateObj.getDate()).padStart(2, '0');
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const y = dateObj.getFullYear();
  return `${d}/${m}/${y}`;
};

// Helper to parse dd/mm/yyyy -> ISO String with Noon Time
// We add T12:00:00.000Z to ensure it lands on the correct day in both UTC and Western timezones (like Mexico)
// 12:00 UTC = 06:00 CST (Mexico). This prevents "Yesterday" shifts caused by 00:00 UTC.
const parseDateToISO = (dateStr) => {
  if (!dateStr) return null;
  const [d, m, y] = dateStr.split('/');
  return `${y}-${m}-${d}`; // Reverted to avoid server crash (Invalid Time Value)
};

const fetchPurchase = async () => {
  if (!isEdit.value) {
    // Set today default
    form.value.date = formatDateDDMMYYYY(new Date());
    return;
  }
  
  loading.value = true;
  try {
    const res = await authFetch(`/api/tickets/${route.params.id}`);

    if (!res.ok) throw new Error('Failed to fetch ticket');
    const data = await res.json();
    
    // Parse backend date (likely ISO string)
    const backendDate = new Date(data.purchaseDate || data.createdAt);
    
    form.value = {
      ticketId: data.ticketRef,
      provider: data.provider,
      date: formatDateDDMMYYYY(backendDate),
      total: data.total,
      paymentMethod: data.paymentMethod,
      status: data.status
    };
  } catch (error) {
    console.error(error);
    alert('Error al cargar los datos del ticket');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchPurchase);
// ... fetchInitialData ...

// Input mask handler for dd/mm/yyyy
const handleDateInput = (e) => {
  let v = e.target.value.replace(/\D/g, ''); // Digits only
  if (v.length > 8) v = v.slice(0, 8);
  
  if (v.length > 4) {
      form.value.date = `${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4)}`;
  } else if (v.length > 2) {
      form.value.date = `${v.slice(0,2)}/${v.slice(2)}`;
  } else {
      form.value.date = v;
  }
};

const savePurchase = async () => {
  try {
    const url = isEdit.value 
      ? `/api/tickets/${route.params.id}`
      : '/api/tickets';
    
    const method = isEdit.value ? 'PUT' : 'POST';
    
    // Conversion for backend
    const finalDate = parseDateToISO(form.value.date);

    const res = await authFetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ticketRef: form.value.ticketId,
        provider: form.value.provider,
        total: form.value.total,
        paymentMethod: form.value.paymentMethod,
        purchaseDate: finalDate
      })
    });


    if (!res.ok) throw new Error('Error saving ticket');
    
    // Redirect to list
    router.push('/admin/purchases');
  } catch (error) {
    console.error(error);
    alert('Error al guardar el ticket');
  }
};


const cancel = () => {
  router.back();
};
</script>

<template>
  <div class="form-view">
    <div class="header">
      <button class="back-btn" @click="cancel">
        <ArrowLeft size="20" />
      </button>
      <div>
        <h1 class="page-title">{{ isEdit ? 'Editar Compra' : 'Nueva Compra' }}</h1>
        <p class="page-subtitle">{{ isEdit ? 'Actualiza los datos del ticket de gastos.' : 'Registra un nuevo ticket de gastos.' }}</p>
      </div>
    </div>

    <div class="form-container">
      <form @submit.prevent="savePurchase" class="purchase-form">
        
        <div class="form-grid">
          <!-- Ticket ID -->
          <div class="form-group">
            <label for="ticketId"># Ticket / Folio</label>
            <input 
              type="text" 
              id="ticketId" 
              v-model="form.ticketId" 
              required 
              placeholder="Ej. TKT-2023-001"
              maxlength="30"
            />
          </div>

          <!-- Provider -->
          <div class="form-group">
            <label for="provider">Proveedor</label>
            <input 
              type="text" 
              id="provider" 
              v-model="form.provider" 
              required 
              placeholder="Ej. Walmart, Costco..."
            />
          </div>

          <!-- Date -->
          <div class="form-group">
            <label for="date">Fecha de Compra (dd/mm/aaaa)</label>
            <input 
              type="text" 
              id="date" 
              :value="form.date"
              @input="handleDateInput"
              required
              placeholder="dd/mm/aaaa"
              maxlength="10"
            />
          </div>

          <!-- Total -->
          <div class="form-group">
            <label for="total">Total del Ticket</label>
            <div class="input-wrapper">
              <span class="prefix">$</span>
              <input 
                type="number" 
                id="total" 
                v-model="form.total" 
                required 
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <!-- Payment Method -->
          <div class="form-group">
            <label for="paymentMethod">Forma de Pago</label>
            <select id="paymentMethod" v-model="form.paymentMethod" required>
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Transferencia">Transferencia</option>
              <option value="CXP">CXP</option>
            </select>
          </div>


        </div>

        <div class="form-actions">
          <button type="button" class="btn secondary" @click="cancel">
            <X size="18" />
            <span>Cancelar</span>
          </button>
          <button type="submit" class="btn primary">
            <Save size="18" />
            <span>{{ isEdit ? 'Actualizar Ticket' : 'Guardar Ticket' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.form-view {
  max-width: 800px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.back-btn {
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
}

.back-btn:hover {
  background-color: var(--bg-surface);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.page-title {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.page-subtitle {
  color: var(--text-muted);
}

.form-container {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 2rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.purchase-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-weight: 500;
  font-size: 0.9rem;
  color: var(--text-main);
}

input, select {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background-color: var(--bg-app);
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--text-main);
  transition: all 0.2s;
}

input:focus, select:focus {
  outline: none;
  border-color: var(--color-primary);
  background-color: #fff;
  box-shadow: 0 0 0 3px var(--color-accent);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.prefix {
  position: absolute;
  left: 1rem;
  color: var(--text-muted);
  font-weight: 500;
}

.input-wrapper input {
  width: 100%;
  padding-left: 2rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all 0.2s;
}

.btn.primary {
  background-color: var(--color-primary);
  color: white;
  border: 1px solid transparent;
}

.btn.primary:hover {
  background-color: var(--color-primary-dark);
}

.btn.secondary {
  background-color: transparent;
  color: var(--text-muted);
  border: 1px solid transparent;
}

.btn.secondary:hover {
  background-color: var(--bg-app);
  color: var(--text-main);
}
</style>
