import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '../layouts/AdminLayout.vue'
import Dashboard from '../views/Dashboard.vue'
import { useAuthStore } from '../stores/auth'


// Subdomain Check
const host = window.location.host;
const isMenuSubdomain = host.startsWith('menu.');

const adminChildren = [
  {
    path: '',
    name: 'dashboard',
    component: Dashboard
  },
  {
    path: 'notifications',
    name: 'admin-notifications',
    component: () => import('../views/admin/NotificationsView.vue')
  },
  {
    path: 'users',
    name: 'admin-users',
    component: () => import('../views/admin/UsersView.vue')
  },
  {
    path: 'users/new',
    name: 'admin-users-new',
    component: () => import('../views/admin/UserFormView.vue')
  },
  {
    path: 'users/:id/edit',
    name: 'admin-users-edit',
    component: () => import('../views/admin/UserFormView.vue')
  },
  {
    path: 'purchases',
    name: 'admin-purchases',
    component: () => import('../views/admin/PurchasesView.vue')
  },
  {
    path: 'purchases/new',
    name: 'admin-purchases-new',
    component: () => import('../views/admin/PurchaseFormView.vue')
  },
  {
    path: 'purchases/:id/breakdown',
    name: 'admin-purchases-breakdown',
    component: () => import('../views/admin/PurchaseBreakdownView.vue')
  },
  {
    path: 'purchases/:id/edit',
    name: 'admin-purchases-edit',
    component: () => import('../views/admin/PurchaseFormView.vue')
  },
  {
    path: 'fixed-expenses',
    name: 'admin-fixed-expenses',
    component: () => import('../views/admin/FixedExpensesView.vue')
  },
  {
    path: 'fixed-expenses/new',
    name: 'admin-fixed-expenses-new',
    component: () => import('../views/admin/FixedExpenseFormView.vue')
  },
  {
    path: 'fixed-expenses/:id/edit',
    name: 'admin-fixed-expenses-edit',
    component: () => import('../views/admin/FixedExpenseFormView.vue')
  },
  {
    path: 'inventory',
    name: 'admin-inventory',
    component: () => import('../views/admin/InventoryView.vue')
  },
  {
    path: 'customers',
    name: 'admin-customers',
    component: () => import('../views/admin/CustomersView.vue')
  },
  {
    path: 'recipes',
    name: 'admin-recipes',
    component: () => import('../views/admin/RecipesView.vue')
  },
  {
    path: 'recipes/new',
    name: 'admin-recipe-new',
    component: () => import('../views/admin/RecipeFormView.vue')
  },
  {
    path: 'recipes/:id/edit',
    name: 'admin-recipe-edit',
    component: () => import('../views/admin/RecipeFormView.vue')
  },
  {
    path: 'menu/new',
    name: 'admin-menu-new',
    component: () => import('../views/admin/MenuFormView.vue')
  },
  {
    path: 'menu',
    name: 'admin-menu',
    component: () => import('../views/admin/MenuListView.vue')
  },
  {
    path: 'menu/:id/edit',
    name: 'admin-menu-edit',
    component: () => import('../views/admin/MenuFormView.vue')
  },
  {
    path: 'cxc',
    name: 'admin-cxc',
    component: () => import('../views/admin/CXCView.vue')
  },
  {
    path: 'patients',
    name: 'admin-patients',
    component: () => import('../views/admin/WorkingView.vue'),
    props: { title: 'Pacientes' }
  },
  {
    path: 'loyalty',
    name: 'admin-loyalty',
    component: () => import('../views/admin/WorkingView.vue'),
    props: { title: 'Fidelidad' }
  },
];

const posChildren = [
  {
    path: 'orders',
    name: 'pos-orders',
    component: () => import('../views/pos/OrdersView.vue')
  },
  {
    path: 'terminal',
    name: 'pos-terminal',
    component: () => import('../views/pos/POSView.vue')
  },
  {
    path: 'reports',
    name: 'pos-reports',
    component: () => import('../views/pos/ReportsView.vue')
  },
  {
    path: 'history',
    name: 'pos-history',
    component: () => import('../views/pos/HistoryView.vue')
  }
];

const finalRoutes = [
  // 1. Root Route -> Public Menu
  {
    path: '/',
    name: 'root',
    component: () => import('../views/customer/MenuView.vue'),
    meta: { public: true }
  },
  // 2. Login
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true }
  },
  // 3. Admin Routes (Protected)
  {
    path: '/admin',
    component: AdminLayout,
    children: adminChildren
    // Note: Dashboard is at /admin/
  },
  // 4. POS Routes (Protected, also use AdminLayout)
  {
    path: '/pos',
    component: AdminLayout,
    children: posChildren
  },
  // 5. Explicit Menu Route (Old link compatibility)
  {
    path: '/menu',
    redirect: '/'
  },
  // Public Pages
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


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: finalRoutes
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  // 1. Redirect to login if not authenticated and trying to access protected route
  if (!to.meta.public && !auth.isAuthenticated) {
    return next({ name: 'login' });
  }

  // 2. Redirect to Dashboard if logged in and visiting login or root (optional, but user wants root as menu)
  // If user visits /login and is auth -> go to /admin (Dashboard)
  if (to.name === 'login' && auth.isAuthenticated) {
    return next('/admin');
  }

  // 3. RBAC Logic
  if (auth.isAuthenticated) {
    const role = auth.user?.role;
    const path = to.path;

    // --- DASHBOARD ACCESS (Now at /admin or /admin/) ---
    // Only Admin can see Dashboard
    if (to.name === 'dashboard' && role !== 'Administrador') {
      // Redirect to a safe default page
      if (role === 'Operativo') return next('/pos/orders');
      if (role === 'Gerencia') return next('/pos/terminal'); 
    }

    // --- OPERATIVO RESTRICTIONS ---
    if (role === 'Operativo') {
      // Allowed: /pos/*, /admin/inventory, /admin/purchases, /admin/patients, /admin/loyalty
      const allowedAdminPrefixes = [
        '/admin/inventory',
        '/admin/purchases',
        '/admin/patients',
        '/admin/loyalty'
      ];

      // If it's an admin path...
      if (path.startsWith('/admin/')) {
        // ...and NOT one of the allowed prefixes
        if (!allowedAdminPrefixes.some(prefix => path.startsWith(prefix))) {
           return next('/pos/orders');
        }
      }
    }

    // --- GERENCIA RESTRICTIONS ---
    if (role === 'Gerencia') {
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
