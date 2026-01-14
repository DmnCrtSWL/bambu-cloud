<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { authFetch } from '../../utils/authFetch';
import { useRouter, useRoute } from 'vue-router';

import { 
    Save, ArrowLeft, Plus, Trash2, X, 
    Utensils, Coffee, Pizza, Cake, Croissant, Egg, Fish, Salad, Soup, IceCream, Cookie, Carrot, Apple, Banana, Cherry, Milk, Popcorn, Citrus, GlassWater,
    Settings
} from 'lucide-vue-next';



const router = useRouter();
const route = useRoute();
const isEditMode = computed(() => route.params.id !== undefined);

const loading = ref(false);
const saving = ref(false);
const recipes = ref([]);
const inventory = ref([]);
const existingGroups = ref([]);

const CATEGORY_OPTIONS = [
    'Desayunos',
    'Menú del Día',
    'Barra de Café',
    'Sandwiches',
    'Huevos Al Gusto',
    'Dulcería',
    'Bebidas'
];

const AVAILABLE_ICONS = {
    Utensils, Coffee, Pizza, Cake, Croissant, Egg, Fish, Salad, Soup, IceCream, Cookie, Carrot, Apple, Banana, Cherry, Milk, Popcorn, Citrus, GlassWater
};



const form = ref({
    name: '',
    recipeId: '',
    price: '', // Used for Simple items
    description: '',
    isActive: true, // true (public) or false (private)
    type: 'simple', // 'simple' or 'variable'
    isActive: true, // true (public) or false (private)
    type: 'simple', // 'simple' or 'variable'
    category: '',
    icon: '',
    variations: [] // Array of Groups: { name: 'Size', options: [{ name: 'Small', price: 10, ingredientMapping: {} }] }
});

// Config Modal State
const showConfigModal = ref(false);
const activeConfigOption = ref(null); // { groupIndex, optionIndex, data }

const selectedRecipe = computed(() => {
    if (!form.value.recipeId) return null;
    const r = recipes.value.find(r => r.id == form.value.recipeId);
    console.log('Selected Recipe for Config:', r);
    return r;
});

const productionCost = computed(() => {
    if (!selectedRecipe.value || !selectedRecipe.value.ingredients) return 0;
    
    return selectedRecipe.value.ingredients.reduce((total, ing) => {
        const invItem = inventory.value.find(i => i.product === ing.productName);
        const unitPrice = invItem ? parseFloat(invItem.avgUnitPrice) : 0;
        return total + (parseFloat(ing.quantity) * unitPrice);
    }, 0);
});

const currency = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

const fetchInitialData = async () => {
    loading.value = true;
    try {
        const [recipesRes, inventoryRes, listRes] = await Promise.all([
            authFetch('/api/recipes'),
            authFetch('/api/inventory'),
             // Always fetch menu items to get variation suggestions
            authFetch('/api/menu-items')
        ]);

        
        recipes.value = await recipesRes.json();
        inventory.value = await inventoryRes.json();

        let allMenuItems = [];
        if (listRes.ok) {
            allMenuItems = await listRes.json();
        }

        if (isEditMode.value) {
            const item = allMenuItems.find(i => i.id === parseInt(route.params.id));
            
            if (item) {
                // Determine type based on variations existence
                const hasVariations = item.variations && Array.isArray(item.variations) && item.variations.length > 0;
                
                form.value = {
                    name: item.name,
                    recipeId: item.recipeId,
                    price: item.price,
                    description: item.description || '',
                    isActive: item.isActive,
                    type: hasVariations ? 'variable' : 'simple',
                    category: item.category || '',
                    icon: item.icon || '',
                    variations: item.variations || []
                };
            }
        }
        
        // Extract unique existing groups from ALL items
        const groupsMap = new Map();
        allMenuItems.forEach(item => {
            if (item.variations && Array.isArray(item.variations)) {
                item.variations.forEach(v => {
                    if (v.name && v.options && v.options.length > 0) {
                        // Store the first occurrence or maybe the one with most options?
                        // Simple approach: Store by name, overwrite is fine or check complexity.
                        if (!groupsMap.has(v.name)) {
                            groupsMap.set(v.name, v.options);
                        }
                    }
                });
            }
        });
        existingGroups.value = Array.from(groupsMap.entries()).map(([name, options]) => ({ name, options }));

    } catch (error) {
        console.error(error);
        alert('Error cargando datos');
    } finally {
        loading.value = false;
    }
};

