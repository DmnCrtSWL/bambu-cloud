
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useCartStore = defineStore('cart', () => {
    const items = ref([]);
    const customer = ref(null); // { name, phone }

    const total = computed(() => {
        return items.value.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    });

    const addItem = (product) => {
        const existing = items.value.find(i => i.id === product.id && !i.isCustom);
        if (existing) {
            existing.quantity++;
        } else {
            items.value.push({
                id: product.id,
                name: product.name,
                baseName: product.baseName,
                price: parseFloat(product.price),
                quantity: product.quantity || 1,
                isCustom: false,
                type: product.type,
                metadata: product.metadata,
                options: product.options || [],
                notes: product.notes || ''
            });
        }
    };

    const addCustomItem = (item) => {
        items.value.push({
            ...item,
            price: parseFloat(item.price),
            isCustom: true
        });
    };

    // Used for loading order items from Kitchen
    const setItems = (newItems) => {
        if (!Array.isArray(newItems)) {
            console.error('setItems received invalid data:', newItems);
            return;
        }
        // items from DB order might need mapping
        // Expecting: { productName, unitPrice, quantity }
        items.value = newItems.map((i, index) => ({
            id: Date.now() + index + Math.random(), // Ensure uniqueness
            name: i.productName || 'Producto Desconocido',
            baseName: i.productName, // Fallback/Default
            price: parseFloat(i.unitPrice) || 0,
            quantity: parseFloat(i.quantity) || 1,
            isCustom: true,
            options: i.options || [], // Preserve options
            notes: i.notes || '',     // Preserve notes
            type: i.type || undefined // Preserve type if available
        }));
    };

    const updateQuantity = (index, delta) => {
        if (items.value[index]) {
            items.value[index].quantity += delta;
            if (items.value[index].quantity <= 0) {
                items.value.splice(index, 1);
            }
        }
    };

    const removeItem = (index) => {
        items.value.splice(index, 1);
    };

    const setCustomer = (cust) => {
        customer.value = cust;
    };

    const clearCart = () => {
        items.value = [];
        customer.value = null;
    };

    return {
        items,
        total,
        addItem,
        addCustomItem,
        setItems,
        updateQuantity,
        removeItem,
        clearCart,
        setCustomer,
        customer
    };
});
