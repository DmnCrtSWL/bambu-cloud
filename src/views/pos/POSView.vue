<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useCartStore } from '../../stores/cart';
import { authFetch } from '../../utils/authFetch';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  DollarSign, 
  ChevronRight,
  ChevronLeft,
  PlusCircle,
  X,
  CheckCircle2,
  User,
  ShieldCheck,
  AlertCircle,
  ShoppingBag,
  // Product Icons
  Utensils, Coffee, Pizza, Beer, Wine, Cake, Croissant, Egg, Fish, Salad, Soup, IceCream, Cookie, Carrot, Apple, Banana, Cherry, Milk, Martini, Popcorn, Flame, Leaf, UtensilsCrossed, Citrus, GlassWater
} from 'lucide-vue-next';

// Icon Map
const AVAILABLE_ICONS = {
    Utensils, Coffee, Pizza, Beer, Wine, Cake, Croissant, Egg, Fish, Salad, Soup, IceCream, Cookie, Carrot, Apple, Banana, Cherry, Milk, Martini, Popcorn, Flame, Leaf, UtensilsCrossed, Citrus, GlassWater
};

const cartStore = useCartStore();
const menuItems = ref([]);
const customers = ref([]); // For autocomplete
const categories = ref([
    'Todos',
    'Desayunos',
    'Menú del Día',
    'Barra de Café',
    'Sandwiches',
    'Huevos Al Gusto',
    'Dulcería',
    'Bebidas'
]);
const activeCategory = ref('Todos');
const searchQuery = ref('');
const loading = ref(true);

// Pagination State
const currentPage = ref(1);
const itemsPerPage = 8;
const totalPages = computed(() => Math.ceil(filteredItems.value.length / itemsPerPage));

const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredItems.value.slice(start, end);
});

const getIconComponent = (item) => {
    if (item.icon && AVAILABLE_ICONS[item.icon]) {
        return AVAILABLE_ICONS[item.icon];
    }
    // Fallback by category
    const map = {
        'Desayunos': Egg,
        'Menú del Día': Utensils,
        'Barra de Café': Coffee,
        'Sandwiches': Utensils, 
        'Huevos Al Gusto': Egg,
        'Dulcería': Cake,
        'Bebidas': GlassWater
    };
    return map[item.category] || UtensilsCrossed;
};

const nextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++;
    }
};

const prevPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--;
    }
};

watch([activeCategory, searchQuery], () => {
    currentPage.value = 1;
});

// Modals State
const showCustomSaleModal = ref(false);
const showPaymentModal = ref(false);
const showVariationModal = ref(false);
const showConfirmationModal = ref(false); // New: Final confirmation
const showCXCModal = ref(false); // New: CXC Form

// Payment State
const selectedPaymentMethod = ref('');
const selectedProduct = ref(null);
const selectedOptions = ref({}); // { groupIndex: optionObject }

// Forms
const customSaleForm = ref({
  concept: '',
  quantity: 1,
  price: 0
});

const cxcForm = ref({
    customerName: '',
    customerPhone: '',
    authorizedBy: ''
});

// Autocomplete State
const filteredCustomers = computed(() => {
    if (!cxcForm.value.customerName) return [];
    const term = cxcForm.value.customerName.toLowerCase();
    return customers.value.filter(c => c.name.toLowerCase().includes(term));
});
const showAutocomplete = ref(false);

const paymentMethods = [
  { id: 'Efectivo', name: 'Efectivo', icon: DollarSign },
  { id: 'Tarjeta', name: 'Terminal Física', icon: CreditCard },
  { id: 'Transferencia', name: 'Transferencia', icon: ChevronRight },
  { id: 'Uber Eats', name: 'Uber Eats', icon: ShoppingBag },
  { id: 'CXC', name: 'Cuenta x Cobrar', icon: User },
  { id: 'Cortesía', name: 'Cortesía', icon: CheckCircle2 } 
];

