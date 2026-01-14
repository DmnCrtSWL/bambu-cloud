<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import Sidebar from '../components/layout/Sidebar.vue';
import LockScreen from '../components/auth/LockScreen.vue';
import StockAlert from '../components/admin/StockAlert.vue';
import OrderAlert from '../components/admin/OrderAlert.vue';
import { Bell, UserCircle, BookOpen, LogOut, ChevronDown, Trash2, Check, Menu, X, BellOff, ClipboardList, CreditCard, BarChart3, History } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useNotificationStore } from '../stores/notifications';

import { useRouter, useRoute } from 'vue-router';

const auth = useAuthStore();
const notifStore = useNotificationStore();
const router = useRouter();
const route = useRoute(); // To watch route changes

// State
const isCollapsed = ref(false); // Desktop Mini Mode
const isMobileOpen = ref(false); // Mobile Drawer Mode
const showUserMenu = ref(false);
const showNotifMenu = ref(false);

// Screen size detection
const isMobile = ref(false);

// Idle & Lock State
const isLocked = ref(false);
let lastActivity = Date.now();
let idleInterval = null;

const checkMobile = () => {
    isMobile.value = window.innerWidth < 768;
    if (!isMobile.value) {
        isMobileOpen.value = false; // Reset on desktop
    }
};

const toggleSidebar = () => {
  if (isMobile.value) {
      isMobileOpen.value = !isMobileOpen.value;
  } else {
      isCollapsed.value = !isCollapsed.value;
  }
};

const closeMobileSidebar = () => {
    isMobileOpen.value = false;
};

// Computed to pass to Sidebar
const sidebarCollapsedState = computed(() => {
    // On mobile, never use "collapsed/mini" mode styles, just full or hidden.
    if (isMobile.value) return false; 
    return isCollapsed.value;
});

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value;
  if (showUserMenu.value) showNotifMenu.value = false;
};

const toggleNotifMenu = () => {
    showNotifMenu.value = !showNotifMenu.value;
    if (showNotifMenu.value) {
        showUserMenu.value = false;
        // Optional: Mark as read immediately? No, user might want to scan.
    }
};

const handleNotifClick = (notification) => {
    notifStore.markAsRead(notification.id);
    showNotifMenu.value = false;
    if (notification.detailsRoute) {
        router.push(notification.detailsRoute);
    }
    closeMobileSidebar();
};

const goToPublicMenu = () => {
    router.push('/menu');
};

const handleLogout = () => {
    disconnectIdleListener();
    auth.logout();
    router.push('/login');
};

const handleUnlock = () => {
    isLocked.value = false;
    lastActivity = Date.now(); // Reset timer
};

// Update activity timestamp
const updateActivity = () => {
    if (!isLocked.value) {
        lastActivity = Date.now();
    }
};

// Check idle status (Called every 1s)
const checkIdle = () => {
    const idleTime = Date.now() - lastActivity;
    
    // Skip for Admins or if no PIN set
    if (auth.user?.role === 'Administrador' || !auth.user?.accessPin) return;

    // 10 minutes (600,000 ms) -> Auto Logout
    if (idleTime > 600000) {
        handleLogout();
        return;
    }

    // 1 minute (60,000 ms) -> Lock Screen
    if (idleTime > 60000 && !isLocked.value) {
        isLocked.value = true;
    }
};

const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

const connectIdleListener = () => {
    events.forEach(event => window.addEventListener(event, updateActivity));
    idleInterval = setInterval(checkIdle, 1000);
};

const disconnectIdleListener = () => {
    events.forEach(event => window.removeEventListener(event, updateActivity));
    if (idleInterval) clearInterval(idleInterval);
};

// DOM Ref
const pageContainer = ref(null);

onMounted(async () => {
    await auth.refreshUser(); // Ensure we have latest data (PIN)
    connectIdleListener();
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Attach to the actual scrollable container
    if (pageContainer.value) {
        pageContainer.value.addEventListener('scroll', handleScroll, { passive: true });
    }
});

onUnmounted(() => {
    disconnectIdleListener();
    window.removeEventListener('resize', checkMobile);
    if (pageContainer.value) {
        pageContainer.value.removeEventListener('scroll', handleScroll);
    }
});

// Scroll handling for mobile nav
const lastScrollY = ref(0);
const isNavVisible = ref(true);

