<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import AIChatWidget from '../../components/customer/AIChatWidget.vue';
import { 
    ShoppingBag, X, Minus, Plus, ChefHat, Search, ArrowRight, ArrowLeft, Clock, MapPin, CreditCard, Banknote, Smartphone, 
    Utensils, Coffee, Pizza, Cake, Croissant, Egg, Fish, Salad, Soup, IceCream, Cookie, Carrot, Apple, Banana, Cherry, Milk, Popcorn, Leaf, UtensilsCrossed, Copy, Citrus, GlassWater,
    Bot, ConciergeBell, Edit, Lock, Trash2, LayoutDashboard, Gauge, ShoppingCart, ArrowLeftRight, Sprout
} from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth';
import { useRouter } from 'vue-router';



import { authFetch } from '../../utils/authFetch';







// Available Icons Map
const AVAILABLE_ICONS = {
    Utensils, Coffee, Pizza, Cake, Croissant, Egg, Fish, Salad, Soup, IceCream, Cookie, Carrot, Apple, Banana, Cherry, Milk, Popcorn, Leaf, UtensilsCrossed, Citrus, GlassWater
};




// View State: 'MENU' | 'CHECKOUT'
const viewState = ref('MENU');
const menuItems = ref([]);
const categories = ref([]);
const activeCategory = ref('Todos');
const cart = ref([]);
const isCartOpen = ref(false); // Only used in MENU state
const loading = ref(true);
const searchTerm = ref('');
const showSuccessModal = ref(false);
const currentOrderId = ref(null);
const lastPaymentMethod = ref('');

// Checkout Form Data
const checkoutForm = ref({
    name: '',
    phone: '',
    countryCode: '+52',
    deliveryTime: '',
    deliveryLocation: 'Barra',
    customLocation: '',
    paymentMethod: 'Efectivo',
    notes: ''
});

const deliveryPoints = [
    'Barra',
    'Ludoteca',
    'Torniquetes Telcel',
    'Royal Canin',
    'Puerta Sanborns',
    'Puerta 4',
    'Escaleras City Market',
    'Recepción Lomas Estudio',
    'Otro'
];

const countryCodes = [
    { code: '+52', label: '🇲🇽 +52' },
    { code: '+1', label: '🇺🇸 +1' },
    { code: '+86', label: '🇨🇳 +86' },
    { code: '+81', label: '🇯🇵 +81' },
    { code: '+34', label: '🇪🇸 +34' },
    { code: '+33', label: '🇫🇷 +33' },
    { code: '+1', label: '🇨🇦 +1' }, // Duplicate code +1, label distinguishes
    { code: '+54', label: '🇦🇷 +54' },
    { code: '+57', label: '🇦🇷 +57' }
];

const authStore = useAuthStore();
const router = useRouter();
const isAdmin = computed(() => authStore.user?.role === 'Administrador');

const goToEditProduct = () => {
    if (selectedProduct.value) {
        router.push(`/admin/menu/${selectedProduct.value.id}/edit`);
    }
};

const toggleProductPrivacy = async () => {
    if (!selectedProduct.value) return;
    if (!confirm(`¿Estás seguro de ocultar "${selectedProduct.value.name}" del menú público? Pasará a ser Privado.`)) return;

    try {
        const res = await authFetch(`/api/menu-items/${selectedProduct.value.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...selectedProduct.value, isActive: false })
        });
        if (res.ok) {
            alert('Producto ocultado correctamente');
            showProductDetail.value = false;
            fetchMenu(); // Refresh grid
        } else {
            alert('Error al actualizar');
        }
    } catch (e) {
        console.error(e);
        alert('Error de red');
    }
};

const deleteProduct = async () => {
    if (!selectedProduct.value) return;
    if (!confirm(`¿Eliminar permanentemente "${selectedProduct.value.name}"? Esta acción no se puede deshacer.`)) return;

    try {
        const res = await authFetch(`/api/menu-items/${selectedProduct.value.id}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            alert('Producto eliminado');
            showProductDetail.value = false;
            fetchMenu(); // Refresh grid
        } else {
            alert('Error al eliminar');
        }
    } catch (e) {
        console.error(e);
        alert('Error de red');
    }
};



// Fetch menu items from API





const fetchMenu = async () => {
  try {
    const res = await fetch('/api/menu-items');
    if (!res.ok) throw new Error('Failed to fetch menu');
    const data = await res.json();
    // Only show active items
    menuItems.value = data.filter(item => item.isActive === true);
    
    // Extract unique categories
    const cats = new Set(data.map(item => item.category).filter(Boolean));
    
    // Time-based sorting logic
    const now = new Date();
    const currentHour = now.getHours();
    
    let featuredCategory = '';
    
    // 6:00 - 8:00 -> Barra de Café
    if (currentHour >= 6 && currentHour < 8) {
        featuredCategory = 'Barra de Café';
    } 
    // 8:00 - 11:00 -> Desayunos
    else if (currentHour >= 8 && currentHour < 11) {
        featuredCategory = 'Desayunos';
    }
    // 11:00 - 18:00 -> Menú del Día
    else if (currentHour >= 11 && currentHour < 18) {
        featuredCategory = 'Menú del Día';
    }
    // 18:00 - 20:00 -> Barra de Café
    else if (currentHour >= 18 && currentHour < 20) {
        featuredCategory = 'Barra de Café';
    }

    const sortedCats = [...cats].sort((a, b) => {
        // 1. Bebidas always last
        if (a === 'Bebidas') return 1;
        if (b === 'Bebidas') return -1;

        // 2. Featured Category always first
        if (a === featuredCategory) return -1;
        if (b === featuredCategory) return 1;

        // 3. Default alphabetical or insertion order
        return 0;
    });
    categories.value = ['Todos', ...sortedCats];
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};


onMounted(() => {
    fetchMenu();
    // Default time: Now + 20 mins
    const date = new Date();
    date.setMinutes(date.getMinutes() + 20);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    checkoutForm.value.deliveryTime = `${hours}:${minutes}`;
});

// --- MENU DEL DIA LOGIC ---
const isLunchTime = computed(() => {
    const hour = new Date().getHours();
    return hour >= 11 && hour < 18;
});

const bambuPackage = computed(() => menuItems.value.find(i => i.name === 'Paquete Bambú'));

const bambuDerivedItems = computed(() => {
    const pkg = bambuPackage.value;
    if (!pkg) return [];

    const getOpts = (name) => pkg.variations?.find(v => v.name === name)?.options || [];

    return [
        {
            ...pkg, 
            id: 'virtual-sopa', 
            name: 'Sopa del Día',
            price: 39,
            description: 'La entrada perfecta, servida calientita.',
            icon: 'Soup',
            variations: [{ name: 'Opción', options: getOpts('Sopa') }],
             category: 'Menú del Día'
        },
        {
             ...pkg,
            id: 'virtual-plato',
            name: 'Plato Fuerte',
            price: 79,
            description: 'El sabor casero que te encanta.',
            icon: 'Utensils',
            // Patching options in UI as requested: Base options + Premium options
            variations: [{ 
                name: 'Opción', 
                options: [
                    { name: 'Fajitas de Pollo', price: 0 },
                    { name: 'Ensalada de Pescado', price: 0 },
                    ...getOpts('Plato Fuerte')
                ] 
            }],
             category: 'Menú del Día'
        },
        {
             ...pkg,
            id: 'virtual-agua',
            // Dynamic name: "Agua de [Flavor]"
            name: getOpts('Agua')[0]?.name || 'Agua del Día', 
            price: 19,
            description: 'Frescura natural para acompañar.',
            icon: 'GlassWater',
            variations: [],
             category: 'Menú del Día'
        }
    ];
});




// Filter logic
// Filter logic (Grouped for Mosaic Layout)
const filteredItems = computed(() => {
  let items = menuItems.value;
  
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    items = items.filter(item => item.name.toLowerCase().includes(term));
  }

  // If specific category selected, just return that group
  if (activeCategory.value !== 'Todos') {
    const filtered = items.filter(item => item.category === activeCategory.value);
    return filtered.length ? [{ name: activeCategory.value, items: filtered }] : [];
  }

  // If 'Todos', group by category
  // Use the order from 'categories.value' (excluding 'Todos') to maintain sort order if desired, 
  // or just unique categories present in 'items'
  const groups = [];
  // Use pre-computed categories list (minus 'Todos') to ensure consistent order
  const catsToIterate = categories.value.filter(c => c !== 'Todos');

  catsToIterate.forEach(cat => {
      const catItems = items.filter(i => i.category === cat);
      if (catItems.length > 0) {
          groups.push({ name: cat, items: catItems });
      }
  });

  return groups;
});




