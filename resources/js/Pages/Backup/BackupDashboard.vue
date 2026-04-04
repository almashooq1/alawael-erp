<script setup>
// Backup — BackupDashboard
import { ref, computed, watch, onMounted } from 'vue'
import { useForm, usePage, router } from '@inertiajs/vue3'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue'
import { Head } from '@inertiajs/vue3'
import InputLabel from '@/Components/InputLabel.vue'
import TextInput from '@/Components/TextInput.vue'
import InputError from '@/Components/InputError.vue'
import PrimaryButton from '@/Components/PrimaryButton.vue'
import SecondaryButton from '@/Components/SecondaryButton.vue'
import DangerButton from '@/Components/DangerButton.vue'
import SelectInput from '@/Components/SelectInput.vue'
import TextareaInput from '@/Components/TextareaInput.vue'
import DataTable from '@/Components/DataTable.vue'
import StatusBadge from '@/Components/StatusBadge.vue'
import Pagination from '@/Components/Pagination.vue'
import SearchFilter from '@/Components/SearchFilter.vue'
import Modal from '@/Components/Modal.vue'
import StatsCard from '@/Components/StatsCard.vue'

// Props
const props = defineProps({
    backups: Object,
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

// نموذج الإنشاء/التعديل
const form = useForm({
    name: '', type: '', schedule_id: '', notes: '',
})

// البحث مع debounce
let searchTimeout = null
const applyFilters = () => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        filterForm.get(route('backups.index'), {
            preserveState: true,
            preserveScroll: true,
        })
    }, 300)
}

watch(() => filterForm.search, applyFilters)

// الحفظ
const submit = () => {
    if (form.id) {
        form.put(route('backups.update', form.id), {
            onSuccess: () => {
                showModal.value = false
                form.reset()
            },
        })
    } else {
        form.post(route('backups.store'), {
            onSuccess: () => {
                showModal.value = false
                form.reset()
            },
        })
    }
}

// الحذف
const destroy = (id) => {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        router.delete(route('backups.destroy', id))
    }
}

// تشغيل نسخة احتياطية يدوية
const runManual = () => {
    if (confirm('هل تريد بدء نسخة احتياطية الآن؟')) {
        router.post(route('backups.runManual'), {}, {
            onSuccess: () => alert('تم بدء النسخ الاحتياطي بنجاح'),
        })
    }
}

// Modal
const showModal = ref(false)
const openCreate = () => {
    form.reset()
    showModal.value = true
}
const openEdit = (item) => {
    form.reset()
    Object.assign(form, item)
    showModal.value = true
}

const columns = [
    { key: 'id', label: '#' },
    { key: 'type', label: 'النوع' },
    { key: 'status', label: 'الحالة' },
    { key: 'size_bytes', label: 'الحجم' },
    { key: 'started_at', label: 'وقت البدء' },
    { key: 'duration_seconds', label: 'المدة (ث)' },
]
</script>

<template>
    <Head :title="'النسخ الاحتياطي'" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex items-center justify-between">
                <h2 class="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    💾 إدارة النسخ الاحتياطي
                </h2>
                <div class="flex gap-2">
                    <SecondaryButton @click="runManual">
                        <span class="i-heroicons-play-20-solid me-1" />
                        نسخ احتياطي الآن
                    </SecondaryButton>
                    <PrimaryButton @click="openCreate">
                        <span class="i-heroicons-plus-20-solid me-1" />
                        إضافة جديد
                    </PrimaryButton>
                </div>
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
                        <select v-model="filterForm.status" class="w-40 rounded border p-2" @change="applyFilters">
                            <option value="">كل الحالات</option>
                            <option v-for="s in options?.statuses" :key="s.value" :value="s.value">{{ s.label }}</option>
                        </select>
                        <input v-model="filterForm.date_from" type="date" class="w-40 rounded border p-2" @change="applyFilters" />
                        <input v-model="filterForm.date_to" type="date" class="w-40 rounded border p-2" @change="applyFilters" />
                    </SearchFilter>
                </div>

                <!-- جدول البيانات -->
                <div class="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
                    <DataTable
                        :items="backups.data"
                        :columns="columns"
                        @edit="openEdit"
                        @delete="destroy"
                    />
                    <Pagination :links="backups.links" class="border-t p-4" />
                </div>
            </div>
        </div>

        <!-- Modal الإنشاء/التعديل -->
        <Modal :show="showModal" @close="showModal = false" max-width="2xl">
            <form @submit.prevent="submit" class="p-6">
                <h3 class="mb-6 text-lg font-medium text-gray-900 dark:text-gray-100">
                    {{ form.id ? 'تعديل نسخة' : 'إنشاء نسخة جديدة' }}
                </h3>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <InputLabel for="name" value="اسم النسخة" />
                        <TextInput id="name" v-model="form.name" type="text" class="mt-1 block w-full" />
                        <InputError :message="form.errors.name" class="mt-2" />
                    </div>

                    <div>
                        <InputLabel for="type" value="نوع النسخة" />
                        <select id="type" v-model="form.type" class="mt-1 block w-full rounded border p-2">
                            <option v-for="t in options?.backupTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
                        </select>
                        <InputError :message="form.errors.type" class="mt-2" />
                    </div>

                    <div class="sm:col-span-2">
                        <InputLabel for="notes" value="ملاحظات" />
                        <textarea id="notes" v-model="form.notes" rows="4" class="mt-1 block w-full rounded border p-2" />
                        <InputError :message="form.errors.notes" class="mt-2" />
                    </div>
                </div>

                <div class="mt-6 flex justify-end gap-3">
                    <SecondaryButton @click="showModal = false">إلغاء</SecondaryButton>
                    <PrimaryButton :disabled="form.processing">
                        {{ form.processing ? 'جاري الحفظ...' : 'حفظ' }}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    </AuthenticatedLayout>
</template>