onMounted(fetchInitialData);

// Variation Logic
const addVariationGroup = () => {
    form.value.variations.push({
        name: '',
        name: '',
        options: [{ name: '', price: 0, ingredientMapping: null }]
    });
};

const removeVariationGroup = (index) => {
    form.value.variations.splice(index, 1);
};

const addOption = (groupIndex) => {
    form.value.variations[groupIndex].options.push({ name: '', price: 0, ingredientMapping: null });
};

const removeOption = (groupIndex, optionIndex) => {
    form.value.variations[groupIndex].options.splice(optionIndex, 1);
};

const onGroupNameChange = (event, groupIndex) => {
    const val = event.target.value;
    const found = existingGroups.value.find(g => g.name.toLowerCase() === val.toLowerCase());
    
    if (found) {
        const currentOpts = form.value.variations[groupIndex].options;
        if (currentOpts.length === 1 && !currentOpts[0].name) {
             const confirmFill = confirm(`¿Usar las opciones guardadas para "${found.name}"?`);
             if (confirmFill) {
                 form.value.variations[groupIndex].options = JSON.parse(JSON.stringify(found.options));
             }
        }
    }
};

const openConfigModal = (gIdx, oIdx) => {
    const opt = form.value.variations[gIdx].options[oIdx];
    // Init mapping object if missing
    if (!opt.ingredientMapping) {
        opt.ingredientMapping = {
            inventoryItem: '',
            quantity: 1,
            unit: 'pza',
            isReplacement: false,
            replaceTarget: ''
        };
    }
    
    activeConfigOption.value = { 
        groupIndex: gIdx, 
        optionIndex: oIdx,
        ...opt // copy for reactive binding in modal (pointer is safer? actually reactive object ref is better)
    };
    showConfigModal.value = true;
};

const closeConfigModal = () => {
    showConfigModal.value = false;
    activeConfigOption.value = null;
};

const getUnitForInventoryItem = (itemName) => {
    const item = inventory.value.find(i => i.product === itemName);
    return item ? item.unit : 'pza';
};


const saveMenuItem = async () => {
    if (!form.value.name) {
        alert('El nombre es obligatorio');
        return;
    }

    if (!form.value.category) {
        alert('Debes seleccionar una categoría');
        return;
    }

    if (form.value.type === 'simple' && !form.value.price) {
        alert('El precio es obligatorio para platillos sencillos');
        return;
    }

    // Prepare payload
    const payload = { ...form.value };
    
    // Clear variations if simple
    if (payload.type === 'simple') {
        payload.variations = [];
    } else {
        // Validation for variable
        if (payload.variations.length === 0) {
             alert('Debes agregar al menos un grupo de variaciones');
             return;
        }
        // Ensure options have names
        for (const group of payload.variations) {
            if (!group.name) {
                 alert('Todos los grupos deben tener nombre');
                 return;
            }
            if (!group.options || group.options.length === 0) {
                 alert(`El grupo "${group.name}" no tiene opciones`);
                 return;
            }
        }
        // In variable mode, we might set main price to 0 or base price. User didn't specify. 
        // For now, let's keep it as is, or set to 0. 
        // Logic: Main price is irrelevant or serves as a base?
        // User example suggest options have full prices "12oz $44". 
        // If we leave price as is, it might be confusing. Let's set it to 0 if variable?
        // Or keep it as "Base Price" if user wants?
        // I will trust the form.value.price. If hidden, user can't set it. I should verify if I hide it.
        // If I hide it, I should default it to 0 on save.
        if (form.value.type === 'variable') {
             // Try to find a sensible default for list view display? Maybe the lowest price option?
             // Or just 0.
             // Let's set to 0 to be safe
             payload.price = 0;
        }
    }

    saving.value = true;
    try {
        const url = isEditMode.value 
            ? `/api/menu-items/${route.params.id}`
            : '/api/menu-items';
        
        const method = isEditMode.value ? 'PUT' : 'POST';
        
        const res = await authFetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });



        if (res.ok) {
            router.push('/admin/menu');
        } else {
            throw new Error('Error al guardar');
        }
    } catch (error) {
        console.error(error);
        alert('Error al guardar el platillo');
    } finally {
        saving.value = false;
    }
};