// Product Detail State
const showProductDetail = ref(false);
const showChat = ref(false);
const selectedProduct = ref(null);
const modifiers = ref({}); 
const quantity = ref(1);
const productNotes = ref('');

const placeholderText = computed(() => {
    if (!selectedProduct.value) return 'Ej. Notas especiales...';
    
    const cat = selectedProduct.value.category;
    const lowerCat = cat?.toLowerCase() || '';

    if (lowerCat.includes('café') || lowerCat.includes('cafe')) {
        return 'Ej. Leche deslactosada, azúcar mascabado, extra caliente...';
    }
    if (lowerCat.includes('desayuno') || lowerCat.includes('huevo') || lowerCat.includes('chilaquiles')) {
        return 'Ej. Sin cebolla, salsa aparte, bien cocido...';
    }
    if (lowerCat.includes('sandwich') || lowerCat.includes('panini') || lowerCat.includes('baguette')) {
        return 'Ej. Sin mayonesa, partido a la mitad...';
    }
    if (lowerCat.includes('bebida') || lowerCat.includes('smoothie')) {
        return 'Ej. Sin hielo, poco jarabe...';
    }
    if (lowerCat.includes('dulce') || lowerCat.includes('postre') || lowerCat.includes('pan')) {
        return 'Ej. Calientito, para llevar...';
    }
    if (lowerCat.includes('menú del día') || lowerCat.includes('menu del dia')) {
        return 'Ej. Sin sopa, agua de jamaica...';
    }
    
    return 'Ej. Sin cebolla, aderezo aparte...';
});

// --- MODAL METHODS ---
const openProductDetails = (item) => {
    selectedProduct.value = item;
    quantity.value = 1;
    productNotes.value = '';
    modifiers.value = {};
    
    // Init modifiers if variable
    if (item.variations && item.variations.length > 0) {
        item.variations.forEach(group => {
            if (group.options && group.options.length > 0) {
                modifiers.value[group.name] = group.options[0];
            }
        });
    }
    showProductDetail.value = true;
};

const currentUnitPrice = computed(() => {
    if (!selectedProduct.value) return 0;
    let total = Number(selectedProduct.value.price);
    
    Object.values(modifiers.value).forEach(opt => {
        if (opt && opt.price) total += Number(opt.price);
    });
    
    return total;
});

const addToOrder = () => {
    if (!selectedProduct.value) return;
    
    // Construct unique key/name
    let fullName = selectedProduct.value.name;
    const currentOptions = Object.entries(modifiers.value).map(([group, opt]) => opt.name);

    const newItem = {
        ...selectedProduct.value,
        name: fullName,
        baseName: selectedProduct.value.name, // Added for Inventory Logic consistency
        price: currentUnitPrice.value,
        originalId: selectedProduct.value.id,
        notes: productNotes.value,
        selectedOptions: currentOptions
    };
    
    // Check for existing matching item in cart
    const existing = cart.value.find(i => 
        i.originalId === newItem.originalId && 
        i.name === newItem.name && 
        i.price === newItem.price &&
        (i.notes || '') === (newItem.notes || '') &&
        JSON.stringify(i.selectedOptions) === JSON.stringify(newItem.selectedOptions)
    );
    
    if (existing) {
        existing.quantity += quantity.value;
    } else {
        cart.value.push({ ...newItem, quantity: quantity.value });
    }
    
    showProductDetail.value = false;
    selectedProduct.value = null;
    // Feedback?
};

const updateModalQuantity = (delta) => {
    const newVal = quantity.value + delta;
    if (newVal >= 1) quantity.value = newVal;
};

const updateQuantity = (id, delta) => {
  const item = cart.value.find(i => i.id === id);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      cart.value = cart.value.filter(i => i.id !== id);
    }
  }
};

const cartTotal = computed(() => {
  return cart.value.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
});

const cartCount = computed(() => {
  return cart.value.reduce((sum, item) => sum + item.quantity, 0);
});

const proceedToCheckout = () => {
    isCartOpen.value = false;
    viewState.value = 'CHECKOUT';
    window.scrollTo(0,0);
};

const submitOrder = async () => {
    // Validation
    const f = checkoutForm.value;
    if (!f.name?.trim()) return alert('El nombre es obligatorio');
    if (!f.phone?.trim()) return alert('El teléfono es obligatorio');
    // Basic length check for 10 digits (ignoring country code for the check, user enters 10 digits in input)
    if (f.phone.replace(/\D/g, '').length !== 10) return alert('El teléfono debe tener 10 dígitos');

    if (!f.deliveryTime) return alert('La hora de entrega es obligatoria');
    if (!f.deliveryLocation) return alert('Elige un punto de entrega');
    if (f.deliveryLocation === 'Otro' && !f.customLocation?.trim()) return alert('Especifica el punto de entrega');
    if (!f.paymentMethod) return alert('Elige una forma de pago');

    try {
        const finalLocation = f.deliveryLocation === 'Otro' ? f.customLocation : f.deliveryLocation;

        const orderData = {
            customerName: f.name,
            customerPhone: f.phone,
            deliveryTime: f.deliveryTime,
            deliveryLocation: finalLocation,
            paymentMethod: f.paymentMethod,
            notes: f.notes,
            items: cart.value.map(item => ({
                productName: item.name,
                quantity: item.quantity,
                unitPrice: item.price,
                total: item.quantity * item.price,
                notes: item.notes || '',
                options: item.selectedOptions || []
            })),
            total: cartTotal.value
        };

        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (res.ok) {
            const newOrder = await res.json();
            currentOrderId.value = newOrder.id;
            lastPaymentMethod.value = f.paymentMethod;
            
            cart.value = [];
            viewState.value = 'MENU';
            // Reset to defaults
            checkoutForm.value = { 
                ...checkoutForm.value, 
                notes: '', 
                paymentMethod: 'Efectivo', 
                deliveryLocation: 'Barra',
                name: '',
                phone: '' 
            };
            showSuccessModal.value = true;
        } else {
            alert('Error al enviar el pedido');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
};

const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
        alert('Número de cuenta copiado');
    });
};

const currency = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

const getPriceDisplay = (item) => {
    // If variable, check variations
    if (item.variations && item.variations.length > 0) {
        return 'Desde ' + currency(getMinPrice(item));
    }
    // Default to base price for simple items (fallback for when type is missing)
    return currency(Number(item.price) || 0);
};

const getMinPrice = (item) => {
    if (item.type === 'simple' || !item.variations || item.variations.length === 0) {
        return Number(item.price);
    }
    
    // For variable items, start with base price (usually 0)
    let min = Number(item.price);

    // Add min price of each required variation group
    // Assuming all groups shown are required for the "start at" price logic 
    // or we just find the cheapest option in each group that acts as a "base" selection.
    item.variations.forEach(group => {
        if (group.options && group.options.length > 0) {
             // Find cheapest option in this group
             const cheapest = group.options.reduce((minOpt, curr) => {
                 return Number(curr.price) < Number(minOpt.price) ? curr : minOpt;
             }, group.options[0]);
             
             min += Number(cheapest.price);
        }
    });

    return min;
};

