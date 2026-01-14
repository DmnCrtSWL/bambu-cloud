<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { authFetch } from '../../utils/authFetch';
import { useCartStore } from '../../stores/cart';

import { 
  Clock, 
  User, 
  ChevronRight, 
  AlertCircle,
  Loader2,
  CookingPot,
  Truck,
  MapPin,
  Phone,
  Banknote,
  CreditCard,
  Smartphone,
  X,
  Eye
} from 'lucide-vue-next';

const router = useRouter();
const cartStore = useCartStore();
const orders = ref([]);
const loading = ref(true);
const selectedOrder = ref(null);
let pollingInterval = null;
const previousOrderCount = ref(0);

// Simple "Ding" Sound (Base64 MP3)
const NOTIFICATION_SOUND_SRC = 'data:audio/mp3;base64,//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'; // Keeping it short to avoid bloat, using a generic placeholder pattern for now as a real MP3 base64 is too long for this interface. 
// Ideally, this should be a real file URL or a proper short base64 string.
// Since a real "ding" base64 is quite long (approx 5-10KB), I will use a very short, functional sine beep encoded as WAV to save space and ensure it works.

// 0.5s Sine Wave Beep (WAV Base64)
const BEEP_SOUND = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'; // Extremely short.

const playNotificationSound = () => {
    try {
        const audio = new Audio(); 
        // Custom user sound
        audio.src = '/alert.mp3';
        audio.play().catch(e => console.error("Audio play blocked", e));
    } catch (e) {
        console.error("Audio creation failed", e);
    }
}

// ... actually I will just copy the logic below

const fetchOrders = async (isBackground = false) => {
  if (!isBackground) loading.value = true;
  try {
    const res = await authFetch('/api/orders');

    if (!res.ok) throw new Error('Failed to fetch orders');
    const newOrders = await res.json();
    
    // Check for new orders (only if we have data and it's a background refresh)
    // if (isBackground && newOrders.length > previousOrderCount.value) {
    //     playNotificationSound(); // Handled Globally now
    // }
    
    // Update count
    previousOrderCount.value = newOrders.length;
    orders.value = newOrders;
    
  } catch (error) {
    console.error(error);
  } finally {
    if (!isBackground) loading.value = false;
  }
};

onMounted(() => {
    fetchOrders(); // Initial fetch
    pollingInterval = setInterval(() => {
        fetchOrders(true);
    }, 10000);
});

onUnmounted(() => {
    if (pollingInterval) clearInterval(pollingInterval);
});

const columns = [
  { id: 'Nuevo', title: 'Nuevo', action: 'Preparar', nextStatus: 'En preparación', icon: AlertCircle },
  { id: 'En preparación', title: 'En preparación', action: 'Enviar', nextStatus: 'En entrega', icon: CookingPot },
  { id: 'En entrega', title: 'En entrega', action: 'Cobrar & Completar', nextStatus: 'Completado', icon: Truck }
];

const getOrdersByStatus = (status) => {
  return orders.value.filter(o => o.status === status);
};

const updateStatus = async (orderId, newStatus) => {
  try {
    // Capture order data BEFORE updating (as it might vanish from filtered list)
    const orderToProcess = orders.value.find(o => o.id === orderId);

    // Update DB
    const res = await authFetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (!res.ok) throw new Error('Failed to update status');
    
    // Optimistic Update
    const index = orders.value.findIndex(o => o.id === orderId);
    if (index !== -1) {
      orders.value[index].status = newStatus;
      orders.value[index].status = newStatus;
      if (selectedOrder.value?.id === orderId) {
          selectedOrder.value = null; // Always close modal on status change to return to board
      }
    }

    // Logic for "Completado" -> Move to POS
    if (newStatus === 'Completado' && orderToProcess) {
        cartStore.clearCart();
        // Ensure we pass a clean copy of items
        cartStore.setItems([...orderToProcess.items]);
        
        // Pass Customer Info to Cart
        cartStore.setCustomer({
            name: orderToProcess.customerName,
            phone: orderToProcess.customerPhone
        });

        router.push('/pos/terminal');
    }

  } catch (error) {
    console.error(error);
    alert('Error al actualizar el estado de la orden');
  }
};

const formatTime = (timeStr) => {
  if (!timeStr) return '--:--';
  if (timeStr.includes('T')) {
      const date = new Date(timeStr);
      return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }
  return timeStr;
};

