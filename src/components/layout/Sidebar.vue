<script setup>
import { 
  LayoutDashboard, 
  ShoppingCart, 
  DollarSign, 
  Package, 
  Utensils, 
  ChevronDown,
  ClipboardList,
  CreditCard,
  BarChart3,
  Menu,
  Box,
  Users,
  History,
  UserCog,
  BookOpen,
  X,
  Heart,
  Award
} from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth';

const props = defineProps({
  isCollapsed: {
    type: Boolean,
    default: false
  }
});

defineEmits(['toggle']);

const auth = useAuthStore();
</script>

<template>
  <aside class="sidebar" :class="{ 'collapsed': isCollapsed }">
    <div class="logo-area">
      <img v-if="!isCollapsed" src="/logo-bambu.png" alt="Bambú Cloud" class="sidebar-logo" />

      <div v-else class="logo-icon">BC</div>
      <button class="sidebar-toggle-btn" @click="$emit('toggle')">
        <Menu size="18" class="icon-desktop" />
        <X size="24" class="icon-mobile" />
      </button>
    </div>

    <nav class="nav-menu">
      <router-link v-if="auth.isAdmin" to="/admin" class="nav-item" active-class="active">
        <LayoutDashboard size="20" />
        <span v-if="!isCollapsed">Dashboard</span>
      </router-link>

      <div class="nav-group">
        <div v-if="!isCollapsed" class="group-label">ADMINISTRACIÓN</div>
        <div v-else class="group-divider"></div>
        
        <router-link v-if="auth.isAdmin || auth.isGerencia || auth.isOperativo" to="/admin/purchases" class="nav-item" active-class="active">
          <ShoppingCart size="20" />
          <span v-if="!isCollapsed">Compras</span>
        </router-link>

        <router-link v-if="auth.isAdmin" to="/admin/fixed-expenses" class="nav-item" active-class="active">
          <DollarSign size="20" />
          <span v-if="!isCollapsed">Gastos Fijos</span>
        </router-link>

        <router-link to="/admin/inventory" class="nav-item" active-class="active">
          <Package size="20" />
          <span v-if="!isCollapsed">Inventario</span>
        </router-link>

        <router-link to="/admin/patients" class="nav-item" active-class="active">
          <Heart size="20" />
          <span v-if="!isCollapsed">Pacientes</span>
        </router-link>

        <router-link to="/admin/loyalty" class="nav-item" active-class="active">
          <Award size="20" />
          <span v-if="!isCollapsed">Fidelidad</span>
        </router-link>

        <router-link v-if="auth.isAdmin" to="/admin/recipes" class="nav-item" active-class="active">
          <Utensils size="20" />
          <span v-if="!isCollapsed">Recetas</span>
        </router-link>

        <router-link v-if="auth.isAdmin" to="/admin/menu" class="nav-item" active-class="active">
          <BookOpen size="20" />
          <span v-if="!isCollapsed">Carta</span>
        </router-link>

        <router-link v-if="auth.isAdmin || auth.isGerencia" to="/admin/customers" class="nav-item" active-class="active">
          <Users size="20" />
          <span v-if="!isCollapsed">Clientes</span>
        </router-link>

        <router-link v-if="auth.isAdmin || auth.isGerencia" to="/admin/cxc" class="nav-item" active-class="active">
          <CreditCard size="20" />
          <span v-if="!isCollapsed">CXC</span>
        </router-link>

        <router-link v-if="auth.isAdmin" to="/admin/users" class="nav-item" active-class="active">
          <UserCog size="20" />
          <span v-if="!isCollapsed">Operadores</span>
        </router-link>
      </div>

      <div class="nav-group">
        <div v-if="!isCollapsed" class="group-label">CAJA</div>
        <div v-else class="group-divider"></div>
        
        <router-link to="/pos/orders" class="nav-item" active-class="active">
          <ClipboardList size="20" />
          <span v-if="!isCollapsed">Órdenes</span>
        </router-link>

        <router-link to="/pos/terminal" class="nav-item" active-class="active">
          <CreditCard size="20" />
          <span v-if="!isCollapsed">POS</span>
        </router-link>

        <router-link to="/pos/reports" class="nav-item" active-class="active">
          <BarChart3 size="20" />
          <span v-if="!isCollapsed">Reportes</span>
        </router-link>

        <router-link to="/pos/history" class="nav-item" active-class="active">
          <History size="20" />
          <span v-if="!isCollapsed">Historial</span>
        </router-link>
      </div>



    </nav>
    
    <div class="sidebar-footer mobile-only">
        <img src="/logo-bambu.png" alt="Bambú Cloud" class="footer-logo" />
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 260px;
  height: 100vh;
  background-color: var(--bg-surface);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1.25rem;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow-x: hidden;
  box-shadow: var(--shadow-xl); /* Add shadow for depth */
}

.sidebar.collapsed {
  width: 72px;
  padding: 1.5rem 0.5rem;
}

.logo-area {
  margin-bottom: 2.5rem;
  padding: 0 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
}

.collapsed .logo-area {
  flex-direction: column;
  gap: 1.5rem;
}

.sidebar-logo {
  height: 40px;
  width: auto;
  object-fit: contain;
  max-width: 140px;
}


.logo-icon {
  font-size: 1.15rem;
  font-weight: 900;
  color: var(--color-primary);
  background: var(--color-accent);
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-toggle-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: background 0.2s;
}

.sidebar-toggle-btn:hover {
  background: var(--bg-app);
  color: var(--color-primary);
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.group-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  padding-left: 1rem;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.group-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 1.5rem 0.5rem 0.5rem 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.collapsed .nav-item {
  justify-content: center;
  padding: 0.75rem;
  gap: 0;
}

.nav-item:hover {
  background-color: var(--bg-app);
  color: var(--color-primary);
}

.nav-item.active {
  background-color: var(--color-accent);
  color: var(--color-primary);
}


.icon-mobile { display: none; }
.mobile-only { display: none; } /* Hidden by default */

/* --- MOBILE STYLES --- */
@media (max-width: 768px) {
  .sidebar {
      transform: translateY(100%); /* Start from bottom? No, simpler to slide from left but cover full screen */
      transform: translateX(-100%);
      width: 100% !important; /* Full width */
      height: 100vh;
      z-index: 3000; /* Top level */
      padding: 1.5rem;
      overflow-y: auto; /* Scrollable */
  }

  /* When open class is added */
  .sidebar.mobile-open {
      transform: translateX(0);
  }
  
  /* Show the close button on mobile, positioned nicely */
  .sidebar-toggle-btn {
      display: flex;
      background: transparent;
      width: auto;
      height: auto;
      border: none;
      color: var(--text-main);
      padding: 0.5rem; /* Larger touch area */
  }

  .icon-desktop { display: none; }
  .icon-mobile { display: block; }

  .logo-area {
      margin-bottom: 2rem;
      padding: 0;
      justify-content: space-between; /* Logo left, X right */
  }
  
  .mobile-only { display: block; }
  
  .sidebar-footer {
      margin-top: 2rem;
      margin-bottom: 50px; /* Requested 50px bottom margin */
      display: flex;
      justify-content: center;
      opacity: 0.6;
  }
  
  .footer-logo {
      height: 30px; /* Smaller logo */
      width: auto;
  }
}
</style>
