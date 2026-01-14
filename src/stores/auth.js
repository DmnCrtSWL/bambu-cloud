import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
    const user = ref(JSON.parse(localStorage.getItem('user')) || null);
    const token = ref(localStorage.getItem('token') || null);

    const isAuthenticated = computed(() => !!token.value);
    const isAdmin = computed(() => user.value?.role === 'Administrador');
    const isGerencia = computed(() => user.value?.role === 'Gerencia');
    const isOperativo = computed(() => user.value?.role === 'Operativo');

    async function login(username, password) {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al iniciar sesión');
        }

        const data = await response.json();
        user.value = data.user;
        token.value = data.token;

        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
    }

    async function refreshUser() {
        if (!user.value?.id) return;
        try {
            const res = await fetch(`/api/users/${user.value.id}`);
            if (res.ok) {
                const updatedUser = await res.json();
                user.value = { ...user.value, ...updatedUser };
                localStorage.setItem('user', JSON.stringify(user.value));
            }
        } catch (err) {
            console.error('Failed to refresh user', err);
        }
    }

    function logout() {
        user.value = null;
        token.value = null;
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    }

    return {
        user,
        token,
        isAuthenticated,
        isAdmin,
        isGerencia,
        isOperativo,
        login,
        logout,
        refreshUser
    };
});