const getIconComponent = (item) => {
    if (item.icon && AVAILABLE_ICONS[item.icon]) {
        return AVAILABLE_ICONS[item.icon];
    }
    // Fallback by category
    const map = {
        'Desayunos': Egg,
        'Menú del Día': Utensils,
        'Barra de Café': Coffee,
        'Sandwiches': Utensils, // Sandwich icon was removed? fallback
        'Huevos Al Gusto': Egg,
        'Dulcería': Cake,
        'Bebidas': GlassWater // Updated from Wine

    };
    return map[item.category] || UtensilsCrossed;
};
</script>

<template>
  <div class="menu-layout">
    
    <!-- === VIEW: MENU === -->
    <div v-show="viewState === 'MENU'">
        <!-- Header -->
        <header class="menu-header">
        <div class="brand">
            <img src="/logo-bambu.png" alt="Bambú Lomas" class="brand-logo" />
        </div>




        
        <div class="header-actions">
            <!-- 1. Admin Switch -->
            <router-link v-if="isAdmin" to="/admin" class="admin-dash-icon" title="Ir al Panel de Administración">
                <ArrowLeftRight :size="24" />
            </router-link>

            <!-- 2. Waiter Button -->
            <button class="waiter-btn" @click="showChat = true">
                <ConciergeBell size="20" />
                <span class="waiter-text">Mesero en Línea</span>
            </button>

            <!-- 3. Cart Button -->
            <button class="cart-btn" @click="isCartOpen = true">
                <ShoppingCart size="24" />
                <span class="badge" v-if="cartCount > 0">{{ cartCount }}</span>
            </button>
        </div>


        </header>

        <!-- Categories & Search -->
        <div class="filters-container">
        <div class="search-bar">
            <Search size="18" class="search-icon" />
            <input type="text" placeholder="Buscar platillo..." v-model="searchTerm">
        </div>
        
        <div class="categories-scroll">
            <button 
            v-for="cat in categories" 
            :key="cat"
            class="cat-chip"
            :class="{ active: activeCategory === cat }"
            @click="activeCategory = cat"
            >
            {{ cat }}
            </button>
        </div>
        </div>

        <!-- Menu Sections (Mosaic Layout) -->
        <div class="menu-sections">
            <template v-for="(group, index) in filteredItems" :key="group.name">
                <div v-if="index > 0" class="section-divider">
                    <span class="divider-line"></span>
                    <div class="divider-icon-wrapper">
                        <div class="divider-icon-masked"></div>
                    </div>
                    <span class="divider-line"></span>
                </div>

                <!-- SPECIAL LAYOUT: Menú del Día (Lunch Time) -->
                <!-- SPECIAL LAYOUT: Menú del Día (Lunch Time) -->
                <section v-if="group.name === 'Menú del Día' && isLunchTime" class="category-section bambu-section">
                     <!-- Removed header row badge, putting it inside card -->
                     <h2 class="category-title" style="margin-bottom:1.5rem;">{{ group.name }}</h2>

                     <div class="bambu-container">
                        <!-- Featured Package -->
                        <div v-if="bambuPackage" class="bambu-featured-card" @click="openProductDetails(bambuPackage)">
                            <div class="time-badge-card">
                                <Clock size="14" stroke-width="3" />
                                <span>HORA DE COMER</span>
                            </div>
                            <div class="bambu-content">
                                <div class="bambu-icon-wrapper-white">
                                     <component :is="getIconComponent(bambuPackage)" size="70" stroke-width="1.5" />
                                </div>
                                <div class="bambu-text">
                                    <h3>{{ bambuPackage.name }}</h3>
                                    <p>{{ bambuPackage.description }}</p>
                                </div>
                                <div class="bambu-footer">
                                    <span class="bambu-price">{{ getPriceDisplay(bambuPackage) }}</span>
                                    <button class="add-btn-large-bambu">
                                        ¡Ordenar Paquete!
                                        <ArrowRight size="18" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Side Stack -->
                        <div class="bambu-side-stack">
                            <h3 class="side-stack-title">Pide por separado</h3>
                            <div 
                                v-for="item in bambuDerivedItems" 
                                :key="item.id" 
                                class="side-item-card"
                                @click="openProductDetails(item)"
                            >
                                <div class="side-item-left">
                                     <component :is="getIconComponent(item)" size="28" stroke-width="1.5" />
                                     <div class="side-item-info">
                                         <h4>{{ item.name }}</h4>
                                         <span class="side-price">{{ currency(item.price) }}</span>
                                     </div>
                                </div>
                                <button class="add-btn-mini">
                                    <Plus size="20" />
                                </button>
                            </div>
                        </div>
                     </div>
                </section>

                <!-- STANDARD LAYOUT -->
                <section v-else class="category-section">
                    <h2 class="category-title">{{ group.name }}</h2>
                    
                    <div class="category-grid">
                        <div 
                            v-for="(item, index) in group.items" 
                            :key="item.id" 
                            class="menu-card"
                            :class="{ 'featured-card': index === 0 }"
                            @click="openProductDetails(item)"
                        >
                            <!-- Feature Card Layout (First Item) -->
                            <div v-if="index === 0" class="feature-layout">
                                <div class="feature-image">
                                    <component :is="getIconComponent(item)" size="60" stroke-width="1.5" />
                                </div>
                                <div class="feature-content">
                                    <div class="feature-header">
                                        <h3>{{ item.name }}</h3>
                                        <span class="price-tag">{{ getPriceDisplay(item) }}</span>
                                    </div>
                                    <p class="feature-desc">{{ item.description }}</p>
                                    <button class="feature-add-btn">
                                        Agregar <Plus size="18" />
                                    </button>
                                </div>
                            </div>

                            <!-- Standard Card Layout -->
                            <div v-else class="standard-layout">
                                <div class="card-icon-area">
                                     <!-- Smaller icon for standard cards -->
                                    <component :is="getIconComponent(item)" size="40" stroke-width="1.5" />
                                </div>
                                <div class="card-details">
                                    <h3 class="card-title-truncate">{{ item.name }}</h3>
                                    <div class="card-action-row">
                                        <span class="price-tag">{{ getPriceDisplay(item) }}</span>
                                        <button class="card-add-btn-small">
                                            <Plus size="24" stroke-width="2.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </template>
            
            <div v-if="filteredItems.length === 0" class="no-results">
                <Search size="48" />
                <p>No encontramos nada con ese nombre.</p>
            </div>
        </div>


        <!-- Cart Drawer (Menu Mode) -->
        <div v-if="isCartOpen" class="cart-overlay" @click.self="isCartOpen = false">
            <div class="cart-drawer">
                <div class="cart-header">
                <h2>Tu Orden</h2>
                <button class="close-modal-btn" @click="isCartOpen = false" style="position: static; margin-left: auto;">
                    <X size="24" />
                </button>
                </div>

                <div class="cart-items" v-if="cart.length > 0">
                    <div v-for="item in cart" :key="item.id" class="cart-item">
                        <div class="cart-item-details">
                            <span class="item-name">{{ item.name }}</span>
                            <ul v-if="item.selectedOptions && item.selectedOptions.length > 0" class="item-options-list">
                                <li v-for="opt in item.selectedOptions" :key="opt">- {{ opt }}</li>
                            </ul>
                            <span class="item-price">{{ currency(item.price) }}</span>
                        </div>
                        <div class="qty-controls">
                        <button class="circle-btn small-btn" @click="updateQuantity(item.id, -1)">
                            <span style="font-size: 18px; color: var(--color-primary); font-weight: 700; line-height: 1;">&minus;</span>
                        </button>
                        <span>{{ item.quantity }}</span>
                        <button class="circle-btn small-btn" @click="updateQuantity(item.id, 1)">
                             <span style="font-size: 18px; color: var(--color-primary); font-weight: 700; line-height: 1;">&plus;</span>
                        </button>
                        </div>
                    </div>
                </div>

                <div class="cart-empty" v-else>
                    <p>Tu carrito está vacío</p>
                </div>

                <div class="cart-footer" v-if="cart.length > 0">
                <div class="total-row">
                    <span>Total</span>
                    <span class="total-amount">{{ currency(cartTotal) }}</span>
                </div>
                <!-- Proceed Action -->
                <button class="checkout-btn" @click="proceedToCheckout">
                    Continuar
                    <ArrowRight size="20" />
                </button>
                </div>
            </div>
        </div>

         <!-- Sticky Bottom Cart Bar -->
        <div v-if="cartCount > 0 && !isCartOpen" class="sticky-cart-bar" @click="isCartOpen = true">
            <div class="cart-info">
                <span class="qty-badge">{{ cartCount }}</span>
                <span class="view-cart-text">Ver Pedido</span>
            </div>
            <span class="cart-total">{{ currency(cartTotal) }}</span>
        </div>


    </div>



    <!-- === VIEW: CHECKOUT === -->
    <div v-if="viewState === 'CHECKOUT'" class="checkout-view">
        <header class="checkout-header">
            <button class="back-btn" @click="viewState = 'MENU'">
                <ArrowLeft size="24" />
            </button>
            <h2>Finalizar Pedido</h2>
            <div class="spacer"></div>
        </header>

        <div class="checkout-container">
            <!-- Review Cart Summary -->
            <div class="section-card summary-card">
                <div class="summary-header">
                    <h3>Resumen</h3>
                    <span class="edit-link" @click="viewState = 'MENU'; isCartOpen = true">Editar</span>
                </div>
                <div class="summary-items">
                    <span class="summary-count">{{ cartCount }} productos</span>
                    <span class="summary-total">{{ currency(cartTotal) }}</span>
                </div>
            </div>

            <!-- 1. Contact Info -->
            <div class="section-card">
                <h3>Contacto</h3>
                <div class="form-group">
                    <label>Nombre</label>
                    <input type="text" v-model="checkoutForm.name" placeholder="Tu nombre completo" class="form-input">
                </div>
                <div class="form-group">
                    <label>Teléfono</label>
                    <div class="phone-input-group">
                        <select v-model="checkoutForm.countryCode" class="country-select">
                            <option v-for="c in countryCodes" :key="c.label" :value="c.code">{{ c.label }}</option>
                        </select>
                        <input 
                            type="tel" 
                            v-model="checkoutForm.phone" 
                            placeholder="Número" 
                            class="form-input" 
                            @input="e => checkoutForm.phone = e.target.value.replace(/[^0-9]/g, '')"
                        >
                    </div>
                </div>
            </div>

            <!-- 2. Delivery -->
            <div class="section-card">
                <h3>Entrega</h3>
                
                <div class="form-group">
                    <label class="icon-label"><Clock size="16"/> Hora de entrega</label>
                    <input type="time" v-model="checkoutForm.deliveryTime" class="form-input time-input">
                </div>

                <div class="form-group">
                    <label class="icon-label"><MapPin size="16"/> Punto de entrega</label>
                    <div class="chips-grid">
                        <button 
                            v-for="place in deliveryPoints" 
                            :key="place"
                            class="delivery-chip"
                            :class="{ active: checkoutForm.deliveryLocation === place }"
                            @click="checkoutForm.deliveryLocation = place"
                        >
                            {{ place }}
                        </button>
                    </div>
                    <div v-if="checkoutForm.deliveryLocation === 'Otro'" class="mt-2">
                        <input type="text" v-model="checkoutForm.customLocation" placeholder="Especifica referencia o dirección" class="form-input">
                    </div>
                </div>
            </div>

            <!-- 3. Payment -->
            <div class="section-card">
                <h3>Forma de Pago</h3>
                <div class="payment-grid">
                    <button 
                        class="payment-option"
                        :class="{ active: checkoutForm.paymentMethod === 'Efectivo' }"
                        @click="checkoutForm.paymentMethod = 'Efectivo'"
                    >
                        <Banknote size="24" />
                        <span>Efectivo</span>
                    </button>
                    <button 
                        class="payment-option"
                        :class="{ active: checkoutForm.paymentMethod === 'Terminal Física' }"
                        @click="checkoutForm.paymentMethod = 'Terminal Física'"
                    >
                        <CreditCard size="24" />
                        <span>Terminal Física</span>
                    </button>
                    <button 
                        class="payment-option"
                        :class="{ active: checkoutForm.paymentMethod === 'Transferencia' }"
                        @click="checkoutForm.paymentMethod = 'Transferencia'"
                    >
                        <Smartphone size="24" />
                        <span>Transfer</span>
                    </button>
                </div>
            </div>

            <!-- 4. Notes -->
            <div class="section-card">
                <h3>Notas (Opcional)</h3>
                <textarea v-model="checkoutForm.notes" rows="3" placeholder="Instrucciones especiales, alergias, etc." class="form-input"></textarea>
            </div>

            <!-- Submit Button (Stickyish) -->
            <div class="checkout-actions">
                <p class="legal-disclaimer">
                    Al hacer click, declaras que conoces y aceptas nuestro 
                    <router-link to="/privacy-policy" target="_blank">Aviso de Privacidad</router-link> 
                    y nuestros 
                    <router-link to="/terms-conditions" target="_blank">Términos y Condiciones</router-link>.
                </p>
                <button class="confirm-btn" @click="submitOrder">
                    Confirmar Pedido • {{ currency(cartTotal) }}
                </button>
            </div>
            
        </div>
    </div>


    <!-- Success Modal -->
     <div v-if="showSuccessModal" class="success-overlay">
         <div class="success-card">
            <div class="success-icon">🎉</div>
            <h2>¡Gracias, {{ checkoutForm.name || 'Cliente' }}!</h2>
            <p>Hemos recibido tu pedido correctamente.</p>
            <div class="order-id-display">Orden #{{ currentOrderId }}</div>
            
            <!-- Transfer Details -->
            <div v-if="lastPaymentMethod === 'Transferencia'" class="transfer-details">
                <h3>Datos de Transferencia</h3>
                <div class="bank-card">
                    <div class="bank-row">
                        <span class="label">Banco:</span>
                        <span class="value">Inbursa</span>
                    </div>
                    <div class="bank-row">
                        <span class="label">Beneficiario:</span>
                        <span class="value">Erika del Carmen Sánchez Ruíz</span>
                    </div>
                    <div class="bank-account-row">
                        <div class="account-info">
                            <span class="label">No. de Tarjeta</span>
                            <span class="account-number">4658 2856 0299 7169</span>
                        </div>
                        <button class="copy-btn" @click="copyToClipboard('4658285602997169')">
                            <Copy size="16" />
                            <span>Copiar</span>
                        </button>
                    </div>
                </div>
                <p class="transfer-hint">
                    Comparte tu comprobante al 
                    <a href="https://wa.me/5215513973872" target="_blank" class="whatsapp-link">
                        5513973872
                    </a>
                </p>
            </div>

            <p>Tu orden se entregará a las <strong>{{ checkoutForm.deliveryTime }}</strong> en <strong>{{ checkoutForm.deliveryLocation === 'Otro' ? checkoutForm.customLocation : checkoutForm.deliveryLocation }}</strong>.</p>
            <button class="primary-btn" @click="showSuccessModal = false">Pedir más</button>
        </div>
     </div>
     <!-- Configurator Modal -->
     <!-- Product Detail Modal (Uber Eats Style) -->
     <div v-if="showProductDetail && selectedProduct" class="modal-overlay" @click.self="showProductDetail = false">
        
         <!-- ADMIN FLOATING CONTROLS -->
        <div v-if="isAdmin" class="admin-floating-bar">
            <button class="admin-btn edit-btn" @click="goToEditProduct">
                <Edit :size="16" />
                <span>Editar</span>
            </button>
            <button class="admin-btn private-btn" @click="toggleProductPrivacy">
                <Lock :size="16" />
                <span>Privado</span>
            </button>
            <button class="admin-btn delete-btn" @click="deleteProduct">
                <Trash2 :size="16" />
            </button>
        </div>

        
        <div class="detail-modal">

            <button class="close-modal-btn" @click="showProductDetail = false">
                <X size="24" />
            </button>







            <!-- 1. Icono (Hero) -->
            <div class="modal-hero">
                <component :is="getIconComponent(selectedProduct)" :size="80" stroke-width="1" />
            </div>

            <div class="modal-body">
                <!-- 2. Nombre & 3. Descripcion -->
                <div class="product-header">
                    <h2>{{ selectedProduct.name }}</h2>
                    <p class="modal-desc">{{ selectedProduct.description }}</p>
                    
                    <!-- NEW LOCATION: Quantity Control -->
                    <div class="qty-control-inline">
                        <button class="circle-btn-small" @click="updateModalQuantity(-1)" :disabled="quantity <= 1">
                            <Minus size="20" />
                        </button>
                        <span class="qty-display-inline">{{ quantity }}</span>
                        <button class="circle-btn-small" @click="updateModalQuantity(1)">
                            <Plus size="20" />
                        </button>
                    </div>
                </div>

                <!-- 4. Grupo de Opciones -->
                <div v-if="selectedProduct.variations && selectedProduct.variations.length > 0" class="variations-stack">
                    <div v-for="(group, idx) in selectedProduct.variations" :key="idx" class="variation-group">
                        <div class="group-header">
                            <h3>{{ group.name }}</h3>
                            <span class="required-badge">Selecciona uno</span>
                        </div>
                        <div class="options-list">
                            <label 
                                v-for="opt in group.options" 
                                :key="opt.name" 
                                class="option-row"
                                :class="{ selected: modifiers[group.name]?.name === opt.name }"
                            >
                                <div class="opt-left">
                                    <input 
                                        type="radio" 
                                        :name="group.name + selectedProduct.id" 
                                        :value="opt" 
                                        v-model="modifiers[group.name]"
                                    >
                                    <span class="opt-name">{{ opt.name }}</span>
                                </div>
                                <span v-if="Number(opt.price) > 0" class="opt-price">+{{ currency(opt.price) }}</span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- 5. Notas especiales -->
                <div class="notes-section">
                    <h3>Notas de cocina</h3>
                    <textarea 
                        v-model="productNotes" 
                        :placeholder="placeholderText"
                        class="notes-input"
                        rows="3"
                    ></textarea>
                </div>
            </div>

            <!-- 6. Boton agregar (Sticky Footer) -->
            <!-- 6. Boton agregar (Sticky Footer) -->
            <div class="modal-footer">
                <button class="add-btn-large" @click="addToOrder">
                    <span>Agregar {{ quantity }}</span>
                    <span class="btn-total">{{ currency(currentUnitPrice * quantity) }}</span>
                </button>
            </div>
        </div>
     </div>

     <!-- AI Chat Widget -->
     <AIChatWidget 
        v-if="showChat" 
        :isOpen="showChat"
        @close="showChat = false"
        webhook-url="https://primary-production-4720.up.railway.app/webhook/ai-waiter" 
     />
  </div>
