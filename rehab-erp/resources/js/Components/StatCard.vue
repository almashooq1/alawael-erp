<script setup>
import { computed } from 'vue';

const props = defineProps({
  /** العنوان */
  title: {
    type: String,
    required: true,
  },
  /** القيمة الرئيسية */
  value: {
    type: [String, Number],
    required: true,
  },
  /** النص الثانوي (اختياري) */
  subtitle: {
    type: String,
    default: null,
  },
  /** نسبة التغيير (رقم موجب أو سالب) */
  change: {
    type: Number,
    default: null,
  },
  /** وصف التغيير */
  changeLabel: {
    type: String,
    default: 'مقارنة بالشهر الماضي',
  },
  /**
   * لون البطاقة:
   * primary | brand | success | warning | danger | info | purple | orange
   */
  color: {
    type: String,
    default: 'primary',
  },
  /** أيقونة SVG كنص HTML */
  icon: {
    type: String,
    default: null,
  },
  /** تحميل */
  loading: {
    type: Boolean,
    default: false,
  },
});

const colorMap = {
  primary: {
    bg:      'bg-primary-50 dark:bg-primary-900/20',
    icon:    'bg-primary-100 dark:bg-primary-800/40 text-primary-600 dark:text-primary-400',
    value:   'text-primary-700 dark:text-primary-300',
    badge:   'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
    bar:     'bg-primary-500',
  },
  brand: {
    bg:      'bg-brand-50 dark:bg-brand-900/20',
    icon:    'bg-brand-100 dark:bg-brand-800/40 text-brand-600 dark:text-brand-400',
    value:   'text-brand-700 dark:text-brand-300',
    badge:   'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300',
    bar:     'bg-brand-500',
  },
  success: {
    bg:      'bg-success-light dark:bg-success/10',
    icon:    'bg-green-100 dark:bg-green-900/30 text-success-dark dark:text-success',
    value:   'text-green-700 dark:text-green-300',
    badge:   'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    bar:     'bg-success',
  },
  warning: {
    bg:      'bg-warning-light dark:bg-warning/10',
    icon:    'bg-amber-100 dark:bg-amber-900/30 text-warning-dark dark:text-warning',
    value:   'text-amber-700 dark:text-amber-300',
    badge:   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    bar:     'bg-warning',
  },
  danger: {
    bg:      'bg-danger-light dark:bg-danger/10',
    icon:    'bg-red-100 dark:bg-red-900/30 text-danger-dark dark:text-danger',
    value:   'text-red-700 dark:text-red-300',
    badge:   'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    bar:     'bg-danger',
  },
  info: {
    bg:      'bg-info-light dark:bg-info/10',
    icon:    'bg-sky-100 dark:bg-sky-900/30 text-info-dark dark:text-info',
    value:   'text-sky-700 dark:text-sky-300',
    badge:   'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
    bar:     'bg-info',
  },
  purple: {
    bg:      'bg-purple-50 dark:bg-purple-900/20',
    icon:    'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    value:   'text-purple-700 dark:text-purple-300',
    badge:   'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    bar:     'bg-purple-500',
  },
  orange: {
    bg:      'bg-orange-50 dark:bg-orange-900/20',
    icon:    'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    value:   'text-orange-700 dark:text-orange-300',
    badge:   'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    bar:     'bg-orange-500',
  },
};

const colors = computed(() => colorMap[props.color] || colorMap.primary);

const isPositive = computed(() => props.change !== null && props.change >= 0);
const absChange  = computed(() => Math.abs(props.change));
</script>

<template>
  <div
    :class="[
      'card-hover group relative overflow-hidden',
      colors.bg,
      'border-0',
    ]"
  >
    <!-- Loading Skeleton -->
    <div v-if="loading" class="animate-pulse space-y-3">
      <div class="flex items-center justify-between">
        <div class="h-4 w-24 bg-surface-200 dark:bg-surface-700 rounded" />
        <div class="w-10 h-10 rounded-xl bg-surface-200 dark:bg-surface-700" />
      </div>
      <div class="h-8 w-32 bg-surface-200 dark:bg-surface-700 rounded" />
      <div class="h-3 w-40 bg-surface-200 dark:bg-surface-700 rounded" />
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Top Row: Title + Icon -->
      <div class="flex items-start justify-between mb-3">
        <p class="text-sm font-medium text-surface-600 dark:text-surface-400">
          {{ title }}
        </p>
        <div
          v-if="icon"
          :class="['w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', colors.icon]"
          v-html="icon"
        />
      </div>

      <!-- Value -->
      <div class="mb-2">
        <span :class="['text-3xl font-bold tabular-nums', colors.value]">
          {{ value }}
        </span>
        <span
          v-if="subtitle"
          class="text-sm text-surface-500 dark:text-surface-400 mr-1.5"
        >
          {{ subtitle }}
        </span>
      </div>

      <!-- Change Indicator -->
      <div v-if="change !== null" class="flex items-center gap-1.5">
        <span
          :class="[
            'inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md',
            isPositive
              ? 'bg-success-light text-success-dark dark:bg-success/20 dark:text-success'
              : 'bg-danger-light text-danger-dark dark:bg-danger/20 dark:text-danger',
          ]"
        >
          <!-- Arrow -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            :class="['w-3 h-3', !isPositive && 'rotate-180']"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2.5"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
          </svg>
          {{ absChange }}%
        </span>
        <span class="text-xs text-surface-400 dark:text-surface-500">
          {{ changeLabel }}
        </span>
      </div>

      <!-- Colored bottom bar -->
      <div
        :class="['absolute bottom-0 right-0 left-0 h-1 opacity-60 group-hover:opacity-100 transition-opacity', colors.bar]"
      />

      <!-- Slot for extra content -->
      <div v-if="$slots.default" class="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
        <slot />
      </div>
    </template>
  </div>
</template>
