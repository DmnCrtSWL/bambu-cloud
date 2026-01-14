import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useNotificationStore = defineStore('notifications', () => {
    const notifications = ref([]);
    const unreadCount = ref(0);

    const addNotification = (notification) => {
        // notification = { id, title, message, type: 'info'|'warning'|'success'|'error', detailsRoute: '', tag: '' }
        
        const newItem = {
            id: Date.now() + Math.random(),
            timestamp: new Date(),
            read: false,
            ...notification
        };

        notifications.value.unshift(newItem);
        unreadCount.value++;

        // Keep only last 20
        if (notifications.value.length > 20) {
            notifications.value.pop();
        }
    };

    const upsertNotification = (notification) => {
        // specific key to deduplicate
        if (!notification.tag) {
            addNotification(notification);
            return;
        }

        const index = notifications.value.findIndex(n => n.tag === notification.tag);
        
        if (index !== -1) {
            // Update existing
            const existing = notifications.value[index];
            
            // Move to top
            notifications.value.splice(index, 1);
            
            notifications.value.unshift({
                ...existing,
                ...notification,
                timestamp: new Date(),
                read: false // Mark as unread again since it's a new alert
            });
            
            if (existing.read) {
                unreadCount.value++;
            }
        } else {
            // Create new
            addNotification(notification);
        }
    };

    const markAsRead = (id) => {
        const note = notifications.value.find(n => n.id === id);
        if (note && !note.read) {
            note.read = true;
            unreadCount.value = Math.max(0, unreadCount.value - 1);
        }
    };

    const markAllRead = () => {
        notifications.value.forEach(n => n.read = true);
        unreadCount.value = 0;
    };

    const clearAll = () => {
        notifications.value = [];
        unreadCount.value = 0;
    };

    return {
        notifications,
        unreadCount,
        addNotification,
        upsertNotification,
        markAsRead,
        markAllRead,
        clearAll
    };
});