const fetchInitialData = async () => {
    loading.value = true;
    try {
        const [menuRes, custRes] = await Promise.all([
            authFetch('/api/menu-items'),
            authFetch('/api/customers')
        ]);

        
        if (menuRes.ok) {
            const allItems = await menuRes.json();
            menuItems.value = allItems.filter(i => i.isActive);
        }
        if (custRes.ok) {
            customers.value = await custRes.json();
        }
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

onMounted(fetchInitialData);

const filteredItems = computed(() => {
  return menuItems.value.filter(item => {
    const matchesCategory = activeCategory.value === 'Todos' || item.category === activeCategory.value;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchesCategory && matchesSearch;
  });
});

const handleProductClick = (item) => {
    if (item.variations && item.variations.length > 0) {
        openVariationModal(item);
    } else {
        cartStore.addItem({
            id: item.id,
            name: item.name,
            baseName: item.name, // Ensure baseName is passed
            price: parseFloat(item.price),
            quantity: 1
        });
    }
};

// --- Variation Logic ---
const openVariationModal = (item) => {
    selectedProduct.value = item;
    selectedOptions.value = {};
    item.variations.forEach((group, index) => {
        if (group.options && group.options.length > 0) {
            selectedOptions.value[index] = group.options[0];
        }
    });
    showVariationModal.value = true;
};

const currentVariationPrice = computed(() => {
    if (!selectedProduct.value) return 0;
    let total = 0; 
    Object.values(selectedOptions.value).forEach(opt => {
        if (opt && opt.price) {
            total += parseFloat(opt.price);
        }
    });
    return total;
});

const addVariationsToCart = () => {
    if (!selectedProduct.value) return;
    const optionNames = Object.values(selectedOptions.value).map(o => o.name).join(', ');
    const fullName = `${selectedProduct.value.name} - ${optionNames}`;

    cartStore.addItem({ 
        id: `${selectedProduct.value.id}-${Date.now()}`, 
        name: fullName,
        baseName: selectedProduct.value.name, // Pass base name for lookup
        options: Object.values(selectedOptions.value).map(o => o.name), // Pass options list
        price: currentVariationPrice.value,
        quantity: 1,
        originalId: selectedProduct.value.id
    });

    showVariationModal.value = false;
    selectedProduct.value = null;
};

// --- Custom Sale ---
const addCustomSale = () => {
  if (!customSaleForm.value.concept || customSaleForm.value.price <= 0) return;
  cartStore.addCustomItem({
    id: Date.now(),
    name: customSaleForm.value.concept,
    quantity: customSaleForm.value.quantity,
    price: customSaleForm.value.price
  });
  customSaleForm.value = { concept: '', quantity: 1, price: 0 };
  showCustomSaleModal.value = false;
};

// --- Payment Logic ---
const selectPaymentMethod = (method) => {
    selectedPaymentMethod.value = method;
    
    if (method === 'CXC') {
        // Special flow for CXC
        showPaymentModal.value = false;
        cxcForm.value = { customerName: '', customerPhone: '', authorizedBy: '' };
        showCXCModal.value = true;
    } else {
        // Confirmation Flow
        showPaymentModal.value = false;
        showConfirmationModal.value = true;
    }
};

const confirmPayment = async () => {
    // Process Regular Payment
    await processSalesAPI({
        total: cartStore.total,
        paymentMethod: selectedPaymentMethod.value,
        customerName: cartStore.customer?.name || 'Venta en Barra',
        customerPhone: cartStore.customer?.phone || null,
        items: cartStore.items.map(item => ({
            productName: item.name,
            baseName: item.baseName, // Send base name
            options: item.options,   // Send options
            quantity: item.quantity,
            unitPrice: item.price,
            total: item.price * item.quantity,
            type: item.type, // Added to identify CXC payments
            metadata: item.metadata // Added to pass cxcId
        }))
    });
    showConfirmationModal.value = false;
};

const confirmCXC = async () => {
    if (!cxcForm.value.customerName) {
        alert('El nombre del cliente es obligatorio');
        return;
    }
    
    // Process CXC Payment
    await processCXCAPI({
        customerName: cxcForm.value.customerName,
        customerPhone: cxcForm.value.customerPhone,
        items: cartStore.items.map(item => ({
            productName: item.name,
            baseName: item.baseName,
            options: item.options,
            notes: item.notes,
            quantity: item.quantity,
            unitPrice: item.price,
            total: item.price * item.quantity,
            type: item.type,
            metadata: item.metadata
        })),
        total: cartStore.total
    });
    showCXCModal.value = false;
};

// --- API Calls ---
const processSalesAPI = async (payload) => {
    try {
        const res = await authFetch('/api/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Failed to save sale');
        
        cartStore.clearCart();
        // Maybe toast success
    } catch (error) {
        console.error(error);
        alert('Error al registrar venta');
    }
};

const processCXCAPI = async (payload) => {
     try {
        const res = await authFetch('/api/cxc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Failed to save CXC');
        
        cartStore.clearCart();
        alert('Cuenta por cobrar registrada');
    } catch (error) {
        console.error(error);
        alert('Error al registrar CXC');
    }
};

// Autocomplete Handler
const selectCustomer = (customer) => {
    cxcForm.value.customerName = customer.name;
    cxcForm.value.customerPhone = customer.phone;
    showAutocomplete.value = false;
};
</script>

<template>
  <div class="pos-layout">
    <!-- Left Side: Catalog -->
    <div class="catalog-section">
      <div class="catalog-header">
        <h1 class="page-title">Catálogo</h1>
        <div class="search-bar">
          <Search size="18" />
          <input v-model="searchQuery" type="text" placeholder="Buscar producto..." />
        </div>
      </div>

      <div class="category-filters">
        <button 
          v-for="cat in categories" 
          :key="cat"
          class="filter-chip"
          :class="{ active: activeCategory === cat }"
          @click="activeCategory = cat"
        >
          {{ cat }}
        </button>
      </div>

      <div class="products-container">
            <div 
            v-for="item in paginatedItems" 
            :key="item.id" 
            class="product-card"
            @click="handleProductClick(item)"
            >
            <div class="product-icon">
                <component :is="getIconComponent(item)" size="32" stroke-width="1.5" />
            </div>
            <div class="product-info">
                <h3 class="product-name">{{ item.name }}</h3>
                <span class="product-price" v-if="!item.variations || item.variations.length === 0">${{ parseFloat(item.price).toFixed(2) }}</span>
                <span class="product-price text-muted" v-else>Opciones</span>
            </div>
            <div class="add-overlay">
                <Plus size="24" />
            </div>
            </div>
        </div>
        
        <!-- Pagination Controls -->
        <div v-if="totalPages > 1" class="pagination-controls">
            <button 
                class="pagination-btn" 
                :disabled="currentPage === 1"
                @click="prevPage"
            >
                <ChevronLeft size="24" />
                <span>Anterior</span>
            </button>
            <div class="page-indicator">
                Página {{ currentPage }} de {{ totalPages }}
            </div>
            <button 
                class="pagination-btn" 
                :disabled="currentPage === totalPages"
                @click="nextPage"
            >
                <span>Siguiente</span>
                <ChevronRight size="24" />
            </button>
        </div>
      </div>

    <!-- Right Side: Cart -->
    <div class="cart-section">
      <div class="cart-header">
        <div class="title-with-icon">
          <ShoppingCart size="20" />
          <h2>Carrito</h2>
        </div>
        <button class="custom-sale-btn" @click="showCustomSaleModal = true">
          <PlusCircle size="18" />
          <span>Venta Personalizada</span>
        </button>
      </div>

      <div class="cart-content">
        <div v-if="cartStore.items.length === 0" class="empty-cart">
          <div class="empty-icon">🛒</div>
          <p>Tu carrito está vacío</p>
          <span>Selecciona productos del catálogo</span>
        </div>

        <div v-else class="cart-items">
          <div v-for="(item, index) in cartStore.items" :key="index" class="cart-item">
            <div class="item-main">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-price">${{ (item.price * item.quantity).toFixed(2) }}</span>
            </div>
            <div class="item-controls">
              <div class="quantity-picker">
                <button @click="cartStore.updateQuantity(index, -1)"><Minus size="14" /></button>
                <span class="quantity">{{ item.quantity }}</span>
                <button @click="cartStore.updateQuantity(index, 1)"><Plus size="14" /></button>
              </div>
              <button class="delete-btn" @click="cartStore.removeItem(index)">
                <Trash2 size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="cart-footer">
        <button 
          class="pay-btn" 
          :disabled="cartStore.items.length === 0"
          @click="showPaymentModal = true"
        >
          <div class="pay-content">
             <span class="pay-label">Pagar Ahora</span>
             <span class="pay-amount">${{ cartStore.total.toFixed(2) }}</span>
          </div>
          <ChevronRight size="24" />
        </button>
      </div>
    </div>

    <!-- Payment Selection Modal -->
    <div v-if="showPaymentModal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3>Forma de Pago</h3>
          <button class="close-btn" @click="showPaymentModal = false">
            <X size="20" />
          </button>
        </div>
        <div class="modal-body payment-grid">
          <button 
            v-for="method in paymentMethods" 
            :key="method.id"
            class="payment-method-btn"
            @click="selectPaymentMethod(method.id)"
          >
            <component :is="method.icon" size="32" />
            <span>{{ method.name }}</span>
          </button>
        </div>
        <div class="payment-summary">
          <div class="total-label">Total a pagar:</div>
          <div class="total-value">${{ cartStore.total.toFixed(2) }}</div>
        </div>
      </div>
    </div>

    <!-- Final Confirmation Modal -->
    <div v-if="showConfirmationModal" class="modal-overlay">
        <div class="modal-card confirm-modal">
            <div class="check-icon-large">
                <CheckCircle2 size="64" />
            </div>
            <h3>¿Cerrar Orden?</h3>
            <p>Se registrará el pago de <strong>${{ cartStore.total.toFixed(2) }}</strong> en <strong>{{ selectedPaymentMethod }}</strong>.</p>
            
            <div class="modal-footer confirm-footer">
                <button class="btn-cancel big-btn" @click="showConfirmationModal = false">Cancelar</button>
                <button class="btn-confirm big-btn" @click="confirmPayment">¡Sí, Cerrar!</button>
            </div>
        </div>
    </div>

    <!-- CXC Form Modal -->
    <div v-if="showCXCModal" class="modal-overlay">
         <div class="modal-card">
            <div class="modal-header">
                <h3>Cuenta por Cobrar</h3>
                 <button class="close-btn" @click="showCXCModal = false">
                    <X size="20" />
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group relative">
                    <label>Nombre del Cliente</label>
                    <input 
                        v-model="cxcForm.customerName" 
                        type="text" 
                        placeholder="Buscar cliente..." 
                        @focus="showAutocomplete = true"
                        @input="showAutocomplete = true"
                    />
                    <!-- Autocomplete Dropdown -->
                    <div v-if="showAutocomplete && filteredCustomers.length > 0" class="autocomplete-list">
                        <div 
                            v-for="c in filteredCustomers" 
                            :key="c.id" 
                            class="autocomplete-item"
                            @click="selectCustomer(c)"
                        >
                            {{ c.name }} <small>({{ c.phone }})</small>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Teléfono (Opcional)</label>
                    <input v-model="cxcForm.customerPhone" type="text" placeholder="55..." />
                </div>

                 <div class="total-review">
                    Total a deuda: <strong>${{ cartStore.total.toFixed(2) }}</strong>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel" @click="showCXCModal = false">Cancelar</button>
                <button class="btn-confirm" @click="confirmCXC">Guardar Deuda</button>
            </div>
         </div>
    </div>

    <!-- Variations Modal (Existing) -->
    <div v-if="showVariationModal && selectedProduct" class="modal-overlay">
        <div class="modal-card wide-modal">
            <div class="modal-header">
                <h3>{{ selectedProduct.name }}</h3>
                <button class="close-btn" @click="showVariationModal = false"><X size="24" /></button>
            </div>
            <div class="modal-body variation-body">
                <div v-for="(group, gIndex) in selectedProduct.variations" :key="gIndex" class="variation-group">
                    <h4>{{ group.name }}</h4>
                    <div class="options-grid">
                        <div 
                            v-for="(option, oIndex) in group.options" 
                            :key="oIndex"
                            class="option-btn"
                            :class="{ active: selectedOptions[gIndex] && selectedOptions[gIndex].name === option.name }"
                            @click="selectedOptions[gIndex] = option"
                        >
                            <span class="opt-name">{{ option.name }}</span>
                            <span class="opt-price">${{ option.price }}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer variation-footer">
                <div class="price-preview">Total: <span>${{ currentVariationPrice.toFixed(2) }}</span></div>
                 <button class="btn-confirm big-btn" @click="addVariationsToCart">Agregar al Pedido</button>
            </div>
        </div>
    </div>

    <!-- Custom Sale Modal (Existing) -->
     <div v-if="showCustomSaleModal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3>Venta Personalizada</h3>
          <button class="close-btn" @click="showCustomSaleModal = false">
            <X size="20" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Concepto / Artículo</label>
            <input v-model="customSaleForm.concept" type="text" placeholder="Ej. Servicio Extra" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Cantidad</label>
              <input v-model.number="customSaleForm.quantity" type="number" min="1" />
            </div>
            <div class="form-group">
              <label>Precio Unitario</label>
              <div class="input-with-icon">
                <span>$</span>
                <input v-model.number="customSaleForm.price" type="number" step="0.01" />
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showCustomSaleModal = false">Cancelar</button>
          <button class="btn-confirm" @click="addCustomSale">Agregar al Carrito</button>
        </div>
      </div>
    </div>

    <!-- Mobile Restriction Overlay -->
    <div class="mobile-restriction">
        <div class="restriction-content">
            <div class="monitor-icon">🖥️</div>
            <h2>Dispositivo no compatible</h2>
            <p>El sistema de Punto de Venta (POS) requiere una pantalla más grande o una tablet para operar correctamente.</p>
            <button class="back-btn" @click="$router.push('/')">Ir al Panel Admin</button>
        </div>
    </div>

  </div>
</template>

<style scoped>
/* Mobile Restriction */
.mobile-restriction {
    display: none; /* Hidden by default */
    position: fixed;
    inset: 0;
    background: var(--bg-app);
    z-index: 9999;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
}

.restriction-content {
    background: white;
    padding: 2rem;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    max-width: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.monitor-icon { font-size: 3rem; margin-bottom: 0.5rem; }

.restriction-content h2 {
    color: var(--text-main);
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
}

.restriction-content p {
    color: var(--text-muted);
    line-height: 1.5;
    margin: 0;
}

.back-btn {
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-weight: 600;
    cursor: pointer;
}

@media (max-width: 1024px) {
    /* Show only on strictly mobile/small tablet screens if desired, user asked for "small screens" */
    /* Adjust breakpoint as needed, usually 768px or 1024px for tablet requirement */
}

@media (max-width: 768px) {
    .mobile-restriction {
        display: flex;
    }
}

/* Reusing previous styles and adding new ones */
.pos-layout {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 1.5rem;
  height: calc(100vh - 110px);
  overflow: hidden;
}

/* ... existing styles for catalog and cart ... */
.catalog-section { display: flex; flex-direction: column; gap: 1.5rem; overflow: hidden; padding-bottom: 1rem; }
.catalog-header { display: flex; justify-content: space-between; align-items: center; }
.search-bar { display: flex; align-items: center; gap: 0.5rem; background: var(--bg-surface); border: 1px solid var(--border-color); padding: 0.5rem 1rem; border-radius: var(--radius-md); width: 300px; }
.search-bar input { border: none; background: transparent; width: 100%; outline: none; font-family: inherit; }
.category-filters { display: flex; gap: 0.75rem; overflow-x: auto; padding-bottom: 0.5rem; }
.category-filters::-webkit-scrollbar { height: 6px; }
.category-filters::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
.filter-chip { padding: 0.6rem 1.4rem; border-radius: 3rem; border: 1px solid var(--border-color); background: white; color: var(--text-muted); white-space: nowrap; cursor: pointer; font-weight: 600; transition: all 0.2s; font-size: 0.95rem; flex-shrink: 0; }
.filter-chip.active { background: var(--color-primary); color: white; border-color: var(--color-primary); box-shadow: 0 4px 6px rgba(15, 118, 110, 0.2); }

/* Products Filter & Pagination */
.products-container {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1rem;
    overflow-y: auto;
    padding: 0.5rem;
    align-content: start;
}

.recipes-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); 
    gap: 1.5rem; 
    overflow-y: auto; 
    padding: 0.5rem; 
    flex: 1; /* Take remaining space */
}

.product-card { background: white; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 0.5rem; cursor: pointer; position: relative; transition: all 0.2s; aspect-ratio: 1 / 1; width: 100%; }
.product-card:hover { border-color: var(--color-primary); transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); }
.product-icon { width: 48px; height: 48px; background: #F0FDF4; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--color-primary); flex-shrink: 0; margin-bottom: 0.25rem; }
.product-name { font-size: 0.95rem; font-weight: 700; margin: 0; color: var(--text-main); line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; width: 100%; }
.product-price { font-size: 1.1rem; font-weight: 800; color: var(--color-primary); margin-top: 0; }
.text-muted { font-size: 0.9rem; color: #94a3b8; font-weight: 500; }
.add-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 118, 110, 0.1); display: flex; align-items: center; justify-content: center; opacity: 0; border-radius: var(--radius-lg); transition: opacity 0.2s; }
.product-card:hover .add-overlay { opacity: 1; }

