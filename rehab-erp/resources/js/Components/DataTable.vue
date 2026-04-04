<script setup>
import { ref, computed } from 'vue';

// ======================================================
// Props
// ======================================================
const props = defineProps({
  /** عناوين الأعمدة [{key, label, sortable, width, align}] */
  columns: {
    type: Array,
    required: true,
  },
  /** البيانات */
  rows: {
    type: Array,
    default: () => [],
  },
  /** مفتاح الصف الفريد */
  rowKey: {
    type: String,
    default: 'id',
  },
  /** تحميل */
  loading: {
    type: Boolean,
    default: false,
  },
  /** رسالة عند عدم وجود بيانات */
  emptyMessage: {
    type: String,
    default: 'لا توجد بيانات للعرض',
  },
  /** إظهار البحث */
  searchable: {
    type: Boolean,
    default: true,
  },
  /** Placeholder البحث */
  searchPlaceholder: {
    type: String,
    default: 'بحث في الجدول...',
  },
  /** عدد الصفوف في الصفحة */
  perPage: {
    type: Number,
    default: 10,
  },
  /** إظهار الترقيم */
  paginated: {
    type: Boolean,
    default: true,
  },
  /** عنوان الجدول */
  title: {
    type: String,
    default: null,
  },
  /** تحديد متعدد */
  selectable: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['row-click', 'selection-change', 'sort-change']);

// ======================================================
// Search
// ======================================================
const searchQuery = ref('');

const filteredRows = computed(() => {
  if (!searchQuery.value.trim()) return props.rows;
  const q = searchQuery.value.toLowerCase();
  return props.rows.filter(row =>
    Object.values(row).some(val => String(val ?? '').toLowerCase().includes(q)),
  );
});

// ======================================================
// Sorting
// ======================================================
const sortKey = ref(null);
const sortDir = ref('asc');

function toggleSort(col) {
  if (!col.sortable) return;
  if (sortKey.value === col.key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = col.key;
    sortDir.value = 'asc';
  }
  emit('sort-change', { key: sortKey.value, dir: sortDir.value });
}

const sortedRows = computed(() => {
  if (!sortKey.value) return filteredRows.value;
  return [...filteredRows.value].sort((a, b) => {
    const av = a[sortKey.value] ?? '';
    const bv = b[sortKey.value] ?? '';
    const cmp = String(av).localeCompare(String(bv), 'ar', { numeric: true });
    return sortDir.value === 'asc' ? cmp : -cmp;
  });
});

// ======================================================
// Pagination
// ======================================================
const currentPage = ref(1);

const totalPages = computed(() => Math.ceil(sortedRows.value.length / props.perPage));

const paginatedRows = computed(() => {
  if (!props.paginated) return sortedRows.value;
  const start = (currentPage.value - 1) * props.perPage;
  return sortedRows.value.slice(start, start + props.perPage);
});

const pageRange = computed(() => {
  const pages = [];
  const total = totalPages.value;
  const cur = currentPage.value;
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (cur > 3) pages.push('...');
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
    if (cur < total - 2) pages.push('...');
    pages.push(total);
  }
  return pages;
});

function goTo(page) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
}

// Reset page on search
watch(searchQuery, () => {
  currentPage.value = 1;
});

// ======================================================
// Selection
// ======================================================
const selected = ref(new Set());

const allSelected = computed(
  () => paginatedRows.value.length > 0 && paginatedRows.value.every(r => selected.value.has(r[props.rowKey])),
);

function toggleSelectAll() {
  if (allSelected.value) {
    paginatedRows.value.forEach(r => selected.value.delete(r[props.rowKey]));
  } else {
    paginatedRows.value.forEach(r => selected.value.add(r[props.rowKey]));
  }
  emit('selection-change', [...selected.value]);
}

function toggleRow(row) {
  if (selected.value.has(row[props.rowKey])) {
    selected.value.delete(row[props.rowKey]);
  } else {
    selected.value.add(row[props.rowKey]);
  }
  emit('selection-change', [...selected.value]);
}

// ======================================================
// Helpers
// ======================================================
const alignClass = {
  right:  'text-right',
  center: 'text-center',
  left:   'text-left',
};

// expose for parent
defineExpose({ selected, clearSelection: () => selected.value.clear() });
</script>

