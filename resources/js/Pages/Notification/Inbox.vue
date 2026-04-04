<script setup>
// Notification — Notification/Inbox.vue
import { ref, computed, watch, onMounted } from 'vue'
import { useForm, usePage, router } from '@inertiajs/vue3'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue'
import { Head } from '@inertiajs/vue3'
import PrimaryButton from '@/Components/PrimaryButton.vue'
import SecondaryButton from '@/Components/SecondaryButton.vue'
import DangerButton from '@/Components/DangerButton.vue'
import SelectInput from '@/Components/SelectInput.vue'
import DataTable from '@/Components/DataTable.vue'
import StatusBadge from '@/Components/StatusBadge.vue'
import Pagination from '@/Components/Pagination.vue'
import SearchFilter from '@/Components/SearchFilter.vue'
import StatsCard from '@/Components/StatsCard.vue'

// Props
const props = defineProps({
    notifications: Object,
    unread_count: Number,
    filters: Object,
    stats: Object,
    options: Object,
})

// نموذج البحث والفلترة
const filterForm = useForm({
    search: props.filters?.search || '',
    status: props.filters?.status || '',
    branch_id: props.filters?.branch_id || '',
    date_from: props.filters?.date_from || '',
    date_to: props.filters?.date_to || '',
    per_page: props.filters?.per_page || 15,
})

// البحث مع debounce
let searchTimeout = null
const applyFilters = () => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        filterForm.get(route('notifications.inbox'), {
            preserveState: true,
            preserveScroll: true,
        })
    }, 300)
}

watch(() => filterForm.search, applyFilters)

// تحديد إشعار كمقروء
const markRead = (id) => {
    router.patch(route('notifications.markRead', id), {}, {
        preserveScroll: true,
    })
}

// تحديد جميع كمقروءة
const markAllRead = () => {
    router.post(route('notifications.markAllRead'), {}, {
        preserveScroll: true,
    })
}

// الحذف
const destroy = (id) => {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        router.delete(route('notifications.destroy', id))
    }
}

// الأعمدة
const columns = [
    { key: 'channel_label', label: 'القناة' },
    { key: 'event_type', label: 'نوع الحدث' },
    { key: 'body', label: 'المحتوى' },
    { key: 'status_label', label: 'الحالة' },
    { key: 'sent_at', label: 'وقت الإرسال' },
    { key: 'read_at', label: 'وقت القراءة' },
]
</script>

<template>
    <Head title="صندوق الإشعارات" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex items-center justify-between">
                <h2 class="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    صندوق الإشعارات
                    <span v-if="unread_count > 0" class="ms-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        {{ unread_count }} غير مقروء
                    </span>
                </h2>
                <SecondaryButton @click="markAllRead" v-if="unread_count > 0">
                    تحديد الكل كمقروء
                </SecondaryButton>
            </div>
        </template>

        <div class="py-6">
            <div class="mx-auto max-w-7xl sm:px-6 lg:px-8">
                <!-- بطاقات الإحصائيات -->
                <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" v-if="stats">
                    <StatsCard
                        v-for="(stat, key) in stats"
                        :key="key"
                        :title="stat.title"
                        :value="stat.value"
                        :change="stat.change"
                        :icon="stat.icon"
                    />
                </div>

                <!-- فلاتر البحث -->
                <div class="mb-6 rounded-lg bg-white p-4 shadow dark:bg-gray-800">
                    <SearchFilter
                        v-model="filterForm.search"
                        :filters="filterForm"
                        @reset="filterForm.reset()"
                    >
                        <SelectInput
                            v-model="filterForm.status"
                            :options="options?.statuses"
                            placeholder="كل الحالات"
                            class="w-40"
                            @change="applyFilters"
                        />
                    </SearchFilter>
                </div>

                <!-- قائمة الإشعارات -->
                <div class="space-y-3">
                    <div
                        v-for="notification in notifications.data"
                        :key="notification.id"
                        class="flex items-start gap-4 rounded-lg bg-white p-4 shadow transition-colors dark:bg-gray-800"
                        :class="{ 'border-r-4 border-blue-500': !notification.is_read }"
                    >
                        <!-- أيقونة القناة -->
                        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                            :class="`bg-${notification.channel_color}-100 text-${notification.channel_color}-600`">
                            <span class="text-lg">
                                {{ notification.channel === 'in_app' ? '🔔' : notification.channel === 'sms' ? '📱' : notification.channel === 'email' ? '📧' : notification.channel === 'push' ? '📲' : '💬' }}
                            </span>
                        </div>

                        <!-- المحتوى -->
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 dark:text-gray-100" v-if="notification.subject">
                                {{ notification.subject }}
                            </p>
                            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                {{ notification.body }}
                            </p>
                            <div class="mt-2 flex items-center gap-3 text-xs text-gray-400">
                                <StatusBadge :status="notification.status" :label="notification.status_label" :color="notification.status_color" />
                                <span>{{ notification.channel_label }}</span>
                                <span v-if="notification.sent_at">{{ new Date(notification.sent_at).toLocaleString('ar-SA') }}</span>
                            </div>
                        </div>

                        <!-- الإجراءات -->
                        <div class="flex flex-shrink-0 items-center gap-2">
                            <button
                                v-if="!notification.is_read"
                                @click="markRead(notification.id)"
                                class="rounded p-1 text-blue-500 hover:bg-blue-50"
                                title="تحديد كمقروء"
                            >
                                ✓
                            </button>
                            <button
                                @click="destroy(notification.id)"
                                class="rounded p-1 text-red-400 hover:bg-red-50"
                                title="حذف"
                            >
                                🗑
                            </button>
                        </div>
                    </div>

                    <!-- رسالة إذا لم توجد إشعارات -->
                    <div v-if="notifications.data?.length === 0" class="rounded-lg bg-white p-12 text-center shadow dark:bg-gray-800">
                        <div class="text-4xl mb-4">🔔</div>
                        <p class="text-gray-500">لا توجد إشعارات</p>
                    </div>
                </div>

                <!-- ترقيم الصفحات -->
                <Pagination :links="notifications.links" class="mt-6" />
            </div>
        </div>
    </AuthenticatedLayout>
</template>