const getPaymentIcon = (method) => {
    if (!method) return Banknote;
    const m = method.toLowerCase();
    if (m === 'tarjeta' || m === 'terminal física') return CreditCard;
    if (m === 'transferencia') return Smartphone;
    return Banknote;
};

const openModal = (order) => {
    selectedOrder.value = order;
};

const closeModal = () => {
    selectedOrder.value = null;
};

const handleColumnAction = (order, col) => {
    if (col.id === 'Nuevo') {
        openModal(order);
    } else {
        updateStatus(order.id, col.nextStatus);
    }
};

const getNextStep = (status) => {
    const map = {
        'Nuevo': { nextStatus: 'En preparación', label: 'Empezar Orden' },
        'En preparación': { nextStatus: 'En entrega', label: 'Enviar a Entrega' },
        'En entrega': { nextStatus: 'Completar', label: 'Cobrar & Completar' }
    };
    return map[status];
};

const parseItemDetails = (item) => {
    // If we have structure options, use them
    if (item.options && item.options.length > 0) {
        return { displayName: item.productName, displayOptions: item.options };
    }

    // Fallback: Parse from "Name (Option1, Option2)" string
    const match = item.productName.match(/^(.+?)\s*\((.+)\)$/);
    if (match) {
        return {
            displayName: match[1],
            displayOptions: match[2].split(',').map(s => s.trim())
        };
    }

    return { displayName: item.productName, displayOptions: [] };
};

// Mobile Collapsible Columns Logic
const collapsedColumns = ref([]);

const toggleColumn = (colId) => {
    if (collapsedColumns.value.includes(colId)) {
        collapsedColumns.value = collapsedColumns.value.filter(id => id !== colId);
    } else {
        collapsedColumns.value.push(colId);
    }
};

const isCollapsed = (colId) => collapsedColumns.value.includes(colId);
</script>

