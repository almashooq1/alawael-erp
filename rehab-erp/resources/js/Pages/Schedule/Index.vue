<template>
  <AppLayout title="الجدول الزمني">
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-slate-900 dark:text-white">الجدول الزمني</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {{ currentMonthLabel }} {{ currentYear }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <!-- تبديل العرض -->
          <div class="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
            <button v-for="v in views" :key="v.id"
              @click="currentView = v.id"
              class="px-3 py-2 text-xs font-medium transition-colors"
              :class="currentView === v.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'">
              {{ v.label }}
            </button>
          </div>
          <!-- التنقل -->
          <div class="flex items-center gap-1">
            <button @click="prev"
              class="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <button @click="goToday"
              class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              اليوم
            </button>
            <button @click="next"
              class="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
          <Link href="/sessions/create"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            جلسة جديدة
          </Link>
        </div>
      </div>
    </template>

    <div class="flex gap-5">

      <!-- التقويم الرئيسي -->
      <div class="flex-1 min-w-0">
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">

          <!-- ===== عرض الشهر ===== -->
          <template v-if="currentView === 'month'">
            <!-- رأس الأيام -->
            <div class="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700">
              <div v-for="day in weekDayNames" :key="day"
                class="py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                {{ day }}
              </div>
            </div>
            <!-- الأيام -->
            <div class="grid grid-cols-7">
              <div v-for="cell in calendarCells" :key="cell.key"
                class="min-h-[110px] border-b border-l border-slate-100 dark:border-slate-700 p-2 last:border-l-0"
                :class="[
                  !cell.inMonth ? 'bg-slate-50/50 dark:bg-slate-800/30' : '',
                  cell.isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : '',
                ]">
                <!-- رقم اليوم -->
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full"
                    :class="[
                      cell.isToday
                        ? 'bg-blue-600 text-white'
                        : cell.inMonth
                          ? 'text-slate-700 dark:text-slate-300'
                          : 'text-slate-300 dark:text-slate-600',
                    ]">
                    {{ cell.day }}
                  </span>
                </div>
                <!-- الجلسات في هذا اليوم -->
                <div class="space-y-0.5">
                  <div v-for="s in cell.sessions.slice(0, 3)" :key="s.id"
                    @click="selectSession(s)"
                    class="px-1.5 py-0.5 rounded text-xs cursor-pointer truncate"
                    :class="sessionColorClass(s.status)">
                    {{ s.session_time?.slice(0,5) }} {{ s.patient?.name?.split(' ')[0] }}
                  </div>
                  <div v-if="cell.sessions.length > 3"
                    class="text-xxs text-slate-400 px-1">
                    +{{ cell.sessions.length - 3 }} أخرى
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- ===== عرض الأسبوع ===== -->
          <template v-if="currentView === 'week'">
            <div class="grid grid-cols-8 border-b border-slate-100 dark:border-slate-700">
              <div class="py-3 text-center text-xs text-slate-400">الوقت</div>
              <div v-for="(day, i) in weekDays" :key="i"
                class="py-3 text-center"
                :class="day.isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''">
                <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ day.name }}</p>
                <p class="text-lg font-bold mt-0.5"
                  :class="day.isToday ? 'text-blue-600' : 'text-slate-500 dark:text-slate-400'">
                  {{ day.num }}
                </p>
              </div>
            </div>
            <!-- ساعات العمل -->
            <div class="overflow-y-auto" style="max-height: 600px;">
              <div v-for="hour in workHours" :key="hour"
                class="grid grid-cols-8 border-b border-slate-50 dark:border-slate-700/50 min-h-[60px]">
                <div class="py-2 px-3 text-xxs text-slate-400 text-left shrink-0">
                  {{ hour }}:00
                </div>
                <div v-for="(day, i) in weekDays" :key="i"
                  class="border-r border-slate-50 dark:border-slate-700/50 p-1 relative"
                  :class="day.isToday ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''">
                  <div v-for="s in getSessionsAt(day.date, hour)" :key="s.id"
                    @click="selectSession(s)"
                    class="px-2 py-1 rounded-lg text-xs cursor-pointer mb-0.5"
                    :class="sessionColorClass(s.status)">
                    <p class="font-medium truncate">{{ s.patient?.name?.split(' ')[0] }}</p>
                    <p class="opacity-75 text-xxs">{{ s.session_time?.slice(0,5) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- ===== عرض اليوم ===== -->
          <template v-if="currentView === 'day'">
            <div class="overflow-y-auto" style="max-height: 650px;">
              <div v-for="hour in workHours" :key="hour"
                class="flex border-b border-slate-50 dark:border-slate-700/50 min-h-[70px]">
                <div class="w-16 shrink-0 py-3 pr-3 text-xs text-slate-400 text-right">{{ hour }}:00</div>
                <div class="flex-1 p-2 border-r border-slate-100 dark:border-slate-700">
                  <div v-for="s in getSessionsAt(currentDayDate, hour)" :key="s.id"
                    @click="selectSession(s)"
                    class="px-3 py-2 rounded-xl text-sm cursor-pointer mb-1 flex items-center gap-3"
                    :class="sessionColorClass(s.status)">
                    <div>
                      <p class="font-semibold">{{ s.patient?.name }}</p>
                      <p class="text-xs opacity-75">{{ s.session_time?.slice(0,5) }} — {{ s.duration }} دقيقة — {{ typeLabel(s.type) }}</p>
                    </div>
                    <div class="mr-auto">
                      <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-white/30">
                        {{ statusLabel(s.status) }}
                      </span>
                    </div>
                  </div>
                  <div v-if="getSessionsAt(currentDayDate, hour).length === 0"
                    class="h-full opacity-0 hover:opacity-100 flex items-center justify-center text-xs text-slate-300 cursor-pointer transition-opacity">
                    + جلسة
                  </div>
                </div>
              </div>
            </div>
          </template>

        </div>
      </div>

      <!-- الشريط الجانبي -->
      <div class="w-64 shrink-0 space-y-4">

        <!-- تقويم صغير للتنقل -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ currentMonthLabel }}</span>
            <div class="flex gap-1">
              <button @click="prev" class="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <button @click="next" class="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
          <!-- رأس الأيام صغير -->
          <div class="grid grid-cols-7 mb-1">
            <div v-for="d in ['أ','إ','ث','أر','خ','ج','س']" :key="d"
              class="text-center text-xxs text-slate-400 py-1">{{ d }}</div>
          </div>
          <!-- أيام -->
          <div class="grid grid-cols-7 gap-0.5">
            <button v-for="cell in calendarCells" :key="cell.key"
              @click="goToDay(cell)"
              class="h-7 w-full flex items-center justify-center rounded text-xs transition-colors"
              :class="[
                !cell.inMonth ? 'text-slate-300 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
                cell.isToday ? 'bg-blue-600 text-white hover:bg-blue-700' : '',
                cell.sessions?.length > 0 && !cell.isToday ? 'font-semibold' : '',
              ]">
              {{ cell.day }}
              <span v-if="cell.sessions?.length > 0 && !cell.isToday"
                class="absolute w-1 h-1 rounded-full bg-blue-500 bottom-0.5"></span>
            </button>
          </div>
        </div>

        <!-- جلسات اليوم -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 class="text-xs font-semibold text-slate-900 dark:text-white">جلسات اليوم</h3>
            <p class="text-xxs text-slate-400 mt-0.5">{{ todaySessions.length }} جلسة</p>
          </div>
          <div class="divide-y divide-slate-50 dark:divide-slate-700">
            <div v-if="todaySessions.length === 0" class="p-4 text-center text-xs text-slate-400">
              لا توجد جلسات اليوم
            </div>
            <div v-for="s in todaySessions" :key="s.id"
              @click="selectSession(s)"
              class="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors">
              <div class="flex items-center gap-2">
                <div class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  :class="s.status === 'completed' ? 'bg-green-500' : s.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-500'">
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                    {{ s.patient?.name }}
                  </p>
                  <p class="text-xxs text-slate-400">{{ s.session_time?.slice(0,5) }} — {{ s.duration }}د</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- مفتاح الألوان -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p class="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">الحالات</p>
          <div class="space-y-2">
            <div v-for="s in statusLegend" :key="s.label" class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded flex-shrink-0" :class="s.color"></span>
              <span class="text-xs text-slate-600 dark:text-slate-400">{{ s.label }}</span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- مودال تفاصيل الجلسة -->
    <Teleport to="body">
      <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="transition duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="selectedSession" class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="selectedSession = null">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm">
            <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                :class="sessionColorClass(selectedSession.status)">
                {{ statusLabel(selectedSession.status) }}
              </span>
              <button @click="selectedSession = null"
                class="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="p-5 space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0"
                  :class="selectedSession.patient?.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'">
                  {{ selectedSession.patient?.name?.charAt(0) }}
                </div>
                <div>
                  <p class="font-semibold text-slate-900 dark:text-white">{{ selectedSession.patient?.name }}</p>
                  <p class="text-xs text-slate-400">{{ selectedSession.patient?.patient_number }}</p>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p class="text-slate-400 mb-0.5">التاريخ</p>
                  <p class="font-medium text-slate-700 dark:text-slate-300">{{ formatDate(selectedSession.session_date) }}</p>
                </div>
                <div>
                  <p class="text-slate-400 mb-0.5">الوقت</p>
                  <p class="font-medium text-slate-700 dark:text-slate-300">{{ selectedSession.session_time?.slice(0,5) }}</p>
                </div>
                <div>
                  <p class="text-slate-400 mb-0.5">المدة</p>
                  <p class="font-medium text-slate-700 dark:text-slate-300">{{ selectedSession.duration }} دقيقة</p>
                </div>
                <div>
                  <p class="text-slate-400 mb-0.5">النوع</p>
                  <p class="font-medium text-slate-700 dark:text-slate-300">{{ typeLabel(selectedSession.type) }}</p>
                </div>
              </div>
              <div class="flex gap-2 pt-2">
                <Link :href="`/sessions/${selectedSession.id}`"
                  class="flex-1 py-2 rounded-lg text-center text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                  عرض التفاصيل
                </Link>
                <Link :href="`/sessions/${selectedSession.id}/edit`"
                  class="px-4 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  تعديل
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </AppLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Link } from '@inertiajs/vue3'
import AppLayout from '@/Layouts/AppLayout.vue'