const handleScroll = () => {
    if (!isMobile.value || !pageContainer.value) return;
    
    const currentScrollY = pageContainer.value.scrollTop;
    
    // Threshold to prevent jitter (e.g. 10px)
    if (Math.abs(currentScrollY - lastScrollY.value) < 10) return;

    if (currentScrollY > lastScrollY.value && currentScrollY > 50) {
        // Scrolling Down & deeper than 50px -> Hide
        isNavVisible.value = false;
    } else {
        // Scrolling Up -> Show
        isNavVisible.value = true;
    }
    
    lastScrollY.value = currentScrollY;
};

// Close sidebar on route change (Mobile)
import { watch } from 'vue';
watch(() => route.fullPath, () => {
    if (isMobile.value) isMobileOpen.value = false;
});
</script>

<template>
  <div class="admin-layout">
    
    <!-- Mobile Overlay -->
    <div 
        v-if="isMobile && isMobileOpen" 
        class="mobile-overlay"
        @click="closeMobileSidebar"
    ></div>

    <Sidebar 
        :is-collapsed="sidebarCollapsedState" 
        :class="{ 'mobile-open': isMobileOpen }"
        @toggle="toggleSidebar" 
    />

    <main class="main-content" :class="{ 'sidebar-collapsed': isCollapsed }">
      <header class="topbar">
        <div class="left-actions">
            <!-- Mobile Toggle -->
            <button class="mobile-toggle-btn" @click="toggleSidebar">
                <Menu size="24" />
            </button>
            <BookOpen size="24" class="header-icon" @click="goToPublicMenu" title="Ver Menú Público" />
        </div>

        <div class="actions">


          <div class="notif-menu-container">
            <div class="header-icon-wrapper" @click="toggleNotifMenu" :class="{'active': showNotifMenu}">
                <Bell size="24" class="header-icon" />
                <span v-if="notifStore.unreadCount > 0" class="badge">{{ notifStore.unreadCount }}</span>
            </div>
            
            <!-- Notification Dropdown (Desktop Only) -->
            <div v-if="showNotifMenu && !isMobile" class="dropdown-menu notif-dropdown">
                <div class="dropdown-header">
                    <span class="font-bold">Notificaciones</span>
                    <span class="text-sm text-muted">Recientes</span>
                </div>
                
                <div v-if="notifStore.notifications.length === 0" class="p-4 text-center text-muted text-sm empty-state">
                    <BellOff size="32" class="mb-2 opacity-50 mx-auto" />
                    <p>No hay notificaciones nuevas</p>
                </div>

                <div class="notif-list" v-else>
                    <div 
                        v-for="note in notifStore.notifications.slice(0, 5)" 
                        :key="note.id" 
                        class="notif-item"
                        :class="{'unread': !note.read}"
                        @click="handleNotifClick(note)"
                    >
                        <div class="notif-icon" :class="note.type || 'info'">
                            <span v-if="note.type === 'warning'">⚠️</span>
                            <span v-else>🔸</span>
                        </div>
                        <div class="notif-content">
                            <h5 class="notif-title">{{ note.title }}</h5>
                            <p class="notif-message line-clamp-2">{{ note.message }}</p>
                            <span class="notif-time">{{ new Date(note.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}</span>
                        </div>
                    </div>
                </div>
                
                <div class="dropdown-footer">
                    <button @click="router.push('/admin/notifications'); showNotifMenu=false;" class="see-all-btn">
                        Ver todas las notificaciones
                    </button>
                </div>
            </div>
          </div>
          
          <div class="user-menu-container">
            <div class="profile" @click="toggleUserMenu">
              <UserCircle size="32" class="avatar" />
              <div class="profile-info">
                <span class="name">{{ auth.user?.name || 'Usuario' }}</span>
                <span class="role">{{ auth.user?.role || 'Invitado' }}</span>
              </div>
              <ChevronDown size="16" class="chevron" :class="{ 'rotated': showUserMenu }" />
            </div>

            <div v-if="showUserMenu" class="dropdown-menu user-dropdown">
              <button class="dropdown-item danger" @click="handleLogout">
                <LogOut size="16" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>

        </div>
      </header>
      <div class="page-container" ref="pageContainer">
        <router-view />
      </div>
      
      
    </main>
    
    <!-- Headless Alert Controllers -->
    <StockAlert />
    <OrderAlert />

    <!-- Mobile Bottom Navigation -->
    <nav v-if="isMobile" class="mobile-bottom-nav" :class="{ 'nav-hidden': !isNavVisible }">
        <!-- 1. Hamburger / Sidebar -->
        <button class="mobile-nav-item" @click="toggleSidebar">
            <Menu size="24" />
            <span>Menú</span>
        </button>
        
        <!-- 2. Public Menu Link -->
        <button class="mobile-nav-item" @click="goToPublicMenu">
            <BookOpen size="24" />
            <span>Carta</span>
        </button>
        
        <!-- 3. User Menu (Notifications removed from here) -->
        <button 
            class="mobile-nav-item"
            :class="{ 'active': showUserMenu }"
            @click="toggleUserMenu"
        >
            <UserCircle size="24" />
            <span>Perfil</span>
        </button>
    </nav>
    
    <!-- Mobile Floating Notification Bell -->
    <button 
        v-if="isMobile"
        class="mobile-floating-btn"
        :class="{ 'nav-hidden': !isNavVisible, 'active': showNotifMenu }"
        @click="toggleNotifMenu"
    >
        <div class="icon-badge-wrapper">
            <Bell size="24" />
            <span v-if="notifStore.unreadCount > 0" class="floating-badge">{{ notifStore.unreadCount }}</span>
        </div>
    </button>
    
    <!-- Mobile User Menu Overlay (Bottom Sheet style) -->
    <div v-if="isMobile && showUserMenu" class="mobile-user-sheet">
        <div class="sheet-header">
            <h3>Mi Cuenta</h3>
            <button @click="showUserMenu = false"><X size="20" /></button>
        </div>
        <div class="sheet-body">
            <div class="user-info-card">
                 <UserCircle size="48" class="text-primary" />
                 <div>
                    <h4>{{ auth.user?.name || 'Usuario' }}</h4>
                    <span class="role-badge">{{ auth.user?.role || 'Invitado' }}</span>
                 </div>
            </div>
            <button class="sheet-action danger" @click="handleLogout">
                <LogOut size="20" />
                <span>Cerrar Sesión</span>
            </button>
        </div>
    </div>

    <!-- Mobile Notifications Sheet (Bottom Sheet style) -->
    <div v-if="isMobile && showNotifMenu" class="mobile-notifications-sheet">
        <div class="sheet-header">
            <h3>Notificaciones</h3>
            <button @click="showNotifMenu = false"><X size="20" /></button>
        </div>
        
        <div v-if="notifStore.notifications.length === 0" class="p-4 text-center text-muted text-sm empty-state">
            <BellOff size="32" class="mb-2 opacity-50 mx-auto" />
            <p>No hay notificaciones nuevas</p>
        </div>

        <div class="sheet-body p-0" v-else>
             <div 
                v-for="note in notifStore.notifications.slice(0, 10)" 
                :key="note.id" 
                class="notif-item"
                :class="{'unread': !note.read}"
                @click="handleNotifClick(note)"
            >
                <div class="notif-icon" :class="note.type || 'info'">
                    <span v-if="note.type === 'warning'">⚠️</span>
                    <span v-else>🔸</span>
                </div>
                <div class="notif-content">
                    <h5 class="notif-title">{{ note.title }}</h5>
                    <p class="notif-message line-clamp-2">{{ note.message }}</p>
                    <span class="notif-time">{{ new Date(note.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}</span>
                </div>
            </div>
            
            <div class="p-4">
                <button @click="router.push('/admin/notifications'); showNotifMenu=false;" class="sheet-action secondary">
                    Ver todas
                </button>
            </div>
        </div>
    </div>
    <LockScreen 
        v-if="isLocked" 
        :expected-pin="auth.user?.accessPin"
        :user-name="auth.user?.name"
        :user-role="auth.user?.role"
        @unlock="handleUnlock"
        @logout="handleLogout"
    />
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-app);
}

.main-content {
  flex: 1;
  margin-left: 260px; /* Sidebar width */
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 0; /* Prevent flex children overflow */
}

.main-content.sidebar-collapsed {
  margin-left: 72px;
}

.topbar {
  height: 70px;
  background-color: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 10;
}

.left-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.mobile-toggle-btn {
    display: none; /* Hidden by default */
    background: transparent;
    border: none;
    color: var(--text-main);
    cursor: pointer;
    padding: 0.5rem;
}

.actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-icon {
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
  margin: 0 0.5rem;
}

.header-icon:hover {
  color: var(--color-primary);
  transform: scale(1.1);
}

.header-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.header-icon-wrapper:hover .header-icon,
.header-icon-wrapper.active .header-icon {
  color: var(--color-primary);
}

/* ... existing badge ... */

.see-all-btn {
    background: transparent;
    border: none;
    color: var(--color-primary);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    text-align: center;
    padding: 0.75rem; /* Larger touch target area */
}

.see-all-btn:hover {
    text-decoration: underline;
}

.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background-color: #ef4444;
  color: white;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 10px;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--bg-surface);
}