</template>

<style scoped>
.menu-layout {
  min-height: 100vh;
  background-color: #f8fafc;
  padding-bottom: 80px; /* Space for floaters */
}


/* --- SHARED STYLES --- */
.primary-btn {
    background: var(--color-primary);
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    border: none;
    font-weight: 700;
    width: 100%;
    margin-top: 1rem;
    font-size: 1rem;
    cursor: pointer;
}

/* --- MENU VIEW STYLES --- */
.menu-header {
  background: white;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: var(--color-primary);
  color: white;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-weight: 900;
  font-size: 1.2rem;
}

h1 {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-primary);
}

.icon-btn, .cart-btn {
  background: none;
  border: none;
  position: relative;
  color: var(--text-primary);
  cursor: pointer;
}

.header-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ef4444;
  color: white;
  font-size: 0.7rem;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: bold;
}

.filters-container {
  padding: 1rem 1.5rem;
  background: white;
  margin-bottom: 1rem;
}

.search-bar {
  display: flex;
  align-items: center;
  background: #f1f5f9;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  margin-bottom: 1rem;
}

.search-bar input {
  background: transparent;
  border: none;
  outline: none;
  margin-left: 0.5rem;
  width: 100%;
  font-size: 16px !important;
}

.categories-scroll {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  scrollbar-width: none;
  margin: 0 -1.5rem;
  padding: 0.5rem 1.5rem;
  width: calc(100% + 3rem);
}

