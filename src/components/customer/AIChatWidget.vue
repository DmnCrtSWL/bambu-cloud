<script setup>
import { ref, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { MessageCircle, X, Send, User, Bot, Loader2, Mic, MicOff } from 'lucide-vue-next';

const props = defineProps({
  webhookUrl: {
    type: String,
    default: ''
  },
  isOpen: {
      type: Boolean,
      default: false
  }
});

const emit = defineEmits(['close']);

const messages = ref([
  { role: 'agent', text: '¡Hola! Soy tu mesero virtual. 🤖🍽️\n¿En qué puedo ayudarte hoy? ' }
]);
const userInput = ref('');
const isLoading = ref(false);
const messagesContainer = ref(null);

watch(() => props.isOpen, (val) => {
    if (val) {
        scrollToBottom();
    }
});

const scrollToBottom = () => {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
    });
};

const closeChat = () => {
    emit('close');
};

const sendMessage = async () => {
    if (!userInput.value.trim()) return;

    const text = userInput.value;
    messages.value.push({ role: 'user', text });
    userInput.value = '';
    isLoading.value = true;
    scrollToBottom();

    try {
        if (!props.webhookUrl) {
            // Mock response if no URL provided
            setTimeout(() => {
                messages.value.push({ role: 'agent', text: 'Estoy conectado pero no tengo una URL de n8n configurada aún. 😅' });
                isLoading.value = false;
                scrollToBottom();
            }, 1000);
            return;
        }

        // Call n8n Webhook
        const res = await fetch(props.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });

        if (!res.ok) throw new Error('Error en el servidor de IA');

        const data = await res.json();
        // Assuming n8n returns { output: "Respuesta..." } or { message: "..." }
        const reply = data.output || data.message || data.text || 'Entendido.';
        
        messages.value.push({ role: 'agent', text: reply });
        
    } catch (error) {
        console.error(error);
        messages.value.push({ role: 'agent', text: 'Lo siento, tuve un problema de conexión. Intenta de nuevo.' });
    } finally {
        isLoading.value = false;
        scrollToBottom();
    }
};
const isRecording = ref(false);
let recognition = null;

onMounted(() => {
    // Basic Web Speech API Support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'es-MX';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value += (userInput.value ? ' ' : '') + transcript;
            isRecording.value = false;
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            isRecording.value = false;
        };
        
        recognition.onend = () => {
            isRecording.value = false;
        };
    }
});

const toggleRecording = () => {
    if (!recognition) {
        alert('Tu navegador no soporta entrada de voz.');
        return;
    }
    
    if (isRecording.value) {
        recognition.stop();
        isRecording.value = false;
    } else {
        recognition.start();
        isRecording.value = true;
    }
};

const handleAction = () => {
    if (userInput.value.trim()) {
        sendMessage(); // Send if text exists
    } else {
        toggleRecording(); // Toggle mic if empty
    }
};
</script>

<template>
    <!-- Modal Overlay -->
    <div v-if="isOpen" class="modal-overlay" @click.self="closeChat">
        <div class="chat-modal-card">
            
            <div class="chat-header">
                <div class="header-info">
                    <div class="avatar-agent">
                        <Bot size="24" />
                    </div>
                    <div class="header-text">
                        <h3>Mesero Virtual</h3>
                        <span class="status-badge">En línea</span>
                    </div>
                </div>
                <button class="close-btn" @click="closeChat">
                    <X size="24" />
                </button>
            </div>

            <div class="chat-messages" ref="messagesContainer">
                <div 
                    v-for="(msg, idx) in messages" 
                    :key="idx" 
                    class="message-row"
                    :class="msg.role === 'user' ? 'user-row' : 'agent-row'"
                >
                    <div v-if="msg.role === 'agent'" class="msg-avatar">
                        <Bot size="16" />
                    </div>
                    <div class="message-bubble" :class="msg.role">
                        {{ msg.text }}
                    </div>
                </div>
                <div v-if="isLoading" class="message-row agent-row">
                    <div class="msg-avatar"><Bot size="16" /></div>
                    <div class="message-bubble agent typing">
                        <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
                    </div>
                </div>
            </div>

            <div class="chat-input-area">
                <input 
                    type="text" 
                    v-model="userInput" 
                    placeholder="Escribe o dicta..." 
                    @keyup.enter="sendMessage"
                >
                
                <!-- Dynamic Action Button -->
                <button 
                    class="action-btn" 
                    :class="{ 'recording': isRecording, 'send-mode': userInput.trim() }"
                    @click="handleAction"
                    :disabled="isLoading"
                >
                    <!-- Loading State -->
                    <Loader2 v-if="isLoading" class="spin" size="24" />
                    
                    <!-- Send State (If text exists) -->
                    <Send v-else-if="userInput.trim()" size="24" />
                    
                    <!-- Recording State -->
                    <div v-else-if="isRecording" class="recording-indicator">
                        <span class="wave"></span>
                        <span class="wave"></span>
                        <span class="wave"></span>
                    </div>

                    <!-- Mic State (Default) -->
                    <Mic v-else size="24" />
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Reuse Modal Overlay Logic */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 2000;
    display: flex;
    justify-content: center;
    align-items: center; /* Center on Desktop/Tablet */
    backdrop-filter: blur(4px);
    font-family: 'Outfit', sans-serif;
}