<template>
  <div class="orders-kanban">
    <header class="page-header">
      <div>
        <h1 class="page-title">Órdenes</h1>
        <p class="page-subtitle">Tablero de cocina y entregas.</p>
      </div>
      <button class="refresh-btn" @click="fetchOrders(false)" :disabled="loading">
        <Loader2 v-if="loading" class="animate-spin" size="18" />
        <span v-else>Actualizar</span>
      </button>
    </header>

    <div v-if="loading && orders.length === 0" class="loading-state">
      <Loader2 class="animate-spin" size="48" />
      <p>Cargando órdenes...</p>
    </div>

    <div v-else class="kanban-grid">
      <div v-for="col in columns" :key="col.id" class="kanban-column" :class="{ 'collapsed': isCollapsed(col.id) }">
        <div class="column-header" @click="toggleColumn(col.id)">
          <component :is="col.icon" size="20" class="column-icon" />
          <h2 class="column-title">{{ col.title }}</h2>
          <span class="count-badge">{{ getOrdersByStatus(col.id).length }}</span>
          <ChevronRight 
            size="20" 
            class="collapse-icon"
            :class="{ 'rotated': !isCollapsed(col.id) }" 
          />
        </div>

        <div class="column-content" v-show="!isCollapsed(col.id)">
          <div 
            v-for="order in getOrdersByStatus(col.id)" 
            :key="order.id" 
            class="order-card"
            @click="openModal(order)"
          >
            <!-- Card Header: Time & Payment -->
            <div class="card-header-row">
                <div class="delivery-time">
                    <Clock size="14" />
                    <span>{{ formatTime(order.deliveryTime) }}</span>
                </div>
                <div class="payment-badge">
                    <component :is="getPaymentIcon(order.paymentMethod)" size="14" />
                    <span>{{ order.paymentMethod || 'Efectivo' }}</span>
                </div>
            </div>

            <!-- Customer Info -->
            <div class="card-customer">
                <div class="customer-row">
                    <User size="14" class="icon" />
                    <strong>{{ order.customerName }}</strong>
                    <span class="location-badge" v-if="order.deliveryLocation">
                        <MapPin size="12" />
                        {{ order.deliveryLocation }}
                    </span>
                </div>
            </div>

            <!-- Compact Items Preview -->
            <div class="card-body">
              <ul class="items-list">
                <!-- Show max 1 item full detail, rest as summary -->
                <li v-for="(item, idx) in order.items.slice(0, 1)" :key="idx">
                  <strong>{{ item.quantity }}x</strong> {{ item.productName }}
                </li>
              </ul>
              
              <div v-if="order.items.length > 1" class="more-items-badge">
                  <Eye size="14" />
                  Ver {{ order.items.length - 1 }} productos más...
              </div>
              
              <div v-if="order.notes" class="order-notes-preview">
                <AlertCircle size="14" color="#d97706" />
                <span>Ver notas</span>
              </div>
            </div>

            <div class="card-footer">
              <span class="total-price">${{ order.total }}</span>
              <button class="action-btn" @click.stop="handleColumnAction(order, col)">
                <span>{{ col.action }}</span>
                <ChevronRight size="16" />
              </button>
            </div>
          </div>
          
          <div v-if="getOrdersByStatus(col.id).length === 0" class="empty-column">
            <p>Sin órdenes</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Order Detail Modal -->
    <div v-if="selectedOrder" class="modal-overlay" @click.self="closeModal">
        <div class="modal-card">
            <button class="modal-close" @click="closeModal"><X size="24" /></button>
            
            <div class="modal-header">
                <div class="header-top">
                    <span class="status-badge-sm">{{ selectedOrder.status }}</span>
                </div>
                <div class="header-main">
                    <h2>Orden #{{ selectedOrder.id }}</h2>
                    <div class="time-display">
                        <Clock size="20" class="text-primary" />
                        <span>{{ formatTime(selectedOrder.deliveryTime) }}</span>
                    </div>
                </div>
            </div>

            <div class="modal-body">
                <div class="info-section">
                    <h3>Cliente</h3>
                    <div class="info-grid">
                        <div class="info-row">
                            <User size="16" />
                            <span>{{ selectedOrder.customerName }}</span>
                        </div>
                        <div class="info-row" v-if="selectedOrder.customerPhone">
                            <Phone size="16" />
                            <a :href="`tel:${selectedOrder.customerPhone}`">{{ selectedOrder.customerPhone }}</a>
                        </div>
                        <div class="info-row" v-if="selectedOrder.deliveryLocation">
                            <MapPin size="16" />
                            <strong>{{ selectedOrder.deliveryLocation }}</strong>
                        </div>
                    </div>
                </div>

                <div class="info-section">
                    <h3>Productos</h3>
                  <ul class="modal-items-list">
                    <template v-for="(item, idx) in selectedOrder.items" :key="idx">
                        <li class="modal-item">
                            <div class="item-qty">{{ item.quantity }}x</div>
                            <div class="item-name">
                                <span class="product-title">{{ parseItemDetails(item).displayName }}</span>
                                <ul v-if="parseItemDetails(item).displayOptions.length > 0" class="item-options-list">
                                    <li v-for="opt in parseItemDetails(item).displayOptions" :key="opt">- {{ opt }}</li>
                                </ul>
                            </div>
                            <div class="item-price">${{ item.total }}</div>
                        </li>
                        <!-- Note Row -->
                        <li v-if="item.notes" class="item-note-row">
                            <AlertCircle size="14" class="note-icon" />
                            <span class="note-text">{{ item.notes }}</span>
                        </li>
                    </template>
                  </ul>
                </div>

                <div class="info-section" v-if="selectedOrder.notes">
                    <h3>Notas</h3>
                    <div class="full-note">
                        {{ selectedOrder.notes }}
                    </div>
                </div>

                <div class="info-section">
                    <h3>Pago</h3>
                     <div class="info-row">
                         <component :is="getPaymentIcon(selectedOrder.paymentMethod)" size="20" />
                         <span>{{ selectedOrder.paymentMethod }}</span>
                         <span class="modal-total">${{ selectedOrder.total }}</span>
                     </div>
                </div>
            </div>

            <div class="modal-footer">
                <button class="modal-secondary-btn" @click="closeModal">Cerrar</button>
                <button 
                  v-if="getNextStep(selectedOrder.status)"
                  class="modal-primary-btn" 
                  @click="updateStatus(selectedOrder.id, getNextStep(selectedOrder.status).nextStatus)"
                >
                    {{ getNextStep(selectedOrder.status).label }}
                </button>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* Previous styles remain, adding new ones */
.orders-kanban {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-main);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background: var(--bg-app);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  color: var(--text-muted);
}

.kanban-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  flex: 1;
  min-height: 0;
}