.user-menu-container {
  position: relative;
}

.notif-menu-container {
  position: relative;
  display: flex;
  align-items: center;
}

.profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--radius-md);
  transition: background-color 0.2s;
}

.profile:hover {
  background-color: var(--bg-app);
}

.avatar {
  color: var(--color-primary);
}

.profile-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.name {
  font-weight: 600;
  font-size: 0.9rem;
}

.role {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.chevron {
  color: var(--text-muted);
  transition: transform 0.2s;
}

.chevron.rotated {
  transform: rotate(180deg);
}

/* Updated Dropdown Logic */
.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 100;
  animation: slideDown 0.2s ease-out;
  overflow: hidden; 
}

.user-dropdown {
    width: 200px;
}

.notif-dropdown {
    width: 320px;
    display: flex;
    flex-direction: column;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.dropdown-header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
}

.notif-list {
    max-height: 350px;
    overflow-y: auto;
}

.notif-item {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    transition: background 0.2s;
}

.notif-item:hover {
    background-color: var(--bg-app);
}

.notif-item.unread {
    background-color: #f0f9ff;
}

.notif-item.unread:hover {
    background-color: #e0f2fe;
}

.notif-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
}

.notif-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
}

.notif-title {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-main);
    margin: 0;
}

.notif-message {
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.3;
}