// Auto-fill name when recipe is selected if name is empty
watch(() => form.value.recipeId, (newId) => {
    if (newId && !form.value.name) {
        const recipe = recipes.value.find(r => r.id === newId);
        if (recipe) {
            form.value.name = recipe.name;
        }
    }
});
</script>

<template>
    <div class="menu-form-view">
        <div class="header">
            <button class="back-btn" @click="router.back()">
                <ArrowLeft :size="20" />
                <span>Volver</span>
            </button>
            <h1 class="page-title">{{ isEditMode ? 'Editar Platillo' : 'Nuevo Platillo' }}</h1>
        </div>

        <div v-if="loading" class="loading">Cargando...</div>

        <div v-else class="form-container">
            <div class="form-grid">
                <!-- Info Básica (Izquierda) -->
                <div class="column">
                    <div class="card basic-info">
                        <h3>Información General</h3>
                        
                        <div class="form-group">
                            <label>Nombre del Platillo *</label>
                            <input type="text" v-model="form.name" placeholder="Ej: Hamburguesa Especial" />
                        </div>

                        <div class="form-group">
                            <label>Descripción</label>
                            <textarea v-model="form.description" rows="3" placeholder="Descripción para el cliente..."></textarea>
                        </div>

                        <div class="form-group">
                            <label>Categoría *</label>
                            <div class="select-wrapper">
                                <select v-model="form.category">
                                    <option value="" disabled>Selecciona una categoría</option>
                                    <option v-for="cat in CATEGORY_OPTIONS" :key="cat" :value="cat">
                                        {{ cat }}
                                    </option>
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                             <div class="form-group half">
                                <label>Visibilidad *</label>
                                <div class="select-wrapper">
                                    <select v-model="form.isActive">
                                        <option :value="true">Público</option>
                                        <option :value="false">Privado</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group half">
                                <label>Tipo de Platillo *</label>
                                <div class="select-wrapper">
                                    <select v-model="form.type">
                                        <option value="simple">Sencillo</option>
                                        <option value="variable">Variable</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Variations Builder (Only if Variable) -->
                    <div v-if="form.type === 'variable'" class="card variations-section">
                        <div class="section-header">
                            <h3>Variaciones y Mofificadores</h3>
                            <button class="btn-sm" @click="addVariationGroup">
                                <Plus :size="16" /> Agregar Grupo
                            </button>
                        </div>
                        
                        <div v-if="form.variations.length === 0" class="empty-variations">
                            <p>No hay variaciones definidas.</p>
                            <button class="text-btn" @click="addVariationGroup">Crear primer grupo (ej. Tamaño)</button>
                        </div>

                        <div v-else class="variations-list">
                            <div v-for="(group, gIndex) in form.variations" :key="gIndex" class="variation-group">
                                <div class="group-header">
                                    <input 
                                        type="text" 
                                        v-model="group.name" 
                                        placeholder="Nombre Grupo (ej. Tamaño)" 
                                        class="group-name-input" 
                                        list="variation-groups-list"
                                        @change="(e) => onGroupNameChange(e, gIndex)"
                                    />
                                    <datalist id="variation-groups-list">
                                        <option v-for="ex in existingGroups" :key="ex.name" :value="ex.name"></option>
                                    </datalist>
                                    <button class="icon-btn danger" @click="removeVariationGroup(gIndex)" title="Eliminar Grupo">
                                        <Trash2 :size="16" />
                                    </button>
                                </div>
                                <div class="options-list">
                                    <div v-for="(option, oIndex) in group.options" :key="oIndex" class="option-row">
                                        <input type="text" v-model="option.name" placeholder="Opción (ej. 12oz)" class="option-name" />
                                        <div class="price-input-sm">
                                            <span>$</span>
                                            <input type="number" v-model="option.price" placeholder="0" />
                                        </div>
                                        <button class="icon-btn" @click="openConfigModal(gIndex, oIndex)" title="Configurar Inventario">
                                            <Settings :size="14" />
                                        </button>
                                        <button class="icon-btn" @click="removeOption(gIndex, oIndex)" v-if="group.options.length > 1">
                                            <X :size="14" />
                                        </button>
                                    </div>
                                    <button class="add-option-btn" @click="addOption(gIndex)">
                                        <Plus :size="14" /> Agregar Opción
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Configuración de Receta y Precio (Derecha) -->
                <div class="column">
                    <div class="card cost-config">
                        <h3>Receta Base y Costos</h3>

                        <div class="form-group">
                            <label>Receta de Producción</label>
                            <div class="select-wrapper">
                                <select v-model="form.recipeId">
                                    <option value="" disabled>Selecciona una receta...</option>
                                    <option v-for="recipe in recipes" :key="recipe.id" :value="recipe.id">
                                        {{ recipe.name }}
                                    </option>
                                </select>
                            </div>
                            <p class="help-text" v-if="!form.recipeId">Selecciona una receta para calcular el costo.</p>
                        </div>

                        <div v-if="selectedRecipe" class="cost-summary">
                            <div class="cost-row">
                                <span>Receta Seleccionada:</span>
                                <span class="value">{{ selectedRecipe.name }}</span>
                            </div>
                            <div class="cost-row highlight">
                                <span>Costo de Producción:</span>
                                <span class="value">{{ currency(productionCost) }}</span>
                            </div>
                        </div>

                        <!-- Price Input (Only if Simple) -->
                        <div v-if="form.type === 'simple'" class="form-group price-group">
                            <label>Precio de Venta *</label>
                            <div class="price-input">
                                <span class="currency-symbol">$</span>
                                <input type="number" v-model="form.price" placeholder="0.00" />
                            </div>
                        </div>

                        <div v-else class="info-box">
                            <p>El precio se determinará según las opciones seleccionadas por el cliente.</p>
                        </div>
                    </div>

                    <!-- Icon Selector -->
                    <div class="card icon-selector">
                        <h3>Icono del Platillo</h3>
                        <div class="icons-grid">
                            <div 
                                v-for="(component, name) in AVAILABLE_ICONS" 
                                :key="name" 
                                class="icon-item" 
                                :class="{ active: form.icon === name }"
                                @click="form.icon = name"
                            >
                                <component :is="component" :size="24" />
                            </div>
                        </div>
                        <div v-if="form.icon" class="selected-icon-label">
                            Icono seleccionado: <strong>{{ form.icon }}</strong>
                            <button class="clear-icon" @click="form.icon = ''">Quitar</button>
                        </div>
                        <p v-else class="help-text">Selecciona un icono para representar este producto.</p>
                    </div>
                </div>
            </div>

            <div class="actions">
                <button class="cancel-btn" @click="router.back()">Cancelar</button>
                <button class="save-btn" @click="saveMenuItem" :disabled="saving">
                    <Save :size="18" />
                    <span>{{ saving ? 'Guardando...' : 'Guardar Platillo' }}</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Inventory Config Modal -->
    <div v-if="showConfigModal && activeConfigOption" class="modal-overlay">
        <div class="config-modal">
            <div class="modal-header">
                <h3>Configurar: {{ form.variations[activeConfigOption.groupIndex].options[activeConfigOption.optionIndex].name || 'Nueva Opción' }}</h3>
                <button class="close-btn" @click="closeConfigModal"><X :size="20" /></button>
            </div>
            
            <div class="modal-body">
                <p class="modal-desc">Vincula esta opción a una salida de inventario automática.</p>
                
                <div class="form-group">
                     <label>Ingrediente a Descontar</label>
                     <div class="select-wrapper">
                         <select 
                            v-model="form.variations[activeConfigOption.groupIndex].options[activeConfigOption.optionIndex].ingredientMapping.inventoryItem"
                            @change="(e) => { 
                                const u = getUnitForInventoryItem(e.target.value);
                                form.variations[activeConfigOption.groupIndex].options[activeConfigOption.optionIndex].ingredientMapping.unit = u;
                            }"
                        >
                             <option value="">-- Ninguno --</option>
                             <option v-for="item in inventory" :key="item.product" :value="item.product">
                                 {{ item.product }} ({{ item.currentStock }} {{ item.unit }})
                             </option>
                         </select>
                     </div>
                </div>

                <div v-if="form.variations[activeConfigOption.groupIndex].options[activeConfigOption.optionIndex].ingredientMapping.inventoryItem">
                    <div class="form-row">
                        <div class="form-group half">
                            <label>Cantidad</label>
                            <input type="number" 
                                v-model="form.variations[activeConfigOption.groupIndex].options[activeConfigOption.optionIndex].ingredientMapping.quantity" 
                            />
                        </div>
                        <div class="form-group half">
                            <label>Unidad</label>
                             <input type="text" 
                                v-model="form.variations[activeConfigOption.groupIndex].options[activeConfigOption.optionIndex].ingredientMapping.unit" 
                                disabled 
                                class="disabled-input"
                            />
                        </div>
                    </div>

                    <div class="form-group checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" v-model="form.variations[activeConfigOption.groupIndex].options[activeConfigOption.optionIndex].ingredientMapping.isReplacement">
                            Es un reemplazo (Sustituto)
                        </label>
                         <p class="help-text">Si se marca, este ingrediente sustituirá a uno de la receta original.</p>
                    </div>

                    <div v-if="form.variations[activeConfigOption.groupIndex].options[activeConfigOption.optionIndex].ingredientMapping.isReplacement" class="form-group">
                         <div class="replacement-info" v-if="selectedRecipe">
                            <small class="text-primary">Receta Base: {{ selectedRecipe.name }}</small>
                         </div>
                         <div class="replacement-info error" v-else>
                            <small class="text-danger">⚠ No hay receta base seleccionada. Selecciona una receta para el platillo primero.</small>
                         </div>
                         
                         <label>Reemplaza a:</label>
                          <div class="select-wrapper">
                            <select v-model="form.variations[activeConfigOption.groupIndex].options[activeConfigOption.optionIndex].ingredientMapping.replaceTarget" :disabled="!selectedRecipe">
                                <option value="" disabled>Selecciona ingrediente base...</option>
                                <option v-for="ing in selectedRecipe?.ingredients || []" :key="ing.productName" :value="ing.productName">
                                    {{ ing.productName }} ({{ ing.quantity }} {{ ing.unit }})
                                </option>
                            </select>
                         </div>
                    </div>
                </div>

            </div>
            <div class="modal-footer">
                <button class="save-btn" @click="closeConfigModal">Guardar Configuración</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.menu-form-view {
    max-width: 1100px;
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
    border: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-muted);
    cursor: pointer;
    font-weight: 500;
}