.categories-scroll button { flex-shrink: 0; }

.cat-chip {
  padding: 0.5rem 1.25rem;
  background: #f1f5f9;
  border: none;
  border-radius: 20px;
  white-space: nowrap;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
}

.cat-chip.active {
  background: var(--color-primary);
  color: white;
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}

/* --- MOSAIC LAYOUT STYLES --- */
.menu-sections {
    padding: 0 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
}

.category-section {
    margin-bottom: 3rem;
}

.category-title {
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 1rem;
    color: var(--text-primary);
    border-left: 4px solid var(--color-primary);
    padding-left: 1rem;
}

.category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
    grid-auto-flow: dense; /* compacted */
}

.menu-card {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    cursor: pointer;
    transition: all 0.3s ease;
    border: 1px solid transparent;
    display: flex;
    flex-direction: column;
}

.menu-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 24px rgba(0,0,0,0.08);
}

/* --- FEATURE CARD (First Item) --- */
.featured-card {
    background: #fdfdfd; 
    border: 1px solid #f1f5f9;
}

/* Feature Layout Internal */
.feature-layout {
    display: flex;
    flex-direction: row;
    height: 100%;
    align-items: center;
    padding: 1.5rem;
    gap: 1.5rem;
}

.feature-image {
    width: 120px;
    height: 120px;
    background: #f8fafc;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--color-primary);
    flex-shrink: 0;
}

.feature-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.5rem;
}

.feature-header h3 {
    font-size: 1.25rem;
    font-weight: 800;
    margin-bottom: 0.25rem;
}

.feature-desc {
    font-size: 0.9rem;
    color: #64748b;
    line-clamp: 3;
    -webkit-line-clamp: 3;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-bottom: 1rem;
}

.feature-add-btn {
    align-self: flex-start;
    background: var(--color-primary);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: none;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
}

/* --- STANDARD CARD --- */
.standard-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.card-icon-area {
    padding: 1.5rem;
    display: flex;
    justify-content: center;
    color: var(--color-primary);
    background: #fafafa;
}

.card-details {
    padding: 1rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.card-title-truncate {
    font-size: 1rem;
    font-weight: 700;
    color: #334155;
    margin-bottom: 0.5rem;
    line-height: 1.2;
}

.card-action-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
}

.card-add-btn-small {
    /* width/height auto to fit icon only, removing fixed size circle */
    width: auto;
    height: auto;
    border-radius: 0;
    background: transparent; /* No background */
    color: var(--color-primary);
    border: none;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: transform 0.2s;
    padding: 0; /* Tight fit */
}
.card-add-btn-small:hover {
    background: transparent;
    color: var(--color-primary-dark);
    transform: scale(1.1);
}

/* --- DESKTOP GRID RULES --- */
@media (min-width: 1024px) {
    .category-grid {
        grid-template-columns: repeat(4, 1fr); /* 4 cols */
    }

    /* First item spans 2 cols and 2 rows */
    .featured-card {
        grid-column: span 2;
        grid-row: span 2;
    }
    
    /* Ensure feature layout is robust */
    .feature-layout {
        flex-direction: column; 
        text-align: center;
        justify-content: center;
    }
    
    .feature-add-btn {
        align-self: center;
    }
}
/* Adjust for super wide screens or keeping it row-based for feature? 
   User asked for "Title then card... and to the side more cards".
   Actually, "To the side" implies Flex Row or Grid where big card is left.
   Grid Column Span 2 (left) works.
   
   Refining Feature Layout for Desktop:
   If it spans 2x2, it's a big square.
   Let's keep text centered or left?
*/


