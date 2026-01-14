<script setup>
import { computed } from 'vue';
import { useNotificationStore } from '../../stores/notifications'; // Corrected path
import { Clock, CheckCircle, Info, AlertTriangle, ArrowLeft, X } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const store = useNotificationStore();
const router = useRouter();

// Group notifications by date (Today, Yesterday, Older)
const groupedNotifications = computed(() => {
    const groups = {
        'Hoy': [],
        'Ayer': [],
        'Anteriores': []
    };

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    store.notifications.forEach(note => {
        const date = new Date(note.timestamp);
        if (date.toDateString() === today.toDateString()) {
            groups['Hoy'].push(note);
        } else if (date.toDateString() === yesterday.toDateString()) {
            groups['Ayer'].push(note);
        } else {
            groups['Anteriores'].push(note);
        }
    });

    return groups;
});

const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getIcon = (type) => {
    if (type === 'warning') return AlertTriangle;
    if (type === 'success') return CheckCircle;
    return Info;
};

const closeNotifications = () => router.push('/admin');
</script>

<template>
  <div class="notifications-view animate-fade-in">
    <header class="page-header">
        <h1>Notificaciones</h1>
        <button @click="closeNotifications" class="close-btn" title="Cerrar"><X size="24" /></button>
    </header>

    <div class="actions-bar" v-if="store.unreadCount > 0">
        <button @click="store.markAllRead" class="mark-read-btn">
            Marcar todas como leídas
        </button>
    </div>

    <div class="timeline-container">
        <template v-for="(notes, label) in groupedNotifications" :key="label">
            <div v-if="notes.length > 0" class="date-group">
                <h3 class="date-label">{{ label }}</h3>
                
                <div class="timeline">
                    <div 
                        v-for="note in notes" 
                        :key="note.id" 
                        class="timeline-item"
                        :class="{ 'unread': !note.read }"
                        @click="store.markAsRead(note.id)"
                    >
                        <div class="timeline-marker">
                            <component :is="getIcon(note.type)" size="16" />
                        </div>
                        <div class="timeline-content">
                            <div class="content-header">
                                <h4 class="title">{{ note.title }}</h4>
                                <span class="time">{{ formatTime(note.timestamp) }}</span>
                            </div>
                            <p class="message">{{ note.message }}</p>
                            <router-link 
                                v-if="note.detailsRoute" 
                                :to="note.detailsRoute" 
                                class="action-link"
                            >
                                Ver detalles →
                            </router-link>
                        </div>
                    </div>
                </div>
            </div>
        </template>

        <div v-if="store.notifications.length === 0" class="empty-state">
            <div class="empty-icon">🔔</div>
            <h3>No tienes notificaciones</h3>
            <p>Las alertas importantes aparecerán aquí.</p>
        </div>
    </div>
  </div>
</template>

<style scoped>
.notifications-view {
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
}

.page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
}

.close-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}
.close-btn:hover { color: var(--color-primary); }

.page-header h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-main);
    margin: 0;
}

.actions-bar {
    display: flex;
    justify-content: flex-end; /* Or flex-start? User didn't specify alignment, just position. Usually right aligned actions are good. */
    margin-bottom: 1.5rem;
}

.mark-read-btn {
    background: transparent;
    border: 1px solid var(--border-color);
    padding: 0.4rem 0.8rem;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--color-primary);
    transition: all 0.2s;
    background: var(--bg-surface);
}
.mark-read-btn:hover {
    background: #f0f9ff;
    border-color: var(--color-primary);
}

.date-group {
    margin-bottom: 2rem;
}

.date-label {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-bottom: 1rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.timeline {
    border-left: 2px solid #e2e8f0;
    margin-left: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.timeline-item {
    position: relative;
    padding-left: 2rem;
    cursor: pointer;
    transition: transform 0.2s;
}

.timeline-item:hover {
    transform: translateX(4px);
}

.timeline-marker {
    position: absolute;
    left: -9px;
    top: 0;
    width: 16px;
    height: 16px;
    background: white;
    border: 2px solid #cbd5e1; /* Gray by default */
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    z-index: 2;
}

.unread .timeline-marker {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: #eff6ff;
}

.timeline-content {
    background: var(--bg-surface);
    padding: 1rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
}

.unread .timeline-content {
    border-left: 4px solid var(--color-primary);
}

.content-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
}

.title {
    font-weight: 600;
    color: var(--text-main);
    margin: 0;
}

.time {
    font-size: 0.8rem;
    color: #94a3b8;
}

.message {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    line-height: 1.5;
}

.action-link {
    font-size: 0.85rem;
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 500;
}
.action-link:hover { text-decoration: underline; }

.empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--text-muted);
}
.empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

.animate-fade-in {
    animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
