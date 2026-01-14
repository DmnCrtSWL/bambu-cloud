<template>
  <!-- Headless Component: Logic Only -->
  <div class="hidden"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { authFetch } from '../../utils/authFetch';
import { useNotificationStore } from '../../stores/notifications';

const store = useNotificationStore();
let schedulerInterval;
let lastTriggeredTime = '';

const fetchAlerts = async () => {
    try {
        const res = await authFetch('/api/inventory/alerts');
        if (res.ok) {
            const alerts = await res.json();
            
            if (alerts.length === 0) return;

            // Generate message
            let message = '';
            if (alerts.length === 1) {
                message = `El insumo ${alerts[0].name} tiene bajo stock (${alerts[0].portionsRemaining} porciones).`;
            } else {
                const names = alerts.slice(0, 2).map(a => a.name).join(', ');
                const remaining = alerts.length - 2;
                message = `${names} y ${remaining > 0 ? remaining + ' más' : 'otros'} están por agotarse.`;
            }

            // Upsert notification using a unique tag
            store.upsertNotification({
                title: 'Alerta de Stock',
                message: message,
                type: 'warning',
                detailsRoute: '/admin/inventory',
                tag: 'stock-alert' // Unique tag to prevent stacking
            });
        }
    } catch (e) {
        console.error('Failed to fetch stock alerts', e);
    }
};

const checkSchedule = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Format: "H:M"
    const currentTimeStr = `${currentHour}:${currentMinute}`;
    
    // Define schedules: 7:00, 11:30, 16:00, 19:00
    const schedules = [
        { h: 7, m: 0 },
        { h: 11, m: 30 },
        { h: 16, m: 0 },
        { h: 19, m: 0 }
    ];

    const isScheduledTime = schedules.some(s => s.h === currentHour && s.m === currentMinute);

    if (isScheduledTime && lastTriggeredTime !== currentTimeStr) {
        lastTriggeredTime = currentTimeStr;
        fetchAlerts();
    }
};

onMounted(() => {
    // Check on mount initially so user doesn't miss out if they just logged in
    fetchAlerts();
    
    // Check schedule every 10 seconds to ensure we hit the minute
    schedulerInterval = setInterval(checkSchedule, 10000); 
});

onUnmounted(() => {
    if (schedulerInterval) clearInterval(schedulerInterval);
});
</script>

<style scoped>
.animate-bounce-in {
  animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideIn {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