/* --- MOBILE RESPONSIVE --- */
@media (max-width: 768px) {
    .category-grid {
        grid-template-columns: 1fr; /* Single col stack */
    }
    
    .feature-layout {
        flex-direction: row; /* Horizontal on mobile is nice? or stack? */
        padding: 1rem;
    }
    
    .feature-image { width: 80px; height: 80px; }
    
    .standard-layout {
        flex-direction: row; /* Horizontal small cards for mobile list view? */
        align-items: center;
    }
    
    .card-icon-area {
        width: 80px;
        padding: 0.5rem;
        background: transparent;
    }
    
    .card-details {
        padding: 0.5rem 1rem;
    }
}

/* --- MODAL (Desktop vs Mobile) --- */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.6);
    z-index: 999;
    display: flex;
    justify-content: center;
    align-items: center;
}

.detail-modal {
    background: white;
    width: 100%;
    max-width: 500px;
    height: 90vh; /* Default desktop almost full height */
    max-height: 800px;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}

/* Mobile Overrides (Fullscreen) */
@media (max-width: 768px) {
    .detail-modal {
        height: 100%;
        max-height: none;
        max-width: none;
        border-radius: 0;
    }
}

.close-modal-btn {
    position: absolute;
    top: 1rem;
    left: 1rem;
    width: 40px;
    height: 40px;
    background: transparent; /* No background */
    border: none;
    box-shadow: none; /* No shadow */
    z-index: 10;
    cursor: pointer;
    display: grid;
    place-items: center;
    color: var(--color-primary); /* Green X */
}

/* Hover effect for close button */
.close-modal-btn:hover {
    transform: none; /* No animation */
    opacity: 0.7;
}

.modal-hero {
    height: 200px;
    background: #f8fafc;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    color: var(--color-primary);
}

.modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    padding-bottom: 120px; /* Space for footer */
}

.product-header {
    margin-bottom: 2rem;
}

.product-header h2 {
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
    line-height: 1.1;
}

.modal-desc {
    color: #64748b;
    margin-bottom: 0.5rem;
}

.modal-price {
    font-size: 1.25rem;
    font-weight: 600;
    color: #0f172a;
}

.variation-group {
    margin-bottom: 1.5rem;
}

.group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    background: #f1f5f9;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
}

.group-header h3 {
    font-size: 1rem;
    font-weight: 700;
}

.required-badge {
    background: #333;
    color: white;
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 4px;
}

.options-list {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.option-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    border-bottom: 1px solid #f1f5f9;
    cursor: pointer;
}

.option-row:last-child { border-bottom: none; }

.opt-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.opt-left input[type="radio"] {
    width: 20px;
    height: 20px;
    accent-color: var(--color-primary);
}

.opt-name {
    font-size: 1rem;
    color: #334155;
}

.opt-price {
    font-weight: 600;
    color: #64748b;
}

.notes-input {
    width: 100%;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1rem;
    font-family: inherit;
    font-size: 1rem;
    outline: none;
    resize: none;
    background: #f8fafc;
}

.notes-input:focus {
    border-color: var(--color-primary);
    background: white;
}

/* Modal Footer */
.modal-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    padding: 1rem 1.5rem;
    box-shadow: 0 -4px 12px rgba(0,0,0,0.05);
    display: flex;
    gap: 1rem;
    align-items: center;
}

.qty-control {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: #f1f5f9;
    padding: 0.25rem 0.5rem;
    border-radius: 50px;
}

.circle-btn {
    width: 40px; /* Larger touch target */
    height: 40px;
    border-radius: 50%;
    border: 1px solid #e2e8f0; /* Subtle border or remove if preferred, keeping subtle for structure */
    background: white;
    color: var(--color-primary); /* Green icon */
    box-shadow: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s;
}

.circle-btn.small-btn {
    width: 32px;
    height: 32px;
    border: 1px solid #e2e8f0;
    /* Ensure it overrides any default button styles in cart */
    border-radius: 50% !important; 
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.circle-btn svg {
    /* Removed forceful styles to let props work */
}

.circle-btn:active {
    background: #f1f5f9;
    transform: scale(0.95);
}

.circle-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.qty-display {
    font-weight: 700;
    min-width: 20px;
    text-align: center;
}

.add-btn-large {
    flex: 1;
    background: var(--color-primary);
    color: white;
    border: none;
    padding: 1rem;
    border-radius: 12px;
    font-weight: 700;
    font-size: 1rem;
    display: flex;
    justify-content: space-between;
    cursor: pointer;
}

.add-btn {
  width: 100%;
  padding: 0.75rem;
  background: var(--bg-app);
  color: var(--color-primary);
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 48px;
  font-size: 1rem;
}

.add-btn:hover {
  background: var(--color-primary);
  color: white;
}

/* Cart Styles */
.cart-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 100;
  display: flex;
  justify-content: flex-end;
}

.cart-drawer {
  width: 100%;
  max-width: 400px;
  background: white;
  height: 100%;
  display: flex;
  flex-direction: column;
  animation: slideLeft 0.3s;
}

@keyframes slideLeft {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.cart-header {
  padding: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cart-items {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.qty-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #f8fafc;
  padding: 0.25rem;
  border-radius: 8px;
}

.qty-controls button {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: white;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.cart-footer {
  padding: 1.5rem;
  border-top: 1px solid #f1f5f9;
  background: white;
}

.total-row {
  display: flex;
  justify-content: space-between;
  font-size: 1.25rem;
  font-weight: 800;
  margin-bottom: 1rem;
}

.checkout-btn {
  width: 100%;
  padding: 1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 700;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}


/* --- CHECKOUT VIEW STYLES --- */
.checkout-header {
    background: white;
    padding: 1rem;
    display: flex;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1px solid #e2e8f0;
}

.back-btn {
    background: transparent;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
}

.checkout-header h2 {
    flex: 1;
    text-align: center;
    font-size: 1.1rem;
    font-weight: 700;
}
.spacer { width: 24px; }

.checkout-container {
    padding: 1.5rem;
    max-width: 600px;
    margin: 0 auto;
}

.section-card {
    background: white;
    border-radius: 16px;
    padding: 1.25rem;
    margin-bottom: 1.25rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.section-card h3 {
    font-size: 1rem;
    margin-bottom: 1rem;
    color: var(--text-primary);
}

.summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.edit-link {
    color: var(--color-primary);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
}

.summary-items {
    display: flex;
    justify-content: space-between;
    font-size: 1.1rem;
    font-weight: 700;
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 0.5rem;
}

.icon-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.form-input {
    width: 100%;
    padding: 0.875rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 16px !important;
    outline: none;
    transition: box-shadow 0.2s;
    font-family: inherit;
}

.form-input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
}

.chips-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.delivery-chip {
    padding: 0.6rem 1rem;
    background: #f1f5f9;
    border: 1px solid transparent;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    color: #475569;
    cursor: pointer;
}

.cart-item-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.item-options-list {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 0.85rem;
    color: #64748b;
    display: flex;
    flex-direction: column;
}

.phone-input-group {
    display: flex;
    gap: 0.5rem;
}

.country-select {
    padding: 0.875rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 16px !important;
    outline: none;
    font-family: inherit;
    min-width: 110px;
}

.delivery-chip.active {
    background: #eff6ff;
    border-color: var(--color-primary);
    color: var(--color-primary);
    font-weight: 600;
}

.payment-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
}

.payment-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 0.5rem;
    background: #f8fafc;
    border: 2px solid transparent;
    border-radius: 12px;
    cursor: pointer;
    color: #64748b;
}

.payment-option span {
    font-size: 0.8rem;
    font-weight: 600;
}

.payment-option.active {
    background: white;
    border-color: var(--color-primary);
    color: var(--color-primary);
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.mt-2 { margin-top: 0.75rem; }

.confirm-btn {
    background: var(--color-primary);
    color: white;
    padding: 1.25rem;
    width: 100%;
    font-size: 1.1rem;
    font-weight: 800;
    border: none;
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    cursor: pointer;
    transition: transform 0.1s;
}

.confirm-btn:active {
    transform: scale(0.98);
}

/* Success Modal & Overlays */
.success-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.8);
    z-index: 200;
    display: grid;
    place-items: center;
}