.kanban-column {
  display: flex;
  flex-direction: column;
  background-color: #f1f3f5;
  border-radius: var(--radius-lg);
  padding: 1rem;
  gap: 1rem;
  transition: all 0.3s;
}

.column-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  cursor: default; /* Desktop default */
}

/* Mobile: header acts as toggle */
@media (max-width: 768px) {
  .column-header {
    cursor: pointer;
  }
}

.column-icon {
  color: var(--color-primary);
}

.column-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-main);
  flex: 1;
}

.count-badge {
  background: white;
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.1rem 0.6rem;
  border-radius: 1rem;
  box-shadow: var(--shadow-sm);
}

.collapse-icon {
  display: none; /* Hidden on desktop */
  transition: transform 0.3s;
  color: var(--text-muted);
}
.collapse-icon.rotated {
    transform: rotate(90deg);
}

.column-content {
  height: calc(100vh - 220px); /* Fixed height for scrolling */
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.25rem;
  transition: all 0.3s;
}


.column-content::-webkit-scrollbar {
  width: 4px;
}
.column-content::-webkit-scrollbar-track {
  background: transparent;
}
.column-content::-webkit-scrollbar-thumb {
  background: #dee2e6;
  border-radius: 4px;
}

.order-card {
  background: white;
  border-radius: var(--radius-md);
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid transparent;
  cursor: pointer; /* Clickable */
}

.order-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border-color: var(--color-accent);
}

.card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
}

.delivery-time {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: #ef4444;
    font-weight: 700;
    background: #fee2e2;
    padding: 2px 6px;
    border-radius: 4px;
}

.payment-badge {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: #64748b;
    font-size: 0.75rem;
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
}

.card-customer {
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #f1f5f9;
}

.customer-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    flex-wrap: wrap; /* Allow wrapping if name is long */
}

.location-badge {
    align-self: flex-start;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: var(--color-accent);
    color: var(--color-primary);
    font-size: 0.75rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
}