.notif-time {
    font-size: 0.7rem;
    color: #94a3b8;
    margin-top: 0.2rem;
}

.dropdown-footer {
    padding: 0.5rem;
    background: #f8fafc;
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: center;
}

.clear-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
}

.clear-btn:hover {
    color: var(--color-primary);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  border-radius: 0;
  transition: all 0.2s;
}

.dropdown-item:hover {
  background-color: var(--bg-app);
}

.dropdown-item.danger {
  color: #ef4444; 
}

.dropdown-item.danger:hover {
  background-color: #fca5a51a; 
}

.text-primary { color: var(--color-primary); }
.text-muted { color: var(--text-muted); }

.page-container {
  padding: 2rem;
  flex: 1;
  overflow-y: auto;
}

/* --- MOBILE RESPONSIVE STYLES --- */
.mobile-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 40; /* Behind sidebar (100), above content (10) */
    backdrop-filter: blur(2px);
    animation: fadeIn 0.2s ease-out;
}

/* Mobile Fullscreen Notifications */
.mobile-fullscreen {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100% !important;
    height: 100vh !important;
    margin-top: 0 !important;
    border-radius: 0 !important;
    z-index: 2000 !important; /* Extremely high to cover everything */
    display: flex !important;
    flex-direction: column !important;
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.mobile-fullscreen .notif-list {
    flex: 1;
    max-height: none !important; /* Allow growing */
}

.mobile-fullscreen .dropdown-header {
    padding: 1rem;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-color);
}

.mobile-fullscreen .dropdown-footer {
    padding: 1rem;
    border-top: 1px solid var(--border-color);
    background: var(--bg-surface);
    margin-top: auto; /* Push to bottom */
}

.close-btn-mobile {
    background: transparent;
    border: none;
    border-radius: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-primary); /* Brand Green */
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1;
    padding: 0;
    cursor: pointer;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