.success-card {
    background: white;
    padding: 2rem;
    border-radius: 24px;
    text-align: center;
    border-radius: 24px;
    text-align: center;
    width: 90%; /* Mobile First */
    max-width: 450px; /* Desktop */
}

.success-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
}

.sticky-cart-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--color-primary);
  color: white;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -4px 12px rgba(0,0,0,0.1);
  z-index: 50;
  cursor: pointer;
  animation: slideUp 0.3s ease-out;
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}



.admin-dash-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    padding: 8px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
    background: transparent;
}
.admin-dash-icon:hover {
    color: var(--color-primary-dark);
    transform: scale(1.1);
    background: rgba(var(--color-primary-rgb), 0.1);
}



.waiter-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--color-primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 99px; /* Pill shape */
  font-weight: 600;
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  /* box-shadow removed for flat look */
  transition: all 0.2s ease;
}


.waiter-btn:hover {
  background-color: var(--color-primary-dark);
  transform: translateY(-1px);
}

.waiter-btn:active {
  transform: translateY(0);
}

@media (max-width: 640px) {
  .waiter-text {
    display: none; /* Hide text on small screens, keep icon */
  }
  .waiter-btn {
    padding: 0.6rem;
    border-radius: 50%;
  }
}


.cart-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-primary);
    padding: 8px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
    background: transparent;
    border: none;
    position: relative;
    width: 40px;
    height: 40px;
}

.cart-btn:hover {
    color: var(--color-primary-dark);
    transform: scale(1.1);
    background: rgba(var(--color-primary-rgb), 0.1);
}

.cart-btn .badge {
    position: absolute;
    top: -2px;
    right: -2px;
    background: #ef4444; /* red-500 */
    color: white;
    font-size: 0.7rem;
    font-weight: 700;
    min-width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 99px;
    border: 2px solid white;
}


.cart-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.qty-badge {
  background: white;
  color: var(--color-primary);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 0.9rem;
}

.view-cart-text {
  font-weight: 700;
  font-size: 1.05rem;
}

.cart-total {
  font-weight: 800;
  font-size: 1.1rem;
}

@media (min-width: 768px) {
    .menu-grid {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
    .sticky-cart-bar {
      max-width: 400px;
      right: 1.5rem;
      left: auto;
      bottom: 1.5rem;
      border-radius: 16px;
      margin-inline: 0;
    }
}

/* --- MOBILE RESPONSIVE --- */
@media (max-width: 640px) {
  .menu-grid {
    grid-template-columns: 1fr; /* Single column */
    gap: 0.75rem;
  }

  .menu-card {
    flex-direction: row; /* Horizontal layout: Icon | Content */
    min-height: 120px; /* Ensure enough height */
    align-items: stretch; /* Stretch icon section */
  }

  .card-icon-header {
    width: 100px;
    height: auto; /* Full height */
    border-bottom: none;
    border-right: 1px solid #f1f5f9;
    flex-shrink: 0;
  }

  .icon-circle {
    width: 45px;
    height: 45px;
    /* Slightly smaller icon circle on mobile */
  }

  .card-content {
    padding: 0.75rem 1rem;
    justify-content: center;
  }

  .card-header {
    display: flex;
    flex-direction: column; /* Stack Name and Price for clarity */
    align-items: flex-start;
    gap: 0.25rem;
    margin-bottom: 0.25rem;
  }

  .card-header h3 {
    font-size: 1.1rem; /* Slightly larger name */
    margin-bottom: 0;
  }

  .price {
    font-size: 1rem;
    color: var(--color-primary);
    font-weight: 700;
  }

  .description {
    font-size: 0.85rem;
    margin-bottom: 0.75rem;
    line-clamp: 2; /* Limit description lines */
    -webkit-line-clamp: 2;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .add-btn {
    width: auto;
    align-self: flex-start;
    padding: 0.4rem 1rem;
    font-size: 0.9rem;
    margin-top: auto; /* Push to bottom if content is short */
  }
}

/* Detail Modal Styles */
.detail-modal {
    background: white;
    width: 100%;
    max-width: 500px;
    height: 100dvh; /* Full viewport height on mobile */
    max-height: none;
    border-radius: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    position: fixed; /* Fixed to cover screen */
    bottom: 0;
    z-index: 1050;
}

@media (min-width: 640px) {
    .detail-modal {
        border-radius: 24px;
        height: auto;
        min-height: 50vh;
        max-height: 85vh;
        position: relative;
        bottom: auto;
    }
}

.detail-hero {
    height: 160px;
    background: #f1f5f9;
    display: grid;
    place-items: center;
    position: relative;
    flex-shrink: 0;
}

.hero-icon-wrapper {
    background: white;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--color-primary);
    box-shadow: 0 8px 20px rgba(0,0,0,0.05);
}

.close-btn-float {
    position: absolute;
    top: max(1rem, calc(0.5rem + env(safe-area-inset-top)));
    right: 1rem;
    background: white;
    border: none;
    width: 44px; /* Larger touch target */
    height: 44px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    color: #64748b;
    z-index: 1060;
}

.detail-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
}

.detail-header {
    margin-bottom: 2rem;
}

.detail-header h2 {
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 0.25rem;
    color: var(--text-primary);
}

.detail-price {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-primary);
    margin-bottom: 0.5rem;
}

.detail-desc {
    color: #64748b;
    line-height: 1.5;
}

.notes-section {
    margin-top: 2rem;
}

.notes-section label {
    display: block;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
}

.notes-input {
    width: 100%;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 0.75rem;
    font-family: inherit;
    font-size: 1rem;
    background: #f8fafc;
    resize: none;
    height: 80px;
    outline: none;
}
.notes-input:focus { border-color: var(--color-primary); background: white; }

.detail-footer {
    padding: 1rem 1.5rem;
    background: white;
    border-top: 1px solid #f1f5f9;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
}

.qty-selector {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 0.5rem;
}

.qty-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid #e2e8f0;
    background: white;
    display: grid;
    place-items: center;
    cursor: pointer;
    font-size: 1.2rem;
}
.qty-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.qty-btn:not(:disabled):hover { border-color: var(--color-primary); color: var(--color-primary); }

.qty-val {
    font-size: 1.5rem;
    font-weight: 800;
    min-width: 40px;
    text-align: center;
}


.qty-control-inline {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px dashed #e2e8f0;
}

.circle-btn-small {
    width: 36px;
    height: 36px;
    min-width: 36px; /* Prevent squashing */
    border-radius: 50%;
    border: 1px solid #e2e8f0;
    background: white;
    display: flex; /* Flex is safer for centering icons */
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--color-primary);
    transition: all 0.2s;
    padding: 0; /* Reset browser defaults */
    flex-shrink: 0;
}
.circle-btn-small:active { transform: scale(0.95); background: #f1f5f9; }
.circle-btn-small:disabled { opacity: 0.5; cursor: not-allowed; }

.qty-display-inline {
    font-size: 1.25rem;
    font-weight: 700;
    min-width: 30px;
    text-align: center;
}

.add-btn-large {
    background: var(--color-primary);
    color: white;
    padding: 1rem;
    border-radius: 16px;
    border: none;
    font-size: 1.1rem;
    font-weight: 700;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
    width: 100%; /* Ensure full width */
}

.add-order-btn:active { transform: scale(0.98); }

.card-footer-visual {
    display: flex;
    justify-content: flex-end;
    margin-top: auto;
}
.add-icon-small {
    background: #f1f5f9;
    padding: 4px;
    border-radius: 6px;
    width: 24px;
    height: 24px;
    color: var(--color-primary);
}

/* Override menu card for pointer */
.menu-card {
    position: relative; /* Context for absolute positioning of add button */
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
}
.menu-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.05);
}

