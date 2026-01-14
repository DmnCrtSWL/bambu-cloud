<script setup>
import { ref, watch } from 'vue';
import { Lock, LogOut, Delete } from 'lucide-vue-next';

const props = defineProps({
    expectedPin: {
        type: String,
        required: true
    },
    userRole: {
        type: String,
        default: 'Operador'
    },
    userName: {
        type: String,
        default: 'Usuario'
    }
});

const emit = defineEmits(['unlock', 'logout']);

const pinInput = ref('');
const error = ref(false);

const handleKey = (key) => {
    if (error.value) {
        error.value = false;
        pinInput.value = '';
    }
    
    if (pinInput.value.length < 4) {
        pinInput.value += key;
    }
};

const handleClear = () => {
    pinInput.value = '';
    error.value = false;
};

const handleBackspace = () => {
    if (pinInput.value.length > 0) {
        pinInput.value = pinInput.value.slice(0, -1);
    }
};

watch(pinInput, (newVal) => {
    if (newVal.length === 4) {
        validatePin();
    }
});

const validatePin = () => {
    if (pinInput.value === props.expectedPin) {
        emit('unlock');
        pinInput.value = '';
    } else {
        error.value = true;
        // Shake animation and reset
        setTimeout(() => {
            pinInput.value = '';
            error.value = false;
        }, 500);
    }
};

// Handle physical keyboard too
window.addEventListener('keydown', (e) => {
    if (e.key >= '0' && e.key <= '9') {
        handleKey(e.key);
    } else if (e.key === 'Backspace') {
        handleBackspace();
    }
});
</script>

<template>
  <div class="lock-overlay">
    <div class="lock-card">
        
        <div class="header-section">
            <h2 class="lock-title">Bloqueado</h2>
            <p class="lock-subtitle">
                {{ userName }} <span class="role-badge">{{ userRole }}</span>
            </p>
        </div>

        <!-- Pin Dots -->
        <div class="pin-display" :class="{ 'error-shake': error }">
            <div 
                v-for="i in 4" 
                :key="i" 
                class="pin-dot"
                :class="{ filled: pinInput.length >= i }"
            ></div>
        </div>

        <!-- Numeric Keypad -->
        <div class="keypad">
            <button v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" @click="handleKey(n)" class="key-btn">
                {{ n }}
            </button>
            <button @click="handleClear" class="key-btn action-key text-sm">C</button>
            <button @click="handleKey(0)" class="key-btn">0</button>
            <button @click="handleBackspace" class="key-btn action-key">
                <Delete size="24" />
            </button>
        </div>

        <button @click="$emit('logout')" class="logout-link">
            <LogOut size="16" />
            <span>Cerrar Sesión</span>
        </button>
    </div>
  </div>
</template>

<style scoped>
.lock-overlay {
    position: fixed;
    inset: 0;
    background: rgba(38, 67, 71, 0.95); /* var(--color-primary-dark) with opacity */
    backdrop-filter: blur(8px);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: 'Outfit', sans-serif;
    touch-action: manipulation;
}

.lock-card {
    background: var(--bg-surface);
    padding: 2.5rem;
    border-radius: 24px;
    width: 100%;
    max-width: 380px;
    text-align: center;
    box-shadow: 0 25px 50px -12px rgba(38, 67, 71, 0.25);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    border: 1px solid var(--border-color);
}

.header-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.lock-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-primary-dark);
}

.lock-subtitle {
    margin: 0;
    color: var(--text-muted);
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.role-badge {
    background: var(--color-accent);
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-primary);
    letter-spacing: 0.5px;
    text-transform: uppercase;
}

/* PIN Dots */
.pin-display {
    display: flex;
    gap: 1.25rem;
    margin: 0.5rem 0;
}

.pin-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid var(--border-color);
    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.pin-dot.filled {
    background: var(--color-primary);
    border-color: var(--color-primary);
    transform: scale(1.2);
}

.error-shake {
    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
}

.error-shake .pin-dot {
    border-color: #ef4444; /* Error red - keep standard */
}
.error-shake .pin-dot.filled {
    background: #ef4444;
}

/* Keypad */
.keypad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
    width: 100%;
    padding: 0 1rem;
}

.key-btn {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    border: 1px solid var(--border-color);
    background: white;
    font-size: 1.75rem;
    font-weight: 500;
    color: var(--text-main);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    transition: all 0.15s ease-out;
    user-select: none;
    font-family: 'Outfit', sans-serif;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.key-btn:active {
    transform: scale(0.92);
    background: var(--color-accent);
    border-color: var(--color-primary-light);
    color: var(--color-primary-dark);
}

.action-key {
    border-color: transparent;
    color: var(--text-muted);
    font-size: 1rem;
    box-shadow: none;
    background: transparent;
}

.action-key:hover {
    background: var(--bg-app);
    color: var(--color-primary);
}

.text-sm {
    font-size: 1.1rem;
    font-weight: 600;
}

.logout-link {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 0.9rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 99px;
    transition: all 0.2s;
    margin-top: 0.5rem;
}

.logout-link:hover {
    color: #ef4444;
    background: #fee2e2;
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}
</style>
