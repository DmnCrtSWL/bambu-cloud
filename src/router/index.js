import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '../layouts/AdminLayout.vue'
import Dashboard from '../views/Dashboard.vue'
import { useAuthStore } from '../stores/auth'


// Subdomain Check
const host = window.location.host;
const isMenuSubdomain = host.startsWith('menu.');

const routes = [
  // 1. Root Route (Conditional)
  {
    path: '/',
    name: 'root',
    component: isMenuSubdomain
      ? () => import('../views/customer/MenuView.vue')
      : AdminLayout,
    children: isMenuSubdomain ? [] : [
      // Admin Children (Dashboard, etc) - Only load these if NOT menu subdomain to avoid overhead/conflicts
      {
        path: '',
        name: 'dashboard',
        component: Dashboard
      },
      // ... (We need to move the rest of the children here or struct them differently)
      // Actually, cleaner way: Define two top level routes structure and pick one.
    ]
  },
  // 2. Explicit Menu Route (For Dev/Testing without subdomain)
  {
    path: '/menu',
    name: 'menu-public',
    component: () => import('../views/customer/MenuView.vue'),
    meta: { public: true }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true }
  },
];

// Re-structuring routes to be cleaner:
const adminChildren = [
  {
    path: '',
    name: 'dashboard',
    component: Dashboard
  },
  {
    path: 'admin/notifications',
    name: 'admin-notifications',
    component: () => import('../views/admin/NotificationsView.vue')
  },
  {
    path: 'admin/users',
    name: 'admin-users',
    component: () => import('../views/admin/UsersView.vue')
  },
  {
    path: 'admin/users/new',
    name: 'admin-users-new',
    component: () => import('../views/admin/UserFormView.vue')
  },
  {
    path: 'admin/users/:id/edit',
    name: 'admin-users-edit',
    component: () => import('../views/admin/UserFormView.vue')
  },
  {
    path: 'admin/purchases',
    name: 'admin-purchases',
    component: () => import('../views/admin/PurchasesView.vue')
  },
  {
    path: 'admin/purchases/new',
    name: 'admin-purchases-new',
    component: () => import('../views/admin/PurchaseFormView.vue')
  },
  {
    path: 'admin/purchases/:id/breakdown',
    name: 'admin-purchases-breakdown',
    component: () => import('../views/admin/PurchaseBreakdownView.vue')
  },
  {
    path: 'admin/purchases/:id/edit',
    name: 'admin-purchases-edit',
    component: () => import('../views/admin/PurchaseFormView.vue')
  },
  {
    path: 'admin/fixed-expenses',
    name: 'admin-fixed-expenses',
    component: () => import('../views/admin/FixedExpensesView.vue')
  },
  {
    path: 'admin/fixed-expenses/new',
    name: 'admin-fixed-expenses-new',
    component: () => import('../views/admin/FixedExpenseFormView.vue')
  },
  {
    path: 'admin/fixed-expenses/:id/edit',
    name: 'admin-fixed-expenses-edit',
    component: () => import('../views/admin/FixedExpenseFormView.vue')
  },
  {
    path: 'admin/inventory',
    name: 'admin-inventory',
    component: () => import('../views/admin/InventoryView.vue')
  },
  {
    path: 'admin/customers',
    name: 'admin-customers',
    component: () => import('../views/admin/CustomersView.vue')
  },
  {
    path: 'admin/recipes',
    name: 'admin-recipes',
    component: () => import('../views/admin/RecipesView.vue')
  },
  {
    path: 'admin/recipes/new',
    name: 'admin-recipe-new',
    component: () => import('../views/admin/RecipeFormView.vue')
  },
  {
    path: 'admin/recipes/:id/edit',
    name: 'admin-recipe-edit',
    component: () => import('../views/admin/RecipeFormView.vue')
  },
  {
    path: 'admin/menu/new',
    name: 'admin-menu-new',
    component: () => import('../views/admin/MenuFormView.vue')
  },
  {
    path: 'admin/menu',
    name: 'admin-menu',
    component: () => import('../views/admin/MenuListView.vue')
  },
  {
    path: 'admin/menu/:id/edit',
    name: 'admin-menu-edit',
    component: () => import('../views/admin/MenuFormView.vue')
  },
  {
    path: 'admin/cxc',
    name: 'admin-cxc',
    component: () => import('../views/admin/CXCView.vue')
  },
  // POS Module
  {
    path: 'pos/orders',
    name: 'pos-orders',
    component: () => import('../views/pos/OrdersView.vue')
  },
  {
    path: 'pos/terminal',
    name: 'pos-terminal',
    component: () => import('../views/pos/POSView.vue')
  },
  {
    path: 'pos/reports',
    name: 'pos-reports',
    component: () => import('../views/pos/ReportsView.vue')
  },
  {
    path: 'pos/history',
    name: 'pos-history',
    component: () => import('../views/pos/HistoryView.vue')
  }
];

const finalRoutes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/menu',
    name: 'menu-dev',
    component: () => import('../views/customer/MenuView.vue'),
    meta: { public: true }
  },
  {
    path: '/privacy-policy',
    name: 'privacy',
    component: () => import('../views/public/PrivacyPolicyView.vue'),
    meta: { public: true }
  },
  {
    path: '/terms-conditions',
    name: 'terms',
    component: () => import('../views/public/TermsView.vue'),
    meta: { public: true }
  }
];

if (isMenuSubdomain) {
  // If exploring menu.domain.com, root IS the menu
  finalRoutes.push({
    path: '/',
    name: 'menu-root',
    component: () => import('../views/customer/MenuView.vue'),
    meta: { public: true }
  });
  // Admin routes are NOT added here, effectively blocking them on this subdomain
} else {
  // Normal Admin Domain
  finalRoutes.push({
    path: '/',
    component: AdminLayout,
    children: adminChildren
  });
}


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: finalRoutes
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  // 1. Redirect to login if not authenticated
  if (!to.meta.public && !auth.isAuthenticated) {
    return next({ name: 'login' });
  }

  // 2. Redirect to dashboard if logged in and visiting login
  if (to.name === 'login' && auth.isAuthenticated) {
    return next({ name: 'dashboard' });
  }

  // 3. RBAC Logic
  if (auth.isAuthenticated) {
    const role = auth.user?.role;
    const path = to.path;

    // --- DASHBOARD ACCESS ---
    // Only Admin can see Dashboard
    if (to.name === 'dashboard' && role !== 'Administrador') {
      // Redirect to a safe default page
      if (role === 'Operativo') return next('/pos/terminal');
      if (role === 'Gerencia') return next('/pos/terminal'); // Or purchases
    }

    // --- OPERATIVO RESTRICTIONS ---
    if (role === 'Operativo') {
      // Allowed: /pos/*, /admin/inventory
      // Blocked: Everything else in /admin/
      if (path.startsWith('/admin/') && !path.startsWith('/admin/inventory')) {
        return next('/pos/terminal');
      }
    }

    // --- GERENCIA RESTRICTIONS ---
    if (role === 'Gerencia') {
      // Allowed: /pos/*, /admin/inventory, /admin/purchases, /admin/customers
      // Blocked: /admin/users, /admin/fixed-expenses, /admin/recipes
      const blockedPrefixes = [
        '/admin/users',
        '/admin/fixed-expenses',
        '/admin/recipes'
      ];
      if (blockedPrefixes.some(prefix => path.startsWith(prefix))) {
        return next('/pos/terminal');
      }
    }
  }

  next();
})

export default router
