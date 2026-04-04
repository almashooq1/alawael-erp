<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Link, router, usePage } from '@inertiajs/vue3';

const props = defineProps({
  title: {
    type: String,
    default: 'لوحة التحكم',
  },
  sidebarCollapsed: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['toggle-sidebar', 'toggle-dark']);

const page = usePage();
const authUser = computed(() => page.props.auth?.user);
const userInitials = computed(() => {
  const name = authUser.value?.name ?? '';
  return name.charAt(0) || 'م';
});

// ======================================================
// Dark Mode
// ======================================================
const isDark = ref(false);

function initDarkMode() {
  isDark.value =
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  applyDark();
}

function applyDark() {
  document.documentElement.classList.toggle('dark', isDark.value);
}

function toggleDark() {
  isDark.value = !isDark.value;
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
  applyDark();
  emit('toggle-dark', isDark.value);
}

onMounted(initDarkMode);

// ======================================================
// Logout
// ======================================================
function logout() {
  router.post('/logout');
}

// ======================================================
// Notifications dropdown
// ======================================================
const showNotifications = ref(false);
const showProfile = ref(false);
const notifRef = ref(null);
const profileRef = ref(null);

const notifications = ref([
  {
    id: 1,
    type: 'appointment',
    title: 'موعد جديد',
    body: 'أحمد محمد - غداً 10:00 ص',
    time: 'منذ 5 دقائق',
    read: false,
    color: 'brand',
  },
  {
    id: 2,
    type: 'invoice',
    title: 'فاتورة معلقة',
    body: 'فاتورة #INV-00001 تنتظر الدفع',
    time: 'منذ ساعة',
    read: false,
    color: 'warning',
  },
  {
    id: 3,
    type: 'session',
    title: 'جلسة مكتملة',
    body: 'تمت جلسة سارة العتيبي بنجاح',
    time: 'منذ 3 ساعات',
    read: true,
    color: 'success',
  },
]);

const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length);

function markAllRead() {
  notifications.value.forEach((n) => (n.read = true));
}

function closeDropdowns(e) {
  if (notifRef.value && !notifRef.value.contains(e.target)) {
    showNotifications.value = false;
  }
  if (profileRef.value && !profileRef.value.contains(e.target)) {
    showProfile.value = false;
  }
}

onMounted(() => document.addEventListener('mousedown', closeDropdowns));
onUnmounted(() => document.removeEventListener('mousedown', closeDropdowns));

const notifColors = {
  brand: 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400',
  warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  danger: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};
</script>