/* Media Query for Mobile/Tablet */
@media (max-width: 768px) {
    .main-content {
        margin-left: 0 !important; /* Force no margin */
    }
    
    /* Hide Top Bar elements on mobile since they are now in bottom nav */
    .mobile-toggle-btn,
    .left-actions .header-icon, /* Public Menu Link */
    .actions { /* Notifs & User */
        display: none !important;
    }

    /* Force topbar to be minimal or hidden if empty? 
       Maybe keep Logo if we had one, but currently sidebar has logo.
       If we hide all actions, topbar might be empty. 
       Actually topbar contains 'left-actions' and 'actions'. 
       If we hide both children, it matches requirements? 
       Wait, breadcrumbs? There are none.
       Title? It's in the page view usually.
       So topbar might be empty height 70px white block.
       Let's hide topbar entirely on mobile to save space? 
       User said "simular un menu de un movil", usually app title is in the view.
    */
    .topbar {
        display: none;
    }
    
    /* Adjust page container padding top since topbar is gone */
    .page-container {
        padding-top: 1rem; /* Add some top padding since no header */
    }

    /* Profile info hide name/role on mobile if space tight, 
       but we have space in actions usually. Let's hide role. */
    .profile-info {
        display: none;
    }
    .user-menu-container .profile {
        gap: 0;
    }
    
    /* Mobile Bottom Nav Styles */
    .mobile-bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 65px;
        background: white;
        border-top: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: 50;
        padding-bottom: env(safe-area-inset-bottom);
        box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.05);
        transition: transform 0.3s ease; /* Smooth toggle */
    }

    .mobile-bottom-nav.nav-hidden {
        transform: translateY(100%); /* Slide out */
    }

    .mobile-nav-item {
        flex: 1; /* Equal 25% width */
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--text-muted);
        text-decoration: none;
        background: transparent;
        border: none;
        gap: 4px;
        transition: all 0.2s;
        cursor: pointer;
    }

    .mobile-nav-item span {
        font-size: 0.7rem;
        font-weight: 600;
        font-family: inherit;
    }

    .mobile-nav-item.active {
        color: var(--color-primary);
        background: rgba(15, 118, 110, 0.05); /* Subtle bg hint */
        border-top: 3px solid var(--color-primary); /* Indicator */
    }
    
    .mobile-floating-btn {
        position: fixed;
        bottom: 85px; /* Above nav (65px) + 20px */
        right: 20px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: white;
        color: var(--text-muted);
        border: 1px solid var(--border-color);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 50;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.3s ease, opacity 0.3s ease;
        padding: 0;
        cursor: pointer;
    }
    
    .mobile-floating-btn.nav-hidden {
         transform: translateY(200%); /* Slide down out of view */
         opacity: 0;
    }

    .mobile-floating-btn.active {
        color: var(--color-primary);
        background: #f0fdfa; /* Light primary */
        border-color: var(--color-primary);
    }
    
    .floating-badge {
        position: absolute;
        top: -2px;
        right: -2px;
        background: #ef4444;
        color: white;
        font-size: 0.65rem;
        font-weight: 700;
        min-width: 18px;
        height: 18px;
        border-radius: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
    }
    
    .icon-badge-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .nav-badge {
        position: absolute;
        top: -4px;
        right: -6px;
        background-color: #ef4444;
        color: white;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        border-radius: 10px;
        font-size: 0.65rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
    }

    /* Add padding to page container so content isn't covered by bottom nav */
    .page-container {
        padding-bottom: 80px !important; 
    }
    
    /* User Sheet Styles */
    .mobile-user-sheet {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        background: white;
        z-index: 2001; /* Above mobile-fullscreen notifs if active? Same layer */
        border-top-left-radius: 20px;
        border-top-right-radius: 20px;
        box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
        animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        padding-bottom: env(safe-area-inset-bottom);
        overflow: hidden;
    }
    
    .sheet-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid var(--border-color);
    }
    
    .sheet-header h3 { margin: 0; font-size: 1.1rem; }
    .sheet-header button { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-muted); }
    
    .sheet-body {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    
    .user-info-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: #f8fafc;
        border-radius: 12px;
    }
    
    .user-info-card h4 { margin: 0; font-size: 1.1rem; }
    .role-badge { 
        font-size: 0.8rem; 
        background: #e2e8f0; 
        padding: 2px 8px; 
        border-radius: 4px; 
        color: #475569; 
        margin-top: 4px; 
        display: inline-block;
    }
    
    .sheet-action {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 1rem;
        border-radius: 12px;
        border: none;
        font-weight: 600;
        cursor: pointer;
        font-size: 1rem;
    }
    
    .sheet-action.danger {
        background: #fee2e2;
        color: #ef4444;
    }
    
    .sheet-action.secondary {
        background: #e2e8f0;
        color: #475569;
    }
    
    /* Notification Sheet Specifics */
    .mobile-notifications-sheet {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        background: white;
        z-index: 2001; /* Above mobile-fullscreen notifs if active? Same layer */
        border-top-left-radius: 20px;
        border-top-right-radius: 20px;
        box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
        animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        padding-bottom: env(safe-area-inset-bottom);
        overflow: hidden;
        max-height: 80vh; /* Limit height */
        display: flex;
        flex-direction: column;
    }
    
    .mobile-notifications-sheet .sheet-body {
        padding: 0;
        overflow-y: auto;
    }
}
</style>