const props = defineProps({
  sessions:      { type: Array,  default: () => [] },
  todaySessions: { type: Array,  default: () => [] },
})

// ===================== حالة التاريخ =====================
const today        = new Date()
const currentYear  = ref(today.getFullYear())
const currentMonth = ref(today.getMonth())  // 0-based
const currentView  = ref('month')
const selectedSession = ref(null)

const views = [
  { id: 'month', label: 'شهر' },
  { id: 'week',  label: 'أسبوع' },
  { id: 'day',   label: 'يوم' },
]

const arabicMonths = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

const weekDayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']

const currentMonthLabel = computed(() => arabicMonths[currentMonth.value])

const workHours = [8,9,10,11,12,13,14,15,16,17]

// ===================== التنقل =====================
function prev() {
  if (currentView.value === 'month') {
    if (currentMonth.value === 0) { currentMonth.value = 11; currentYear.value-- }
    else currentMonth.value--
  } else {
    const d = new Date(currentDayDate.value)
    d.setDate(d.getDate() - (currentView.value === 'week' ? 7 : 1))
    setCurrentDay(d)
  }
}

function next() {
  if (currentView.value === 'month') {
    if (currentMonth.value === 11) { currentMonth.value = 0; currentYear.value++ }
    else currentMonth.value++
  } else {
    const d = new Date(currentDayDate.value)
    d.setDate(d.getDate() + (currentView.value === 'week' ? 7 : 1))
    setCurrentDay(d)
  }
}

