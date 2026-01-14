<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import { LogIn, User, Lock, AlertCircle, Loader2 } from 'lucide-vue-next';

const auth = useAuthStore();
const router = useRouter();

const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
    if (!username.value || !password.value) {
        error.value = 'Por favor ingrese usuario y contraseña';
        return;
    }

    loading.value = true;
    error.value = '';
    
    try {
        await auth.login(username.value, password.value);
        router.push('/admin');
    } catch (err) {
        error.value = err.message || 'Error al iniciar sesión';
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="login-page">
        <div class="login-container">
            <div class="login-brand">
                <div class="logo-box">BC</div>
                <h1>Bambú Cloud</h1>
                <p>Bienvenido de nuevo. Inicie sesión en su cuenta.</p>
            </div>

            <form @submit.prevent="handleLogin" class="login-form">
                <div v-if="error" class="login-error">
                    <AlertCircle size="20" />
                    <span>{{ error }}</span>
                </div>

                <div class="form-group">
                    <label for="username">Usuario</label>
                    <div class="input-wrapper">
                        <User class="input-icon" size="20" />
                        <input 
                            type="text" 
                            id="username" 
                            v-model="username" 
                            placeholder="Ingrese su usuario"
                            :disabled="loading"
                        />
                    </div>
                </div>

                <div class="form-group">
                    <label for="password">Contraseña</label>
                    <div class="input-wrapper">
                        <Lock class="input-icon" size="20" />
                        <input 
                            type="password" 
                            id="password" 
                            v-model="password" 
                            placeholder="Ingrese su contraseña"
                            :disabled="loading"
                        />
                    </div>
                </div>

                <button type="submit" class="login-btn" :disabled="loading">
                    <template v-if="!loading">
                        <span>Acceder al Sistema</span>
                        <LogIn size="20" />
                    </template>
                    <template v-else>
                        <Loader2 class="spinning" size="20" />
                        <span>Autenticando...</span>
                    </template>
                </button>
            </form>

            <div class="login-footer">
                <p>&copy; 2026 Bambú Cloud. Todos los derechos reservados.</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f6f8fb 0%, #e9eff5 100%);
    padding: 1.5rem;
}

.login-container {
    width: 100%;
    max-width: 440px;
    background: white;
    border-radius: 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.05);
    padding: 3rem;
    animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.login-brand {
    text-align: center;
    margin-bottom: 2.5rem;
}

.logo-box {
    width: 64px;
    height: 64px;
    background: var(--color-primary);
    color: white;
    font-size: 1.8rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    margin: 0 auto 1.5rem;
    box-shadow: 0 8px 16px rgba(46, 204, 113, 0.2);
}

.login-brand h1 {
    font-size: 2rem;
    font-weight: 800;
    color: #1a1c1e;
    margin-bottom: 0.5rem;
    letter-spacing: -0.5px;
}

.login-brand p {
    color: #64748b;
    font-size: 0.95rem;
}

.login-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.login-error {
    background: #fff1f2;
    color: #e11d48;
    padding: 1rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.9rem;
    font-weight: 600;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-group label {
    font-size: 0.85rem;
    font-weight: 700;
    color: #475569;
    padding-left: 0.25rem;
}

.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.input-icon {
    position: absolute;
    left: 1rem;
    color: #94a3b8;
    transition: color 0.2s;
}

.input-wrapper input {
    width: 100%;
    padding: 0.85rem 1rem 0.85rem 3rem;
    background: #f8fafc;
    border: 2px solid #f1f5f9;
    border-radius: 14px;
    font-size: 1rem;
    transition: all 0.2s;
    color: #1e293b;
}

.input-wrapper input:focus {
    outline: none;
    border-color: var(--color-primary);
    background: white;
    box-shadow: 0 0 0 4px rgba(46, 204, 113, 0.1);
}

.input-wrapper input:focus + .input-icon {
    color: var(--color-primary);
}

.login-btn {
    margin-top: 1rem;
    background: var(--color-primary);
    color: white;
    border: none;
    padding: 1rem;
    border-radius: 14px;
    font-size: 1rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: none;
}

.login-btn:hover:not(:disabled) {
    background: white;
    color: var(--color-primary);
    border: 2px solid var(--color-primary);
    transform: none;
    box-shadow: none;
}


.login-btn:active:not(:disabled) {
    transform: none;
}


.login-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.spinning {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.login-footer {
    margin-top: 2.5rem;
    text-align: center;
}

.login-footer p {
    font-size: 0.8rem;
    color: #94a3b8;
}
</style>