<template>
  <header
    class="fixed top-0 left-0 right-0 z-30 h-16
           bg-white dark:bg-surface-800
           border-b border-surface-200 dark:border-surface-700
           flex items-center px-4 gap-4 shadow-sm"
    :style="{ paddingRight: sidebarCollapsed ? '88px' : '276px' }"
  >
    <!-- Toggle Sidebar -->
    <button
      class="btn-ghost btn-icon text-surface-500 dark:text-surface-400"
      @click="emit('toggle-sidebar')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    </button>

    <!-- Page Title -->
    <h1 class="text-base font-semibold text-surface-800 dark:text-surface-200 flex-shrink-0">
      {{ title }}
    </h1>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Search -->
    <div class="relative hidden sm:block">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-surface-400"
        fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input type="search" placeholder="بحث سريع..." class="input pr-10 py-2 w-56 text-sm h-9">
    </div>

    <!-- Dark Mode Toggle -->
    <button
      class="btn-ghost btn-icon text-surface-500 dark:text-surface-400"
      :title="isDark ? 'الوضع النهاري' : 'الوضع الليلي'"
      @click="toggleDark"
    >
      <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
      </svg>
    </button>

    <!-- Notifications -->
    <div ref="notifRef" class="relative">
      <button
        class="btn-ghost btn-icon relative text-surface-500 dark:text-surface-400"
        @click="showNotifications = !showNotifications; showProfile = false"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        <span
          v-if="unreadCount > 0"
          class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full
                 bg-danger text-white text-xxs font-bold flex items-center justify-center"
        >
          {{ unreadCount > 9 ? '9+' : unreadCount }}
        </span>
      </button>

      <Transition name="dropdown">
        <div
          v-if="showNotifications"
          class="absolute left-0 top-12 w-80 bg-white dark:bg-surface-800
                 border border-surface-200 dark:border-surface-700
                 rounded-xl shadow-lg z-50 overflow-hidden"
        >
          <div class="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700">
            <h3 class="font-semibold text-sm text-surface-800 dark:text-surface-200">
              الإشعارات
              <span v-if="unreadCount > 0" class="mr-1.5 px-1.5 py-0.5 rounded-full bg-danger text-white text-xxs">{{ unreadCount }}</span>
            </h3>
            <button class="text-xs text-primary-600 dark:text-primary-400 hover:underline" @click="markAllRead">
              تعليم الكل كمقروء
            </button>
          </div>
          <div class="divide-y divide-surface-100 dark:divide-surface-700/50 max-h-80 overflow-y-auto">
            <div
              v-for="notif in notifications"
              :key="notif.id"
              :class="[
                'flex gap-3 px-4 py-3 hover:bg-surface-50 dark:hover:bg-surface-700/30 transition-colors cursor-pointer',
                !notif.read ? 'bg-primary-50/50 dark:bg-primary-900/10' : '',
              ]"
              @click="notif.read = true"
            >
              <div :class="['w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm', notifColors[notif.color]]">
                <span v-if="notif.type === 'appointment'">📅</span>
                <span v-else-if="notif.type === 'invoice'">🧾</span>
                <span v-else>✅</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-surface-800 dark:text-surface-200">{{ notif.title }}</p>
                <p class="text-xs text-surface-500 dark:text-surface-400 truncate">{{ notif.body }}</p>
                <p class="text-xxs text-surface-400 mt-0.5">{{ notif.time }}</p>
              </div>
              <div v-if="!notif.read" class="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
            </div>
          </div>
          <div class="px-4 py-2.5 border-t border-surface-200 dark:border-surface-700 text-center">
            <button class="text-xs text-primary-600 dark:text-primary-400 hover:underline">
              عرض جميع الإشعارات
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Profile -->
    <div ref="profileRef" class="relative">
      <button
        class="flex items-center gap-2 px-2 py-1.5 rounded-lg
               hover:bg-surface-100 dark:hover:bg-surface-700
               transition-colors duration-150"
        @click="showProfile = !showProfile; showNotifications = false"
      >
        <div
          class="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-primary-600
                 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
        >
          {{ userInitials }}
        </div>
        <div class="hidden md:block text-right">
          <p class="text-xs font-semibold text-surface-800 dark:text-surface-200 leading-tight">
            {{ authUser?.name ?? 'المستخدم' }}
          </p>
          <p class="text-xxs text-surface-500 dark:text-surface-400">
            {{ authUser?.role === 'admin' ? 'مدير النظام' : authUser?.role === 'therapist' ? 'معالج' : 'موظف' }}
          </p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-surface-400 hidden md:block" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <Transition name="dropdown">
        <div
          v-if="showProfile"
          class="absolute left-0 top-12 w-56 bg-white dark:bg-surface-800
                 border border-surface-200 dark:border-surface-700
                 rounded-xl shadow-lg z-50 overflow-hidden"
        >
          <div class="px-4 py-3 border-b border-surface-200 dark:border-surface-700">
            <p class="text-sm font-semibold text-surface-800 dark:text-surface-200">{{ authUser?.name }}</p>
            <p class="text-xs text-surface-500 dark:text-surface-400">{{ authUser?.email }}</p>
          </div>
          <nav class="py-1">
            <Link
              href="/profile"
              class="flex items-center gap-3 px-4 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700/50"
              @click="showProfile = false"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              الملف الشخصي
            </Link>
            <Link
              href="/settings"
              class="flex items-center gap-3 px-4 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700/50"
              @click="showProfile = false"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              الإعدادات
            </Link>
            <div class="border-t border-surface-200 dark:border-surface-700 my-1" />
            <button
              class="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              @click="logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              تسجيل الخروج
            </button>
          </nav>
        </div>
      </Transition>
    </div>
  </header>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
