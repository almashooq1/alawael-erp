<script setup>
import { ref, computed } from 'vue';
import SidebarNav from '@/Components/SidebarNav.vue';
import TopHeader from '@/Components/TopHeader.vue';
import FlashMessage from '@/Components/FlashMessage.vue';

const props = defineProps({
  title: {
    type: String,
    default: 'لوحة التحكم',
  },
});

// ======================================================
// Sidebar State
// ======================================================
const sidebarCollapsed = ref(false);
const mobileMenuOpen = ref(false);

function toggleSidebar() {
  // On mobile: open/close overlay
  if (window.innerWidth < 1024) {
    mobileMenuOpen.value = !mobileMenuOpen.value;
  } else {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }
}

const mainStyle = computed(() => ({
  paddingRight: sidebarCollapsed.value ? '72px' : '260px',
}));
</script>

<template>
  <div class="min-h-screen bg-surface-100 dark:bg-surface-900 font-sans">
    <!-- ================================================
         Sidebar — Desktop (Fixed Right)
         ================================================ -->
    <div
      :class="[
        'fixed top-0 right-0 h-full z-40',
        'hidden lg:flex flex-col',
        'transition-all duration-250',
        sidebarCollapsed ? 'w-[72px]' : 'w-[260px]',
      ]"
    >
      <SidebarNav :collapsed="sidebarCollapsed" @toggle="toggleSidebar" />
    </div>

    <!-- ================================================
         Mobile Sidebar Overlay
         ================================================ -->
    <Transition name="overlay">
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 z-50 lg:hidden"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="mobileMenuOpen = false"
        />
        <!-- Sidebar Panel -->
        <div class="absolute top-0 right-0 h-full w-[260px] flex flex-col animate-slide-in-right">
          <SidebarNav :collapsed="false" />
        </div>
      </div>
    </Transition>

    <!-- ================================================
         Top Header
         ================================================ -->
    <TopHeader
      :title="title"
      :sidebar-collapsed="sidebarCollapsed"
      @toggle-sidebar="toggleSidebar"
    />

    <!-- ================================================
         Main Content Area
         ================================================ -->
    <main
      class="pt-16 min-h-screen transition-all duration-250 lg:block"
      :style="{ paddingRight: sidebarCollapsed ? '72px' : '260px' }"
    >
      <!-- Breadcrumb / Page Header Slot -->
      <div
        v-if="$slots.header"
        class="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 px-6 py-4"
      >
        <slot name="header" />
      </div>

      <!-- Main Content -->
      <div class="p-6">
        <slot />
      </div>
    </main>

    <!-- Flash Messages -->
    <FlashMessage />
  </div>
</template>

<style scoped>
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
</style>