.order-id-display {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-primary);
    background: #f0fdf4;
    padding: 0.5rem 1rem;
    border-radius: 12px;
    margin: 1rem 0;
    border: 1px dashed var(--color-primary);
}

.transfer-details {
    width: 100%;
    margin-bottom: 1.5rem;
    text-align: left;
}

.transfer-details h3 {
    font-size: 0.95rem;
    color: #64748b;
    margin-bottom: 0.75rem;
    text-align: center;
    font-weight: 600;
}

.bank-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.bank-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
}

.bank-row .label { color: #64748b; }
.bank-row .value { font-weight: 600; color: #334155; text-align: right; }

.bank-account-row {
    margin-top: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px dashed #cbd5e1;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.account-info {
    display: flex;
    flex-direction: column;
}

.account-number {
    font-family: monospace;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-primary);
    letter-spacing: 0.5px;
}

.copy-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: white;
    border: 1px solid #e2e8f0;
    padding: 0.4rem 0.8rem;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
}

.copy-btn:active {
    background: #f1f5f9;
    transform: scale(0.95);
}

.transfer-hint {
    font-size: 0.8rem;
    color: #94a3b8;
    text-align: center;
    margin-top: 0.75rem;
    font-size: 0.9rem;
    color: #64748b;
}

.whatsapp-link {
    color: #22c55e;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 4px;
}

.legal-disclaimer {
    font-size: 0.75rem;
    color: #94a3b8;
    text-align: center;
    margin-bottom: 0.75rem;
    line-height: 1.4;
    padding: 0 1rem;
}

.legal-disclaimer a {
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 600;
}

.legal-disclaimer a:hover {
    text-decoration: underline;
}

.admin-floating-bar {
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.5rem;
    z-index: 2000;
}

.admin-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    border: none;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    backdrop-filter: blur(8px);
    transition: all 0.2s;
    color: white;
}

.admin-btn:hover {
    transform: translateY(2px);
}

.edit-btn {
    background: var(--color-primary);
}
.edit-btn:hover {
    background: white;
    color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary) inset;
}

.private-btn {
    background: #eab308; /* Yellow-500 */
    color: white;
}
.private-btn:hover {
    background: white;
    color: #eab308;
    box-shadow: 0 0 0 2px #eab308 inset;
}

.delete-btn {
    background: #ef4444; /* Red-500 */
    padding: 0.5rem; /* Icon only square-ish */
    border-radius: 50%;
    width: 36px;
    height: 36px;
    justify-content: center;
}
.delete-btn:hover {
    background: white;
    color: #ef4444;
    box-shadow: 0 0 0 2px #ef4444 inset;
}
.brand-logo {
    height: 35px;
    width: auto;
    object-fit: contain;
}



@keyframes floatPattern {
    0% { background-position: 0 0; }
    100% { background-position: 100% 100%; }
}


/* --- SPECALIZED BAMBU LAYOUT (Menu del Día) --- */
.bambu-section {
    margin-bottom: 3rem;
    position: relative;
    /* optional subtle bg if desired */
}

/* --- DIVIDER STYLES --- */
.section-divider {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 3rem 0;
    gap: 1rem;
    opacity: 0.8;
}

.divider-line {
    flex: 1;
    height: 3px; /* Slightly thicker */
    background: var(--color-primary);
    max-width: 200px;
    border-radius: 99px; /* Rounded ends */
    opacity: 0.3; /* Transparent consistent look */
}


.divider-icon-wrapper {
    background-color: #f1f5f9; /* Light gray background */
    border-radius: 50%;
    padding: 12px; /* Breathing room */
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05); /* Optional subtle depth */
}

.divider-icon-masked {
    height: 46px; /* Increased +20% from 38px */
    width: 46px; /* Assuming roughly square or will contain */
    /* Use mask to colorize */
    mask-image: url('/bamboo-divider-icon.png');
    mask-size: contain;
    mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-image: url('/bamboo-divider-icon.png');
    -webkit-mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-position: center;
    background-color: var(--color-primary); 
}

/* --- FONT UPDATE (Nunito) --- */
/* It is better to apply this to the root or body, 
   but since this is a view component, we can try to enforce it here 
   or ideally in main.css. 
   Let's check if we can enforce it on the layout wrapper.
*/
.menu-layout {
    font-family: 'Nunito', sans-serif; /* Global for this view */
}

/* Ensure headings use it too if they were overrided */
h1, h2, h3, h4, button, input {
    font-family: 'Nunito', sans-serif;
}



/* --- SPECALIZED BAMBU LAYOUT (Menu del Día) --- */
.bambu-section {
    margin-bottom: 3rem;
    position: relative;
}

.category-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    border-left: 4px solid var(--color-primary);
    padding-left: 1rem;
}

.bambu-container {
    display: flex;
    gap: 1.5rem;
}

/* 1. Featured Card */
.bambu-featured-card {
    flex: 2;
    background: var(--color-primary); /* Brand Color Background */
    border: none;
    border-radius: 20px;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0 10px 25px rgba(var(--color-primary-rgb), 0.25);
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 2.5rem;
    text-align: center;
    color: white; /* Text White */
}

.bambu-featured-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(var(--color-primary-rgb), 0.4);
}

/* New Badge Style Inside Card */
.time-badge-card {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: #E25822; /* Flame/Burger King Orange */
    color: white;
    font-size: 0.8rem;
    font-weight: 800;
    padding: 0.4rem 0.8rem;
    border-radius: 99px;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    animation: pulseBadge 2s infinite;
    z-index: 2;
}

@keyframes pulseBadge {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

.bambu-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    width: 100%;
}

.bambu-icon-wrapper-white {
    color: white;
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
}

.bambu-text h3 {
    font-size: 2rem;
    font-weight: 900;
    color: white;
    margin-bottom: 0.75rem;
    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.bambu-text p {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.95);
    line-height: 1.5;
    text-align: center;
    max-width: 450px; 
    margin: 0 auto;
    font-weight: 500;
}

.bambu-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin-top: 1.5rem;
}

.bambu-price {
    font-size: 1.75rem;
    font-weight: 800;
    color: white;
    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.add-btn-large-bambu {
    background: white;
    color: var(--color-primary);
    padding: 0.9rem 2.5rem;
    border-radius: 14px;
    border: none;
    font-size: 1.1rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.add-btn-large-bambu:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 16px rgba(0,0,0,0.25);
    background: #f8fafc;
}

/* 2. Side Stack */
.bambu-side-stack {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    justify-content: center;
}

.side-stack-title {
    font-size: 1rem;
    font-weight: 700;
    color: #64748b;
    margin-bottom: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 0.85rem;
}


.side-item-card {
    background: white;
    border: 1px solid #f1f5f9;
    border-radius: 16px;
    padding: 1rem 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 5px rgba(0,0,0,0.03);
}

/* User requested REMOVING the border change on hover */
.side-item-card:hover {
    /* border-color: var(--color-primary); REMOVED */
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}


.side-item-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: var(--color-primary);
}

.side-item-info {
    display: flex;
    flex-direction: column;
}

.side-item-info h4 {
    font-size: 1rem;
    font-weight: 700;
    color: #334155;
    margin: 0;
}

.side-price {
    font-size: 0.9rem;
    font-weight: 600;
    color: #64748b;
}

.add-btn-mini {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #f8fafc;
    color: var(--color-primary);
    border: none;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: background 0.2s;
}

.add-btn-mini:hover {
    background: var(--color-primary);
    color: white;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
    .bambu-container {
        flex-direction: column;
    }
    
    .bambu-featured-card {
        padding: 2rem;
    }
}

@media (max-width: 768px) {
    .bambu-side-stack {
        flex-direction: column;
    }
}
</style>