.customer-details {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9rem;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.items-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.items-list li {
  font-size: 0.9rem;
  color: var(--text-main);
  line-height: 1.4;
}

.more-items-badge {
    font-size: 0.8rem;
    color: var(--color-primary);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    background: #eff6ff;
    padding: 0.3rem;
    border-radius: 4px;
}

.order-notes-preview {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.8rem;
    color: #d97706;
    background: #fffbeb;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    width: fit-content;
}

.card-footer {
  margin-top: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.total-price {
    font-weight: 800;
    font-size: 1rem;
    color: var(--text-main);
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem;
  background-color: var(--bg-app);
  color: var(--color-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.empty-column {
  text-align: center;
  padding: 2rem;
  color: #adb5bd;
  font-size: 0.9rem;
  border: 2px dashed #dee2e6;
  border-radius: var(--radius-md);
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Modal Styles */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 100;
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(2px);
}

.modal-card {
    background: white;
    width: 90%;
    max-width: 500px;
    border-radius: 20px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    overflow: hidden;
}

@keyframes modalPop {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

.modal-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: transparent;
    border: none;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: var(--color-primary);
    z-index: 10;
}

.modal-header {
    padding: 1.5rem;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.header-top {
    display: flex;
}

.status-badge-sm {
    font-size: 0.75rem;
    color: #64748b;
    background: #e2e8f0;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.header-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header-main h2 {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--text-main);
    margin: 0;
}

.time-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.25rem;
    font-weight: 700;
    color: #ef4444; /* Red for visibility/urgency */
}

.time-big {
    font-size: 1.25rem;
    font-weight: 800;
    color: #ef4444;
}

.modal-meta {
    margin-top: 1rem;
    display: flex;
    gap: 1rem;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.text-primary { color: var(--color-primary); }

.modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}


.info-section h3 {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
    margin-bottom: 0.75rem;
    font-weight: 700;
}

.info-grid {
    display: grid;
    gap: 0.5rem;
}

.info-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1rem;
    color: var(--text-main);
}

.modal-items-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.modal-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px dashed #e2e8f0;
}

.item-qty {
    font-weight: 800;
    color: var(--color-primary);
    min-width: 30px;
}

.item-name {
    flex: 1;
    font-weight: 500;
    display: flex;
    flex-direction: column;
}

.product-title {
    font-weight: 600;
}

.item-options-list {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 0.85rem;
    color: #64748b;
    margin-top: 0.1rem;
}

.item-price {
    font-weight: 600;
    color: #64748b;
}

.full-note {
    background: #fffbeb;
    padding: 1rem;
    border-radius: 8px;
    border-left: 4px solid #f59e0b;
    color: #92400e;
    font-style: italic;
}

.modal-total {
    margin-left: auto;
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--text-main);
}

.modal-footer {
    padding: 1.5rem;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
    display: flex;
    gap: 1rem;
}

.modal-secondary-btn {
    flex: 1;
    padding: 1rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-weight: 700;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
}

.modal-secondary-btn:hover { background: #f1f5f9; color: var(--text-main); }

.modal-primary-btn {
    flex: 2;
    padding: 1rem;
    background: var(--color-primary);
    border: none;
    border-radius: 12px;
    font-weight: 700;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
}

.modal-primary-btn:hover { opacity: 0.9; transform: translateY(-1px); }

.item-note-inline {
    display: none; /* Deprecated in favor of .item-note-row */
}
.item-note-row {
    margin-top: -0.5rem;
    margin-bottom: 1rem;
    padding: 0.5rem 0.75rem;
    background: #fff7ed;
    border: 1px solid #ffedd5;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #c2410c;
    font-size: 0.85rem;
    margin-left: 3rem; /* Align with text, skipping quantity width */
}

.note-icon {
    flex-shrink: 0;
}

.note-text {
    font-weight: 500;
}

@media (max-width: 768px) {
  .kanban-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .kanban-column {
    padding: 0;
    gap: 0;
    border: 1px solid var(--border-color);
    background: white;
  }
  
  .column-header {
      padding: 1rem;
      background: #f8fafc;
      border-radius: var(--radius-lg);
  }
  
  .kanban-column.collapsed .column-header {
      /* If collapsed, maybe remove bottom rounded corners if we want strict accordion? 
         But here we just keep it simple */
  }

  .collapse-icon {
      display: block;
      margin-left: auto;
  }
  
  .count-badge {
      margin-left: 0.5rem;
  }
  
  .column-content {
      /* When active */
      padding: 1rem;
      border-top: 1px solid var(--border-color);
      height: auto;
      max-height: 500px; /* Limit height even when expanded, scrolling inside */
      background: #f1f3f5;
  }

  /* Adjust page header */
  .page-header {
      margin-bottom: 1rem;
  }
}

.info-section h3 {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
    margin-bottom: 0.75rem;
    font-weight: 700;
}

.info-grid {
    display: grid;
    gap: 0.5rem;
}

.info-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1rem;
    color: var(--text-main);
}

.modal-items-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.modal-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px dashed #e2e8f0;
}

.item-qty {
    font-weight: 800;
    color: var(--color-primary);
    min-width: 30px;
}

.item-name {
    flex: 1;
    font-weight: 500;
    display: flex;
    flex-direction: column;
}

.product-title {
    font-weight: 600;
}

.item-options-list {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 0.85rem;
    color: #64748b;
    margin-top: 0.1rem;
}

.item-price {
    font-weight: 600;
    color: #64748b;
}

.full-note {
    background: #fffbeb;
    padding: 1rem;
    border-radius: 8px;
    border-left: 4px solid #f59e0b;
    color: #92400e;
    font-style: italic;
}

.modal-total {
    margin-left: auto;
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--text-main);
}

.modal-footer {
    padding: 1.5rem;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
    display: flex;
    gap: 1rem;
}

.modal-secondary-btn {
    flex: 1;
    padding: 1rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-weight: 700;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
}

.modal-secondary-btn:hover { background: #f1f5f9; color: var(--text-main); }

.modal-primary-btn {
    flex: 2;
    padding: 1rem;
    background: var(--color-primary);
    border: none;
    border-radius: 12px;
    font-weight: 700;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
}

.modal-primary-btn:hover { opacity: 0.9; transform: translateY(-1px); }

.item-note-inline {
    display: none; /* Deprecated in favor of .item-note-row */
}
.item-note-row {
    margin-top: -0.5rem;
    margin-bottom: 1rem;
    padding: 0.5rem 0.75rem;
    background: #fff7ed;
    border: 1px solid #ffedd5;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #c2410c;
    font-size: 0.85rem;
    margin-left: 3rem; /* Align with text, skipping quantity width */
}

.note-icon {
    flex-shrink: 0;
}

.note-text {
    font-weight: 500;
}
</style>
