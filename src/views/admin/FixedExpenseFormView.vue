<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { authFetch } from '../../utils/authFetch';
import { Save, X, ArrowLeft } from 'lucide-vue-next';


const router = useRouter();
const route = useRoute();

const isEdit = computed(() => !!route.params.id);

const form = ref({
  concept: '',
  amount: '',
  paidTo: '',
  paymentMethod: 'Efectivo',
  frequency: 'Mensual',
  expenseDate: new Date().toISOString().split('T')[0]
});

const loading = ref(false);

const fetchExpense = async () => {
  if (!isEdit.value) return;
  
  loading.value = true;
  try {
    const res = await authFetch(`/api/fixed-expenses/${route.params.id}`);


    if (!res.ok) throw new Error('Failed to fetch expense');
    const data = await res.json();
    
    form.value = {
      concept: data.concept,
      amount: data.amount,
      paidTo: data.paidTo,
      paymentMethod: data.paymentMethod,
      frequency: data.frequency,
      expenseDate: new Date(data.expenseDate).toISOString().split('T')[0]
    };
  } catch (error) {
    console.error(error);
    alert('Error al cargar los datos del gasto');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchExpense);

const saveExpense = async () => {
  try {
    const url = isEdit.value 
      ? `http://localhost:3000/api/fixed-expenses/${route.params.id}`
      : 'http://localhost:3000/api/fixed-expenses';
    
    const method = isEdit.value ? 'PUT' : 'POST';

    const res = await authFetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(form.value)
    });


    if (!res.ok) throw new Error('Error saving expense');
    
    router.push('/admin/fixed-expenses');
  } catch (error) {
    console.error(error);
    alert('Error al guardar el gasto');
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
        <h1 class="page-title">{{ isEdit ? 'Editar Gasto Fijo' : 'Nuevo Gasto Fijo' }}</h1>
        <p class="page-subtitle">{{ isEdit ? 'Actualiza los datos del gasto recurrente.' : 'Registra un nuevo gasto recurrente.' }}</p>
      </div>
    </div>

    <div class="form-container">
      <form @submit.prevent="saveExpense" class="expense-form">
        
        <div class="form-grid">
          <!-- Concept -->
          <div class="form-group full-width">
            <label for="concept">Concepto</label>
            <input 
              type="text" 
              id="concept" 
              v-model="form.concept" 
              required 
              placeholder="Ej. Renta, Electricidad, Internet..."
            />
          </div>

          <!-- Paid To -->
          <div class="form-group">
            <label for="paidTo">Pagado A</label>
            <input 
              type="text" 
              id="paidTo" 
              v-model="form.paidTo" 
              required 
              placeholder="Ej. Lomas Studio, CFE..."
            />
          </div>

          <!-- Amount -->
          <div class="form-group">
            <label for="amount">Monto</label>
            <div class="input-wrapper">
              <span class="prefix">$</span>
              <input 
                type="number" 
                id="amount" 
                v-model="form.amount" 
                required 
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <!-- Date -->
          <div class="form-group">
            <label for="expenseDate">Fecha de Gasto / Vencimiento</label>
            <input 
              type="date" 
              id="expenseDate" 
              v-model="form.expenseDate" 
              required
            />
          </div>

          <!-- Frequency -->
          <div class="form-group">
            <label for="frequency">Frecuencia</label>
            <select id="frequency" v-model="form.frequency" required>
              <option value="Único">Único</option>
              <option value="Semanal">Semanal</option>
              <option value="Quincenal">Quincenal</option>
              <option value="Mensual">Mensual</option>
              <option value="Bimestral">Bimestral</option>
              <option value="Anual">Anual</option>
            </select>
          </div>

          <!-- Payment Method -->
          <div class="form-group">
            <label for="paymentMethod">Forma de Pago</label>
            <select id="paymentMethod" v-model="form.paymentMethod" required>
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

        </div>

        <div class="form-actions">
          <button type="button" class="btn secondary" @click="cancel">
            <X size="18" />
            <span>Cancelar</span>
          </button>
          <button type="submit" class="btn primary" :disabled="loading">
            <Save size="18" />
            <span>{{ isEdit ? 'Actualizar Gasto' : 'Guardar Gasto' }}</span>
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
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
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

.expense-form {
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

.full-width {
    grid-column: 1 / -1;
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
  border: none;
}

.btn.secondary {
  background-color: transparent;
  color: var(--text-muted);
  border: 1px solid transparent;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
</style>