/* Chat Card - Matches Product Detail Modal */
.chat-modal-card {
    background: white;
    width: 90%;
    max-width: 500px;
    height: 80vh; /* Fixed height for chat feels better */
    max-height: 600px;
    border-radius: 20px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

.chat-header {
    padding: 1rem 1.5rem;
    background: var(--color-primary); /* Keeps brand identity */
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header-info {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.avatar-agent {
    background: rgba(255,255,255,0.2);
    width: 42px;
    height: 42px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    backdrop-filter: blur(4px);
}

.header-text h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
}

.header-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.status-badge {
    font-size: 0.75rem;
    opacity: 0.9;
    display: flex;
    align-items: center;
    gap: 4px;
}
.status-badge::before {
    content: '';
    display: block;
    width: 6px;
    height: 6px;
    background: #4ade80;
    border-radius: 50%;
    box-shadow: 0 0 8px #4ade80;
}

.close-btn {
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s;
    display: flex; /* Fix alignment */
    align-items: center;
}

.close-btn:hover { opacity: 1; }

.chat-messages {
    flex: 1;
    padding: 1.5rem;
    background: #f8fafc;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* ... Existing Message Bubbles Styles ... */
.message-row {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
}

.user-row {
    justify-content: flex-end;
}

.msg-avatar {
    width: 28px;
    height: 28px;
    background: #e2e8f0;
    border-radius: 50%;
    color: #64748b;
    display: grid;
    place-items: center;
    flex-shrink: 0;
}

.message-bubble {
    max-width: 80%;
    padding: 0.75rem 1rem;
    border-radius: 16px;
    font-size: 0.95rem;
    line-height: 1.5;
    white-space: pre-wrap;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.message-bubble.agent {
    background: white;
    border-bottom-left-radius: 4px;
    color: var(--text-main);
}

.message-bubble.user {
    background: var(--color-primary);
    color: white;
    border-bottom-right-radius: 4px;
}

.chat-input-area {
    padding: 1rem;
    background: white;
    border-top: 1px solid #e2e8f0;
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

.chat-input-area input {
    flex: 1;
    border: 1px solid #e2e8f0;
    border-radius: 24px;
    padding: 0.75rem 1.25rem;
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.chat-input-area input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(55, 97, 103, 0.1); 
}

/* Dynamic Action Button */
.action-btn {
    width: 52px;
    height: 52px;
    border: none;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
    
    /* Mobile optimization */
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    
    /* Default (Mic) State */
    background: #f1f5f9;
    color: var(--text-muted);
}

.action-btn:hover {
    background: #e2e8f0;
    color: var(--color-primary);
    transform: scale(1.05);
}

/* Send Mode (Text exists) */
.action-btn.send-mode {
    background: var(--color-primary);
    color: white;
    box-shadow: 0 4px 12px rgba(55, 97, 103, 0.3);
}

.action-btn.send-mode:hover {
    background: var(--color-primary-dark);
    box-shadow: 0 6px 16px rgba(55, 97, 103, 0.4);
}

/* Recording Mode */
.action-btn.recording {
    background: #fee2e2;
    color: #ef4444;
    animation: pulse-red 1.5s infinite;
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
}

.action-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
}

.spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.recording-indicator {
    display: flex;
    align-items: center;
    gap: 3px;
    height: 16px;
}

.wave {
    display: block;
    width: 3px;
    background: #ef4444;
    border-radius: 2px;
    animation: wage-grow 1s ease-in-out infinite;
}

.wave:nth-child(1) { height: 8px; animation-delay: 0s; }
.wave:nth-child(2) { height: 16px; animation-delay: 0.2s; }
.wave:nth-child(3) { height: 8px; animation-delay: 0.4s; }

@keyframes wage-grow {
    0%, 100% { height: 8px; }
    50% { height: 18px; }
}

@keyframes pulse-red {
    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
    70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

/* Animations */
.typing .dot {
    animation: bounce 1.4s infinite ease-in-out both;
    font-weight: bold;
    font-size: 1.2rem;
    margin: 0 1px;
}
.typing .dot:nth-child(1) { animation-delay: -0.32s; }
.typing .dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* Mobile Optimizations */
@media (max-width: 640px) {
    .chat-modal-card {
        width: 100%;
        height: 100%;
        max-height: 100dvh; /* Dynamic viewport height */
        border-radius: 0;
        display: flex;
        flex-direction: column;
    }

    .chat-header {
        padding-top: max(1rem, env(safe-area-inset-top));
        padding-bottom: 1rem;
    }

    .close-btn {
        padding: 12px; /* Larger hit area */
        margin: -12px -8px -12px 0; /* Center visually while keeping hit area */
    }
    
    .chat-input-area {
        padding-bottom: max(1rem, env(safe-area-inset-bottom));
    }
}
</style>