.back-btn:hover {
    color: var(--color-primary);
}

.page-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-main);
}

.form-grid {
    display: grid;
    grid-template-columns: 1.6fr 1fr;
    gap: 1.5rem;
    margin-bottom: 2rem;
    align-items: start;
}

.column {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.card {
    background: white;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
}

h3 {
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
    color: var(--text-main);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.75rem;
}

.form-group {
    margin-bottom: 1.25rem;
}

.form-row {
    display: flex;
    gap: 1rem;
}

.form-group.half {
    flex: 1;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    font-size: 0.9rem;
    color: var(--text-main);
}

input[type="text"], input[type="number"], textarea, select {
    width: 100%;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 0.95rem;
    transition: border-color 0.2s;
}

input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: var(--color-primary);
}

.select-wrapper {
    position: relative;
}

select {
    appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    background-size: 1em;
    padding-right: 2.5rem;
}

.help-text {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
}

.cost-summary {
    background: #F8FAFC;
    border: 1px dashed var(--border-color);
    padding: 1rem;
    border-radius: var(--radius-md);
    margin-bottom: 1.5rem;
}

.cost-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    color: var(--text-muted);
}

.cost-row.highlight {
    color: var(--text-main);
    font-weight: 600;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #E2E8F0;
    font-size: 1rem;
}

