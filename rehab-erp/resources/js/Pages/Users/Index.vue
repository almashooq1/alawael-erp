<template>
  <AppLayout title="المستخدمون">
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-slate-900 dark:text-white">إدارة المستخدمين</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{{ users.total }} مستخدم مسجّل</p>
        </div>
        <button @click="openModal()"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          إضافة مستخدم
        </button>
      </div>
    </template>

    <!-- إحصاءات سريعة -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div v-for="s in quickStats" :key="s.label"
        class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :class="s.iconBg">
          <svg class="w-5 h-5" :class="s.iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="s.icon"/>
          </svg>
        </div>
        <div>
          <p class="text-xs text-slate-400">{{ s.label }}</p>
          <p class="text-xl font-bold text-slate-900 dark:text-white">{{ s.value }}</p>
        </div>
      </div>
    </div>

    <!-- جدول المستخدمين -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <!-- شريط البحث والفلتر -->
      <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap">
        <div class="relative flex-1 min-w-48 max-w-sm">
          <svg class="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input v-model="search" type="text" placeholder="بحث بالاسم أو البريد..."
            class="w-full pr-9 pl-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <select v-model="filterRole"
          class="text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">جميع الأدوار</option>
          <option value="admin">مدير</option>
          <option value="therapist">معالج</option>
          <option value="receptionist">موظف استقبال</option>
          <option value="accountant">محاسب</option>
        </select>
      </div>

      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <th class="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-5 py-3">المستخدم</th>
            <th class="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-5 py-3">الدور</th>
            <th class="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-5 py-3 hidden md:table-cell">تاريخ الانضمام</th>
            <th class="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-5 py-3 hidden lg:table-cell">آخر تسجيل دخول</th>
            <th class="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-5 py-3">الحالة</th>
            <th class="px-5 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
          <tr v-if="filteredUsers.length === 0">
            <td colspan="6" class="px-5 py-12 text-center text-slate-400 text-sm">لا توجد نتائج</td>
          </tr>
          <tr v-for="user in filteredUsers" :key="user.id"
            class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
            <td class="px-5 py-3.5">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  :style="{ backgroundColor: avatarColor(user.name) }">
                  {{ user.name.charAt(0) }}
                </div>
                <div>
                  <p class="font-medium text-slate-800 dark:text-slate-200">{{ user.name }}</p>
                  <p class="text-xs text-slate-400">{{ user.email }}</p>
                </div>
              </div>
            </td>
            <td class="px-5 py-3.5">
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                :class="roleClass(user.role)">
                {{ roleLabel(user.role) }}
              </span>
            </td>
            <td class="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs hidden md:table-cell">
              {{ formatDate(user.created_at) }}
            </td>
            <td class="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs hidden lg:table-cell">
              {{ user.last_login ? formatDate(user.last_login) : 'لم يسجّل بعد' }}
            </td>
            <td class="px-5 py-3.5">
              <span class="inline-flex items-center gap-1 text-xs font-medium"
                :class="user.is_active ? 'text-green-600 dark:text-green-400' : 'text-slate-400'">
                <span class="w-1.5 h-1.5 rounded-full"
                  :class="user.is_active ? 'bg-green-500' : 'bg-slate-400'"></span>
                {{ user.is_active ? 'نشط' : 'غير نشط' }}
              </span>
            </td>
            <td class="px-5 py-3.5">
              <div class="flex items-center gap-1 justify-end">
                <button @click="openModal(user)"
                  class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                </button>
                <button v-if="user.id !== $page.props.auth.user.id"
                  @click="toggleActive(user)"
                  class="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  :class="user.is_active
                    ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                    : 'text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      :d="user.is_active ? 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- ترقيم الصفحات -->
      <div v-if="users.last_page > 1"
        class="px-5 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ users.from }}–{{ users.to }} من {{ users.total }}
        </p>
        <div class="flex gap-1">
          <Link v-for="link in users.links" :key="link.label"
            :href="link.url || ''"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              link.active
                ? 'bg-blue-600 text-white'
                : link.url
                  ? 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  : 'text-slate-300 dark:text-slate-600 cursor-not-allowed pointer-events-none',
            ]"
            v-html="link.label"
          />
        </div>
      </div>
    </div>

    <!-- مودال إضافة/تعديل المستخدم -->
    <Teleport to="body">
      <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="transition duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="showModal = false">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg">
            <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
              <h2 class="text-base font-semibold text-slate-900 dark:text-white">
                {{ editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد' }}
              </h2>
              <button @click="showModal = false"
                class="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form @submit.prevent="submitForm" class="p-6 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    الاسم الكامل <span class="text-red-500">*</span>
                  </label>
                  <input v-model="form.name" type="text" required
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  <p v-if="errors.name" class="text-xs text-red-500 mt-1">{{ errors.name }}</p>
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    البريد الإلكتروني <span class="text-red-500">*</span>
                  </label>
                  <input v-model="form.email" type="email" required
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    dir="ltr"/>
                  <p v-if="errors.email" class="text-xs text-red-500 mt-1">{{ errors.email }}</p>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">الدور</label>
                  <select v-model="form.role"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="admin">مدير</option>
                    <option value="therapist">معالج</option>
                    <option value="receptionist">موظف استقبال</option>
                    <option value="accountant">محاسب</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">الهاتف</label>
                  <input v-model="form.phone" type="tel" dir="ltr"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    كلمة المرور {{ editingUser ? '(اتركها فارغة لعدم التغيير)' : '*' }}
                  </label>
                  <input v-model="form.password" type="password" :required="!editingUser"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    dir="ltr"/>
                  <p v-if="errors.password" class="text-xs text-red-500 mt-1">{{ errors.password }}</p>
                </div>
              </div>

              <div class="flex gap-3 pt-2">
                <button type="submit" :disabled="processing"
                  class="flex-1 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {{ processing ? 'جاري الحفظ...' : (editingUser ? 'حفظ التعديلات' : 'إضافة المستخدم') }}
                </button>
                <button type="button" @click="showModal = false"
                  class="px-5 py-2.5 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </AppLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Link, router, usePage } from '@inertiajs/vue3'
import AppLayout from '@/Layouts/AppLayout.vue'

const props = defineProps({
  users: { type: Object, required: true },
})

const search     = ref('')
const filterRole = ref('')
const showModal  = ref(false)
const editingUser = ref(null)
const processing = ref(false)
const errors     = ref({})

const form = ref({
  name: '', email: '', role: 'therapist', phone: '', password: '',
})

const filteredUsers = computed(() => {
  let list = props.users.data || []
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }
  if (filterRole.value) {
    list = list.filter(u => u.role === filterRole.value)
  }
  return list
})

const quickStats = computed(() => [
  {
    label: 'إجمالي المستخدمين', value: props.users.total,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    label: 'معالجون', value: (props.users.data || []).filter(u => u.role === 'therapist').length,
    iconBg: 'bg-teal-100 dark:bg-teal-900/30', iconColor: 'text-teal-600 dark:text-teal-400',
    icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  },
  {
    label: 'نشطون', value: (props.users.data || []).filter(u => u.is_active).length,
    iconBg: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    label: 'مدراء', value: (props.users.data || []).filter(u => u.role === 'admin').length,
    iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
])

function openModal(user = null) {
  editingUser.value = user
  errors.value = {}
  if (user) {
    form.value = { name: user.name, email: user.email, role: user.role || 'therapist', phone: user.phone || '', password: '' }
  } else {
    form.value = { name: '', email: '', role: 'therapist', phone: '', password: '' }
  }
  showModal.value = true
}

function submitForm() {
  processing.value = true
  errors.value = {}
  const url = editingUser.value
    ? `/users/${editingUser.value.id}`
    : '/users'
  const method = editingUser.value ? 'patch' : 'post'

  router[method](url, form.value, {
    onSuccess: () => { showModal.value = false },
    onError: (e) => { errors.value = e },
    onFinish: () => { processing.value = false },
  })
}

function toggleActive(user) {
  router.patch(`/users/${user.id}/toggle`, {}, {
    preserveScroll: true,
  })
}

function roleLabel(r) {
  const map = { admin: 'مدير', therapist: 'معالج', receptionist: 'موظف استقبال', accountant: 'محاسب' }
  return map[r] || r
}

function roleClass(r) {
  const map = {
    admin:        'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    therapist:    'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
    receptionist: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    accountant:   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  }
  return map[r] || 'bg-slate-100 text-slate-600'
}

function avatarColor(name) {
  const colors = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899']
  let hash = 0
  for (let c of name) hash = (hash << 5) - hash + c.charCodeAt(0)
  return colors[Math.abs(hash) % colors.length]
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>
