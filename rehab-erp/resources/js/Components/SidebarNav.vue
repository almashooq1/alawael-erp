<script setup>
import { ref, computed } from 'vue';
import { Link, usePage } from '@inertiajs/vue3';

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['toggle']);

const page = usePage();
const currentUrl = computed(() => page.url);

const authUser = computed(() => page.props.auth?.user || {});
const userName = computed(() => authUser.value.name || 'المستخدم');
const userEmail = computed(() => authUser.value.email || '');
const userInitial = computed(() => {
  const name = authUser.value.name || '';
  return name.charAt(0) || 'م';
});

// ======================================================
// قائمة التنقل
// ======================================================
const navGroups = [
  {
    label: 'الرئيسية',
    items: [
      {
        key: 'dashboard',
        label: 'لوحة التحكم',
        href: '/',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
               </svg>`,
      },
    ],
  },
  {
    label: 'إدارة المرضى',
    items: [
      {
        key: 'patients',
        label: 'المرضى',
        href: '/patients',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
               </svg>`,
      },
      {
        key: 'schedule',
        label: 'الجدول الزمني',
        href: '/schedule',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
               </svg>`,
      },
      {
        key: 'sessions',
        label: 'جلسات التأهيل',
        href: '/sessions',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>`,
      },
    ],
  },
  {
    label: 'الفريق والمستخدمون',
    items: [
      {
        key: 'users',
        label: 'المستخدمون',
        href: '/users',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
               </svg>`,
      },
    ],
  },
  {
    label: 'التقارير والمالية',
    items: [
      {
        key: 'reports',
        label: 'التقارير',
        href: '/reports',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
               </svg>`,
      },
      {
        key: 'invoices',
        label: 'الفواتير',
        href: '/invoices',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
               </svg>`,
      },
    ],
  },
  {
    label: 'الإعدادات',
    items: [
      {
        key: 'settings',
        label: 'الإعدادات',
        href: '/settings',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
               </svg>`,
      },
    ],
  },
];

// ======================================================
// حالة القوائم المنسدلة
// ======================================================
const openGroups = ref(new Set(navGroups.map(g => g.label)));

function toggleGroup(label) {
  if (openGroups.value.has(label)) {
    openGroups.value.delete(label);
  } else {
    openGroups.value.add(label);
  }
}

function isActive(href) {
  return currentUrl.value === href || (href !== '/' && currentUrl.value.startsWith(href));
}

const badgeClasses = {
  brand: 'bg-brand-500/20 text-brand-400',
  warning: 'bg-warning/20 text-warning',
  danger: 'bg-danger/20 text-danger',
  primary: 'bg-primary-500/20 text-primary-400',
};
</script>

<template>
  <!-- ======================================================
       Sidebar Container
       ====================================================== -->
  <aside
    :class="[
      'flex flex-col h-full bg-sidebar-bg dark:bg-sidebar-bgDark',
      'border-l border-sidebar-border transition-all duration-250',
      collapsed ? 'w-[72px]' : 'w-[260px]',
    ]"
  >
    <!-- Logo -->
    <div
      class="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border flex-shrink-0"
    >
      <div
        class="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-primary-600
               flex items-center justify-center shadow-lg"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-5 h-5 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
          />
        </svg>
      </div>
      <Transition name="fade-label">
        <div v-if="!collapsed" class="overflow-hidden">
          <p class="text-white font-bold text-sm leading-tight whitespace-nowrap">Rehab ERP</p>
          <p class="text-sidebar-text text-xxs whitespace-nowrap">نظام إعادة التأهيل</p>
        </div>
      </Transition>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
      <template v-for="group in navGroups" :key="group.label">
        <!-- Group Header -->
        <button
          v-if="!collapsed"
          class="w-full flex items-center justify-between px-3 py-1.5 mt-3 first:mt-0
                 text-sidebar-text text-xxs font-semibold uppercase tracking-widest
                 hover:text-sidebar-textHover transition-colors"
          @click="toggleGroup(group.label)"
        >
          <span>{{ group.label }}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            :class="['w-3 h-3 transition-transform duration-200', openGroups.has(group.label) ? '' : 'rotate-180']"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2.5"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>
        <div v-else class="border-t border-sidebar-border/40 my-2" />

        <!-- Items -->
        <Transition name="collapse">
          <div v-show="collapsed || openGroups.has(group.label)" class="space-y-0.5">
            <Link
              v-for="item in group.items"
              :key="item.key"
              :href="item.href"
              :class="[
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
                'transition-all duration-150',
                isActive(item.href)
                  ? 'bg-primary-600/90 text-white shadow-md'
                  : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-textHover',
                collapsed ? 'justify-center' : '',
              ]"
              :title="collapsed ? item.label : ''"
            >
              <!-- Icon -->
              <span
                :class="[
                  'flex-shrink-0 w-5 h-5',
                  isActive(item.href)
                    ? 'text-white'
                    : 'text-sidebar-icon group-hover:text-sidebar-textHover',
                ]"
                v-html="item.icon"
              />

              <!-- Label -->
              <Transition name="fade-label">
                <span v-if="!collapsed" class="flex-1 truncate font-medium">
                  {{ item.label }}
                </span>
              </Transition>

              <!-- Badge -->
              <Transition name="fade-label">
                <span
                  v-if="!collapsed && item.badge"
                  :class="[
                    'flex-shrink-0 px-1.5 py-0.5 rounded-full text-xxs font-bold',
                    isActive(item.href)
                      ? 'bg-white/20 text-white'
                      : badgeClasses[item.badgeColor || 'brand'],
                  ]"
                >
                  {{ item.badge }}
                </span>
              </Transition>
            </Link>
          </div>
        </Transition>
      </template>
    </nav>

    <!-- Footer / User Mini -->
    <div class="flex-shrink-0 border-t border-sidebar-border p-3">
      <Link
        href="/profile"
        :class="[
          'w-full flex items-center gap-3 p-2 rounded-lg',
          'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-textHover',
          'transition-colors duration-150',
          collapsed ? 'justify-center' : '',
        ]"
      >
        <div
          class="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-primary-500
                 flex items-center justify-center text-white text-xs font-bold"
        >
          {{ userInitial }}
        </div>
        <Transition name="fade-label">
          <div v-if="!collapsed" class="flex-1 text-right overflow-hidden">
            <p class="text-xs font-semibold text-sidebar-textHover truncate">{{ userName }}</p>
            <p class="text-xxs text-sidebar-text truncate">{{ userEmail }}</p>
          </div>
        </Transition>
      </Link>
    </div>
  </aside>
</template>

<style scoped>
.fade-label-enter-active,
.fade-label-leave-active {
  transition: opacity 0.15s ease, width 0.25s ease;
  overflow: hidden;
  white-space: nowrap;
}
.fade-label-enter-from,
.fade-label-leave-to {
  opacity: 0;
  width: 0;
}

.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