/* Pagination Controls */
.pagination-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background: white;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    margin-top: auto;
}

.pagination-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.8rem 1.5rem;
    background: #f1f5f9;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 600;
    color: var(--text-main);
    transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
    background: var(--color-primary);
    color: white;
}

.pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.page-indicator {
    font-weight: 600;
    color: var(--text-muted);
    font-size: 1rem;
}


.cart-section { background: white; border-left: 1px solid var(--border-color); display: flex; flex-direction: column; border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); height: 100%; overflow: hidden; }
.cart-header { padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 1rem; flex-shrink: 0; }
.title-with-icon { display: flex; align-items: center; gap: 0.75rem; color: var(--text-main); }
.title-with-icon h2 { margin: 0; font-size: 1.25rem; }
.custom-sale-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; background: #F8FAFC; border: 1px dashed var(--color-primary); border-radius: var(--radius-md); color: var(--color-primary); font-weight: 600; cursor: pointer; transition: all 0.2s; }
.custom-sale-btn:hover { background: #F0FDF4; }
.cart-content { flex: 1; overflow-y: auto; padding: 1rem; min-height: 0; }
/* CSS Fixes: Convert camelCase to kebab-case */
.empty-cart { height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; color: var(--text-muted); }
.empty-icon { font-size: 3rem; margin-bottom: 1rem; }
.cart-items { display: flex; flex-direction: column; gap: 1rem; }
.cart-item { padding: 1rem; background: #F8FAFC; border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 0.75rem; border: 1px solid transparent; }
.cart-item:hover { border-color: #e2e8f0; }
.item-main { display: flex; justify-content: space-between; font-weight: 600; }
.item-name { font-size: 0.95rem; color: var(--text-main); }
.item-price { color: var(--text-main); }
.item-controls { display: flex; justify-content: space-between; align-items: center; }
.quantity-picker { display: flex; align-items: center; background: white; border-radius: 0.5rem; border: 1px solid var(--border-color); overflow: hidden; }
.quantity-picker button { padding: 0.4rem 0.6rem; background: transparent; border: none; cursor: pointer; color: var(--text-muted); }
.quantity-picker button:hover { color: var(--color-primary); background: #F0FDF4; }
.quantity { padding: 0 0.75rem; font-size: 0.85rem; font-weight: 700; }
.delete-btn { padding: 0.4rem; color: #ff6b6b; background: transparent; border: none; cursor: pointer; }
.cart-footer { padding: 1.5rem; border-top: 1px solid var(--border-color); background: #f8fafc; }

/* New Pay Button Style */
.pay-btn { 
    width: 100%; 
    display: flex; 
    align-items: center; 
    justify-content: space-between; 
    padding: 1rem 1.5rem; 
    background: var(--color-primary); 
    color: white; 
    border: none; 
    border-radius: var(--radius-md); 
    font-size: 1.1rem; 
    font-weight: 700; 
    cursor: pointer; 
    transition: all 0.2s; 
    box-shadow: 0 4px 6px rgba(15, 118, 110, 0.2); 
}
.pay-content { display: flex; flex-direction: column; align-items: flex-start; }
.pay-label { font-size: 0.9rem; opacity: 0.9; font-weight: 500; }
.pay-amount { font-size: 1.2rem; font-weight: 800; }

.pay-btn:hover:not(:disabled) { background: var(--color-primary-dark); transform: translateY(-2px); box-shadow: 0 6px 12px rgba(15, 118, 110, 0.3); }
.pay-btn:disabled { background: #cbd5e1; box-shadow: none; cursor: not-allowed; }

/* Modal Styles - Corrected */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-card { background: white; border-radius: var(--radius-lg); width: 100%; max-width: 500px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
.modal-card.wide-modal { max-width: 650px; }
.modal-header { padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { margin: 0; font-size: 1.25rem; }
.close-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; }
.modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
.variation-body { max-height: 60vh; overflow-y: auto; }
.variation-group { margin-bottom: 1rem; }
.variation-group h4 { margin-bottom: 0.75rem; font-size: 1rem; color: #475569; }
.options-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }
.option-btn { border: 2px solid #e2e8f0; padding: 1rem; border-radius: 12px; cursor: pointer; text-align: center; transition: all 0.2s; background: #f8fafc; display: flex; flex-direction: column; gap: 0.25rem; }
.option-btn:hover { border-color: #cbd5e1; }
.option-btn.active { border-color: var(--color-primary); background: #F0FDF4; color: var(--color-primary); }
.opt-name { font-weight: 600; font-size: 1rem; }
.opt-price { font-size: 0.9rem; color: #64748b; }
.modal-footer { padding: 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 1rem; align-items: center; }
.variation-footer { display: flex; justify-content: space-between; background: #f8fafc; }
.price-preview { font-size: 1.25rem; font-weight: 700; color: var(--text-main); }
.big-btn { padding: 0.8rem 2rem; font-size: 1.1rem; }
.btn-cancel { padding: 0.75rem 1.5rem; background: transparent; border: none; color: var(--text-muted); font-weight: 600; cursor: pointer; }
.btn-confirm { padding: 0.75rem 1.5rem; background: var(--color-primary); color: white; border: none; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; }
.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.input-with-icon { position: relative; display: flex; align-items: center; width: 100%; }
.input-with-icon span { position: absolute; left: 1rem; color: var(--text-muted); }
.input-with-icon input { padding-left: 2rem !important; }
.absolute-icon { position: absolute; left: 1rem; color: var(--color-primary); }
.p-left-2 { padding-left: 2.5rem !important; }
label { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
input { padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); font-family: inherit; font-size: 0.95rem; width: 100%; }
.payment-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
.payment-method-btn { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2rem; background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s; color: var(--color-primary); font-weight: 600; }
.payment-method-btn:hover { border-color: var(--color-primary); background: #F0FDF4; color: var(--color-primary); }
.payment-summary { background: #f8fafc; padding: 1.5rem; text-align: center; }
.total-label { font-size: 0.9rem; color: var(--text-muted); }
.total-value { font-size: 2rem; font-weight: 800; color: var(--color-primary); }

/* Confirmation Specific */
.confirm-modal { text-align: center; }
.check-icon-large { color: var(--color-primary); margin: 2rem 0 1rem; display: flex; justify-content: center; }
.confirm-modal h3 { font-size: 1.5rem; margin-bottom: 0.5rem; }
.confirm-modal p { color: var(--text-muted); font-size: 1.1rem; margin-bottom: 2rem; }
.confirm-footer { justify-content: center; gap: 1.5rem; }

/* Autocomplete */
.relative { position: relative; }
.autocomplete-list {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid var(--border-color);
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    max-height: 200px;
    overflow-y: auto;
    z-index: 50;
    box-shadow: var(--shadow-md);
}
.autocomplete-item {
    padding: 0.75rem 1rem;
    cursor: pointer;
    border-bottom: 1px solid #f1f5f9;
}
.autocomplete-item:hover { background: #f8fafc; }
.autocomplete-item small { color: #94a3b8; margin-left: 0.5rem; }
.total-review { margin-top: 1rem; font-size: 1.1rem; text-align: right; }
</style>