function goToday() {
  currentYear.value  = today.getFullYear()
  currentMonth.value = today.getMonth()
  currentDay.value   = today.getDate()
}

const currentDay = ref(today.getDate())

const currentDayDate = computed(() =>
  `${currentYear.value}-${String(currentMonth.value + 1).padStart(2,'0')}-${String(currentDay.value).padStart(2,'0')}`
)

function setCurrentDay(d) {
  currentYear.value  = d.getFullYear()
  currentMonth.value = d.getMonth()
  currentDay.value   = d.getDate()
}

function goToDay(cell) {
  if (!cell.inMonth) return
  currentDay.value = cell.day
  currentView.value = 'day'
}

// ===================== التقويم الشهري =====================
const calendarCells = computed(() => {
  const firstDay = new Date(currentYear.value, currentMonth.value, 1)
  const lastDay  = new Date(currentYear.value, currentMonth.value + 1, 0)
  const cells = []

  // أيام من الشهر السابق
  for (let i = 0; i < firstDay.getDay(); i++) {
    const d = new Date(firstDay)
    d.setDate(d.getDate() - (firstDay.getDay() - i))
    cells.push({ key: `prev-${i}`, day: d.getDate(), inMonth: false, isToday: false,
      sessions: [], date: d.toISOString().slice(0,10) })
  }

  // أيام الشهر الحالي
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${currentYear.value}-${String(currentMonth.value+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    const isToday = dateStr === today.toISOString().slice(0,10)
    cells.push({
      key: dateStr, day: d, inMonth: true, isToday, date: dateStr,
      sessions: getSessionsForDay(dateStr),
    })
  }

  // أيام من الشهر التالي
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) {
    cells.push({ key: `next-${i}`, day: i, inMonth: false, isToday: false,
      sessions: [], date: '' })
  }

  return cells
})

