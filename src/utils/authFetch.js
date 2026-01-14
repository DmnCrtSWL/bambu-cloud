import { useAuthStore } from '../stores/auth';

export async function authFetch(url, options = {}) {
    const authStore = useAuthStore();
    
    // Ensure headers object exists
    options.headers = options.headers || {};
    
    // Add Authorization header if token exists
    if (authStore.token) {
        options.headers['Authorization'] = `Bearer ${authStore.token}`;
    }
    
    // Default to JSON content type if not specified (and not FormData)
    if (!(options.body instanceof FormData) && !options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(url, options);

        // Handle 401 Unauthorized (Token expired or user deleted)
        if (response.status === 401) {
            console.warn('⚠️ Unauthorized access. Logging out...');
            authStore.logout();
            window.location.href = '/login'; // Force redirect
            throw new Error('Sesión expirada o inválida');
        }

        return response;
    } catch (error) {
        throw error;
    }
}
