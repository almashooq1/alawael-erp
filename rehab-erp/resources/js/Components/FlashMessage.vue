<template>
  <Teleport to="body">
    <div class="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none"
      style="min-width: 300px; max-width: 480px;">
      <TransitionGroup
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-3 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 -translate-y-3 scale-95"
      >
        <div v-for="msg in messages" :key="msg.id"
          class="pointer-events-auto w-full flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-xl border backdrop-blur-sm"
          :class="msgClass(msg.type)">
          <!-- أيقونة -->
          <div class="w-5 h-5 flex-shrink-0 mt-0.5">
            <svg v-if="msg.type === 'success'" class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <svg v-else-if="msg.type === 'error'" class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <svg v-else-if="msg.type === 'warning'" class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <svg v-else class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>

          <!-- النص -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium" :class="textClass(msg.type)">{{ msg.text }}</p>
          </div>

          <!-- زر الإغلاق -->
          <button @click="dismiss(msg.id)"
            class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded opacity-60 hover:opacity-100 transition-opacity">
            <svg class="w-3.5 h-3.5" :class="textClass(msg.type)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>

          <!-- شريط التقدم -->
          <div class="absolute bottom-0 right-0 h-0.5 rounded-full transition-all"
            :class="progressClass(msg.type)"
            :style="{ width: msg.progress + '%', left: 0 }"></div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { usePage } from '@inertiajs/vue3'

const page   = usePage()
const messages = ref([])
let counter = 0

function add(text, type = 'info') {
  if (!text) return
  const id = ++counter
  const msg = { id, text, type, progress: 100 }
  messages.value.push(msg)

  // شريط التقدم
  const duration = 4000
  const interval = 50
  const step = (interval / duration) * 100
  const timer = setInterval(() => {
    msg.progress -= step
    if (msg.progress <= 0) {
      clearInterval(timer)
      dismiss(id)
    }
  }, interval)
}

function dismiss(id) {
  const idx = messages.value.findIndex(m => m.id === id)
  if (idx !== -1) messages.value.splice(idx, 1)
}

// مراقبة flash messages من Laravel
watch(
  () => page.props.flash,
  (flash) => {
    if (!flash) return
    if (flash.success) add(flash.success, 'success')
    if (flash.error)   add(flash.error,   'error')
    if (flash.warning) add(flash.warning, 'warning')
    if (flash.info)    add(flash.info,    'info')
  },
  { deep: true, immediate: true }
)

function msgClass(type) {
  return {
    success: 'bg-green-50  dark:bg-green-950/60  border-green-200  dark:border-green-800',
    error:   'bg-red-50    dark:bg-red-950/60    border-red-200    dark:border-red-800',
    warning: 'bg-amber-50  dark:bg-amber-950/60  border-amber-200  dark:border-amber-800',
    info:    'bg-blue-50   dark:bg-blue-950/60   border-blue-200   dark:border-blue-800',
  }[type] || 'bg-slate-50 border-slate-200'
}

function textClass(type) {
  return {
    success: 'text-green-800 dark:text-green-200',
    error:   'text-red-800   dark:text-red-200',
    warning: 'text-amber-800 dark:text-amber-200',
    info:    'text-blue-800  dark:text-blue-200',
  }[type] || 'text-slate-800'
}

function progressClass(type) {
  return {
    success: 'bg-green-500',
    error:   'bg-red-500',
    warning: 'bg-amber-500',
    info:    'bg-blue-500',
  }[type] || 'bg-slate-500'
}
</script>