<template>
  <div class="card p-0 overflow-hidden">
    <!-- ================================================
         Header: Title + Search + Actions Slot
         ================================================ -->
    <div
      v-if="title || searchable || $slots.actions"
      class="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3
             border-b border-surface-200 dark:border-surface-700"
    >
      <div v-if="title" class="flex-1">
        <h3 class="section-title text-base">{{ title }}</h3>
        <p v-if="$slots.subtitle" class="section-subtitle">
          <slot name="subtitle" />
        </p>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <!-- Search -->
        <div v-if="searchable" class="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-surface-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            v-model="searchQuery"
            type="search"
            :placeholder="searchPlaceholder"
            class="input pr-10 h-9 text-sm w-48"
          >
        </div>

        <!-- Actions Slot -->
        <slot name="actions" />
      </div>
    </div>

    <!-- ================================================
         Selection Bar
         ================================================ -->
    <Transition name="slide-down">
      <div
        v-if="selectable && selected.size > 0"
        class="flex items-center gap-3 px-4 py-2 bg-primary-50 dark:bg-primary-900/20
               border-b border-primary-200 dark:border-primary-800"
      >
        <span class="text-sm font-medium text-primary-700 dark:text-primary-300">
          تم تحديد {{ selected.size }} صف
        </span>
        <button
          class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
          @click="selected.clear(); emit('selection-change', [])"
        >
          إلغاء التحديد
        </button>
        <div class="flex-1" />
        <slot name="bulk-actions" :selected="selected" />
      </div>
    </Transition>

    <!-- ================================================
         Table
         ================================================ -->
    <div class="overflow-x-auto">
      <table class="table">
        <!-- Head -->
        <thead>
          <tr>
            <!-- Checkbox Column -->
            <th v-if="selectable" class="w-10 pr-4">
              <input
                type="checkbox"
                :checked="allSelected"
                class="w-4 h-4 rounded border-surface-300 text-primary-600 cursor-pointer"
                @change="toggleSelectAll"
              >
            </th>

            <th
              v-for="col in columns"
              :key="col.key"
              :class="[
                alignClass[col.align] || 'text-right',
                col.sortable ? 'cursor-pointer select-none hover:text-surface-700 dark:hover:text-surface-200' : '',
                col.width ? `w-[${col.width}]` : '',
              ]"
              @click="toggleSort(col)"
            >
              <div class="inline-flex items-center gap-1">
                {{ col.label }}
                <!-- Sort Icon -->
                <span v-if="col.sortable" class="flex flex-col">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    :class="['w-3 h-3 transition-colors', sortKey === col.key && sortDir === 'asc' ? 'text-primary-500' : 'text-surface-300 dark:text-surface-600']"
                    fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    :class="['w-3 h-3 -mt-1 transition-colors', sortKey === col.key && sortDir === 'desc' ? 'text-primary-500' : 'text-surface-300 dark:text-surface-600']"
                    fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </span>
              </div>
            </th>

            <!-- Actions Column -->
            <th v-if="$slots['row-actions']" class="w-20 text-center">
              إجراءات
            </th>
          </tr>
        </thead>

        <!-- Body -->
        <tbody>
          <!-- Loading Skeleton -->
          <template v-if="loading">
            <tr v-for="i in perPage" :key="`skel-${i}`">
              <td v-if="selectable"><div class="h-4 w-4 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" /></td>
              <td v-for="col in columns" :key="col.key">
                <div class="h-4 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" :style="`width: ${60 + Math.random() * 30}%`" />
              </td>
              <td v-if="$slots['row-actions']"><div class="h-4 w-16 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" /></td>
            </tr>
          </template>

          <!-- Empty State -->
          <tr v-else-if="paginatedRows.length === 0">
            <td
              :colspan="columns.length + (selectable ? 1 : 0) + ($slots['row-actions'] ? 1 : 0)"
              class="text-center py-16"
            >
              <div class="flex flex-col items-center gap-3 text-surface-400 dark:text-surface-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
                <p class="text-sm font-medium">{{ emptyMessage }}</p>
                <p v-if="searchQuery" class="text-xs">
                  جرّب البحث بكلمة مختلفة
                </p>
              </div>
            </td>
          </tr>

          <!-- Data Rows -->
          <tr
            v-else
            v-for="row in paginatedRows"
            :key="row[rowKey]"
            :class="[
              'transition-colors duration-100',
              selectable && selected.has(row[rowKey]) ? 'bg-primary-50/70 dark:bg-primary-900/15' : '',
            ]"
            @click="emit('row-click', row)"
          >
            <!-- Checkbox -->
            <td v-if="selectable" @click.stop>
              <input
                type="checkbox"
                :checked="selected.has(row[rowKey])"
                class="w-4 h-4 rounded border-surface-300 text-primary-600 cursor-pointer"
                @change="toggleRow(row)"
              >
            </td>

            <!-- Data Cells -->
            <td
              v-for="col in columns"
              :key="col.key"
              :class="alignClass[col.align] || 'text-right'"
            >
              <!-- Cell Slot -->
              <slot
                v-if="$slots[`cell-${col.key}`]"
                :name="`cell-${col.key}`"
                :value="row[col.key]"
                :row="row"
              />
              <span v-else>{{ row[col.key] ?? '—' }}</span>
            </td>

            <!-- Row Actions -->
            <td v-if="$slots['row-actions']" class="text-center" @click.stop>
              <slot name="row-actions" :row="row" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ================================================
         Pagination
         ================================================ -->
    <div
      v-if="paginated && totalPages > 1"
      class="flex flex-col sm:flex-row items-center justify-between gap-3
             px-4 py-3 border-t border-surface-200 dark:border-surface-700"
    >
      <!-- Summary -->
      <p class="text-xs text-surface-500 dark:text-surface-400">
        عرض
        {{ (currentPage - 1) * perPage + 1 }}–{{ Math.min(currentPage * perPage, sortedRows.length) }}
        من {{ sortedRows.length }} نتيجة
      </p>

      <!-- Page Buttons -->
      <nav class="flex items-center gap-1">
        <button
          class="btn-ghost btn-icon btn-sm"
          :disabled="currentPage === 1"
          @click="goTo(currentPage - 1)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        <template v-for="page in pageRange" :key="page">
          <span v-if="page === '...'" class="px-2 text-surface-400 text-sm">…</span>
          <button
            v-else
            :class="[
              'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
              page === currentPage
                ? 'bg-primary-600 text-white'
                : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700',
            ]"
            @click="goTo(page)"
          >
            {{ page }}
          </button>
        </template>

        <button
          class="btn-ghost btn-icon btn-sm"
          :disabled="currentPage === totalPages"
          @click="goTo(currentPage + 1)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
