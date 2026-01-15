<template>
  <Transition name="slide-up">
    <div v-if="showNotification" class="global-order-alert">
      <div class="alert-card">
        <div class="icon-section">
            <img src="/bamboo-divider-icon.png" alt="Icon" class="bambu-icon" />
        </div>
        <div class="content-section">
            <h3>¡Nuevo Pedido!</h3>
            <p>Orden #{{ lastOrderId }} recibida</p>
        </div>
        <div class="action-section">
            <button @click="goToOrders" class="view-btn">
                Ver Órdenes
            </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { authFetch } from '../../utils/authFetch';
import { useNotificationStore } from '../../stores/notifications';

const store = useNotificationStore();

const router = useRouter();
const lastOrderId = ref(null);
const showNotification = ref(false);
let pollInterval = null;
let dismissTimeout = null;

// Custom user sound
const notificationSound = new Audio('/alert.mp3');

const checkNewOrders = async () => {
  try {
    const res = await authFetch('/api/orders/latest/id');
    if (res.ok) {
      const data = await res.json();
      const currentId = data.id;

      if (lastOrderId.value === null) {
        lastOrderId.value = currentId;
        return;
      }

      if (currentId > lastOrderId.value) {
        const count = currentId - lastOrderId.value;
        lastOrderId.value = currentId;
        
        // Trigger Visual Alert (Always show for the latest batch)
        triggerAlert();

        // Aggregate Dropdown Notification
        // 1. Find existing
        const existingNote = store.notifications.find(n => n.tag === 'new-order');
        let newTotal = count;
        
        if (existingNote && existingNote.meta && existingNote.meta.count) {
             newTotal += existingNote.meta.count;
        }

        let message = `Orden #${currentId} recibida.`;
        if (newTotal > 1) {
            message = `Tienes +${newTotal} órdenes por atender`;
        } else {
             message = `Orden #${currentId} recibida.`;
        }

        store.upsertNotification({
            title: '¡Pedidos Nuevos!',
            message: message,
            type: 'info',
            detailsRoute: '/pos/orders',
            tag: 'new-order',
            meta: { count: newTotal } // Persist count for next aggregation
        });
      }
    }
  } catch (e) {
    console.error('Error polling:', e);
  }
};

const triggerAlert = () => {
    // 1. Play Sound
    try {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(e => console.warn('Audio blocked', e));
    } catch (e) {}

    // 2. Show Visual Alert
    showNotification.value = true;

    // 3. Auto dismiss after 5 seconds
    if (dismissTimeout) clearTimeout(dismissTimeout);
    dismissTimeout = setTimeout(() => {
        showNotification.value = false;
    }, 5000);
};

const goToOrders = () => {
    showNotification.value = false;
    router.push('/pos/orders');
};

onMounted(() => {
    checkNewOrders();
    pollInterval = setInterval(checkNewOrders, 5000);
});

onUnmounted(() => {
    if (pollInterval) clearInterval(pollInterval);
    if (dismissTimeout) clearTimeout(dismissTimeout);
});
</script>

<style scoped>
.global-order-alert {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    z-index: 9999;
    pointer-events: auto;
}

.alert-card {
    background: white;
    color: var(--color-primary);
    padding: 1rem 1.5rem;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 1.5rem;
    min-width: 320px;
    border: 2px solid var(--color-primary);
}

.icon-section {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9; /* Light gray circle */
    width: 48px;
    height: 48px;
    border-radius: 50%;
    flex-shrink: 0;
}

.bambu-icon {
    width: 24px;
    height: 24px;
    background-color: var(--color-primary);
    -webkit-mask: url('/bamboo-divider-icon.png') no-repeat center / contain;
    mask: url('/bamboo-divider-icon.png') no-repeat center / contain;
}

.content-section {
    flex: 1;
}

.content-section h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-primary);
}

.content-section p {
    margin: 0.2rem 0 0 0;
    font-size: 0.9rem;
    color: var(--text-muted);
    font-weight: 500;
}

.view-btn {
    background: var(--color-primary);
    color: white;
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 6px rgba(55, 97, 103, 0.2);
}

.view-btn:hover {
    background: var(--color-primary-dark);
    transform: translateY(-1px);
    box-shadow: 0 6px 12px rgba(55, 97, 103, 0.3);
}

.view-btn:active {
    transform: translateY(0);
}

/* Animations */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(50px) scale(0.9);
}
</style>