.price-input {
    position: relative;
}

.currency-symbol {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    font-weight: 500;
}

.price-input input {
    padding-left: 2rem;
    font-weight: 600;
    color: var(--color-primary);
}

.actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
}

.cancel-btn {
    background: white;
    border: 1px solid var(--border-color);
    padding: 0.75rem 1.5rem;
    border-radius: var(--radius-md);
    font-weight: 500;
    cursor: pointer;
    color: var(--text-muted);
}

.save-btn {
    background: var(--color-primary);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: var(--radius-md);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
}

.save-btn:hover { background: var(--color-primary-dark); }
.save-btn:disabled { opacity: 0.7; cursor: not-allowed; }

/* Variations Styles */
.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.75rem;
}

.section-header h3 {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}

.btn-sm {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    transition: all 0.2s;
}
.btn-sm:hover { background: var(--color-primary-dark); }


.empty-variations {
    text-align: center;
    padding: 2rem;
    background: #F8FAFC;
    border-radius: var(--radius-md);
    color: var(--text-muted);
}

.text-btn {
    background: none;
    border: none;
    color: var(--color-primary);
    font-weight: 500;
    cursor: pointer;
    margin-top: 0.5rem;
    text-decoration: underline;
}

.variation-group {
    background: #F8FAFC;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 1rem;
    margin-bottom: 1rem;
}