// ===================== الأسبوع =====================
const weekDays = computed(() => {
  const base = new Date(currentYear.value, currentMonth.value, currentDay.value)
  const startOfWeek = new Date(base)
  startOfWeek.setDate(base.getDate() - base.getDay())

  return weekDayNames.map((name, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    const dateStr = d.toISOString().slice(0,10)
    return {
      name, num: d.getDate(), date: dateStr,
      isToday: dateStr === today.toISOString().slice(0,10),
    }
  })
})

// ===================== دوال مساعدة =====================
function getSessionsForDay(dateStr) {
  return props.sessions.filter(s => s.session_date?.slice(0,10) === dateStr)
}

function getSessionsAt(dateStr, hour) {
  return getSessionsForDay(dateStr).filter(s => {
    const h = parseInt(s.session_time?.slice(0,2) || '0')
    return h === hour
  })
}

function selectSession(s) { selectedSession.value = s }

function sessionColorClass(status) {
  return {
    scheduled: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200',
    completed:  'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200',
    cancelled:  'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200',
    no_show:    'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200',
  }[status] || 'bg-slate-100 text-slate-700'
}

function statusLabel(s) {
  return { scheduled:'مجدولة', completed:'مكتملة', cancelled:'ملغاة', no_show:'غياب' }[s] || s
}

function typeLabel(t) {
  return { individual:'فردية', group:'جماعية', assessment:'تقييمية', followup:'متابعة' }[t] || t
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ar-SA', { weekday:'short', month:'short', day:'numeric' })
}

const statusLegend = [
  { label: 'مجدولة',  color: 'bg-blue-500' },
  { label: 'مكتملة', color: 'bg-green-500' },
  { label: 'ملغاة',  color: 'bg-red-500' },
  { label: 'غياب',   color: 'bg-amber-500' },
]
</script>