.group-header {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}

.group-name-input {
    font-weight: 600;
    border-color: transparent !important;
    background: transparent;
    padding: 0.25rem 0.5rem !important;
}
.group-name-input:focus {
    background: white;
    border-color: var(--color-primary) !important;
}

.icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
}
.icon-btn:hover { color: var(--text-main); }
.icon-btn.danger:hover { color: #DC2626; }

.options-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-left: 0.5rem;
}

.option-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.option-name {
    flex: 1;
}

.price-input-sm {
    display: flex;
    align-items: center;
    background: white;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 0 0.5rem;
    width: 100px;
}
.price-input-sm span { color: var(--text-muted); font-size: 0.85rem; }
.price-input-sm input {
    border: none;
    padding: 0.4rem;
    width: 100%;
    text-align: right;
    font-size: 0.9rem;
    outline: none;
}

.add-option-btn {
    background: none;
    border: 1px dashed var(--border-color);
    color: var(--text-muted);
    width: 100%;
    padding: 0.5rem;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 0.85rem;
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
}
.add-option-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
}

.modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
}

.config-modal {
    background: white;
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 450px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.modal-body {
    margin-bottom: 1.5rem;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
}

.disabled-input {
    background: #f1f5f9;
    color: #94a3b8;
}

.checkbox-group {
    background: #f8fafc;
    padding: 0.75rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    cursor: pointer;
}

.close-btn {
    background: none; border: none; cursor: pointer; color: var(--text-muted);
}
.close-btn:hover { color: var(--text-main); }

.info-box {
    padding: 1rem;
    background: #F0FDF4;
    border: 1px solid #BBF7D0;
    border-radius: var(--radius-md);
    color: #166534;
    font-size: 0.9rem;
}

@media (max-width: 900px) {
    .form-grid { grid-template-columns: 1fr; }
}

/* Icon Selector Styles */
.icons-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.icon-item {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--text-muted);
    transition: all 0.2s;
}

.icon-item:hover {
    background: #F1F5F9;
    color: var(--text-main);
}

.icon-item.active {
    background: #E0F2FE;
    border-color: #38BDF8;
    color: #0284C7;
}

.selected-icon-label {
    font-size: 0.9rem;
    color: var(--text-main);
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 0.5rem;
}

.clear-icon {
    font-size: 0.8rem;
    color: #DC2626;
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: underline;
}
</style>
