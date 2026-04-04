<script setup>
// Deployment — DeploymentDashboard
import { ref, computed, watch } from 'vue'
import { useForm, router } from '@inertiajs/vue3'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue'
import { Head } from '@inertiajs/vue3'
import InputLabel from '@/Components/InputLabel.vue'
import TextInput from '@/Components/TextInput.vue'
import InputError from '@/Components/InputError.vue'
import PrimaryButton from '@/Components/PrimaryButton.vue'
import SecondaryButton from '@/Components/SecondaryButton.vue'
import DangerButton from '@/Components/DangerButton.vue'
import DataTable from '@/Components/DataTable.vue'
import StatusBadge from '@/Components/StatusBadge.vue'
import Pagination from '@/Components/Pagination.vue'
import SearchFilter from '@/Components/SearchFilter.vue'
import Modal from '@/Components/Modal.vue'
import StatsCard from '@/Components/StatsCard.vue'

const props = defineProps({
    deployments: Object,
    filters: Object,
    stats: Object,
    options: Object,
})

const filterForm = useForm({
    search: props.filters?.search || '',
    status: props.filters?.status || '',
    branch_id: props.filters?.branch_id || '',
    date_from: props.filters?.date_from || '',
    date_to: props.filters?.date_to || '',
    per_page: props.filters?.per_page || 15,
})

const form = useForm({
    version: '',
    environment: '',
    branch: '',
    release_notes: '',
})

let searchTimeout = null
const applyFilters = () => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        filterForm.get(route('deployments.index'), {
            preserveState: true,
            preserveScroll: true,
        })
    }, 300)
}

watch(() => filterForm.search, applyFilters)

const submit = () => {
    if (form.id) {
        form.put(route('deployments.update', form.id), {
            onSuccess: () => { showModal.value = false; form.reset() },
        })
    } else {
        form.post(route('deployments.store'), {
            onSuccess: () => { showModal.value = false; form.reset() },
        })
    }
}

const destroy = (id) => {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        router.delete(route('deployments.destroy', id))
    }
}

const rollback = (id) => {
    if (confirm('هل أنت متأكد من التراجع عن هذا النشر؟')) {
        router.post(route('deployments.rollback', id), {}, {
            onSuccess: () => alert('تم بدء عملية التراجع بنجاح'),
        })
    }
}

const showModal = ref(false)
const openCreate = () => { form.reset(); showModal.value = true }
const openEdit = (item) => { form.reset(); Object.assign(form, item); showModal.value = true }

const columns = [
    { key: 'version', label: 'الإصدار' },
    { key: 'environment', label: 'البيئة' },
    { key: 'status', label: 'الحالة' },
    { key: 'branch', label: 'الفرع' },
    { key: 'deployed_by', label: 'نُشر بواسطة' },
    { key: 'started_at', label: 'وقت البدء' },
    { key: 'duration_seconds', label: 'المدة (ث)' },
]
</script>

<template>
    <Head :title="'إدارة النشر'" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex items-center justify-between">
                <h2 class="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    🚀 إدارة النشر — DevOps
                </h2>
                <PrimaryButton @click="openCreate">
                    <span class="i-heroicons-plus-20-solid me-1" />
                    نشر جديد
                </PrimaryButton>
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
                        <select v-model="filterForm.branch_id" class="w-40 rounded border p-2" @change="applyFilters">
                            <option value="">كل الفروع</option>
                            <option v-for="b in options?.branches" :key="b.value" :value="b.value">{{ b.label }}</option>
                        </select>
                        <input v-model="filterForm.date_from" type="date" class="w-40 rounded border p-2" @change="applyFilters" />
                        <input v-model="filterForm.date_to" type="date" class="w-40 rounded border p-2" @change="applyFilters" />
                    </SearchFilter>
                </div>

                <!-- جدول البيانات -->
                <div class="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead class="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th v-for="col in columns" :key="col.key" class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                    {{ col.label }}
                                </th>
                                <th class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                            <tr v-for="item in deployments?.data" :key="item.id">
                                <td v-for="col in columns" :key="col.key" class="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                    <StatusBadge v-if="col.key === 'status'" :status="item[col.key]" />
                                    <span v-else>{{ item[col.key] }}</span>
                                </td>
                                <td class="whitespace-nowrap px-4 py-3 text-sm">
                                    <div class="flex gap-2">
                                        <button @click="openEdit(item)" class="text-blue-600 hover:underline">تعديل</button>
                                        <button @click="rollback(item.id)" class="text-yellow-600 hover:underline">تراجع</button>
                                        <button @click="destroy(item.id)" class="text-red-600 hover:underline">حذف</button>
                                    </div>
                                </td>
                            </tr>
                            <tr v-if="!deployments?.data?.length">
                                <td :colspan="columns.length + 1" class="py-8 text-center text-gray-400">لا توجد بيانات</td>
                            </tr>
                        </tbody>
                    </table>
                    <Pagination :links="deployments?.links" class="border-t p-4" />
                </div>
            </div>
        </div>

        <!-- Modal الإنشاء/التعديل -->
        <Modal :show="showModal" @close="showModal = false" max-width="2xl">
            <form @submit.prevent="submit" class="p-6">
                <h3 class="mb-6 text-lg font-medium text-gray-900 dark:text-gray-100">
                    {{ form.id ? 'تعديل نشر' : 'إنشاء نشر جديد' }}
                </h3>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <InputLabel for="version" value="رقم الإصدار" />
                        <TextInput id="version" v-model="form.version" type="text" class="mt-1 block w-full" required />
                        <InputError :message="form.errors.version" class="mt-2" />
                    </div>

                    <div>
                        <InputLabel for="environment" value="البيئة" />
                        <select id="environment" v-model="form.environment" class="mt-1 block w-full rounded border p-2">
                            <option v-for="e in options?.environments" :key="e.value" :value="e.value">{{ e.label }}</option>
                        </select>
                        <InputError :message="form.errors.environment" class="mt-2" />
                    </div>

                    <div>
                        <InputLabel for="branch" value="فرع Git" />
                        <TextInput id="branch" v-model="form.branch" type="text" class="mt-1 block w-full" />
                        <InputError :message="form.errors.branch" class="mt-2" />
                    </div>

                    <div class="sm:col-span-2">
                        <InputLabel for="release_notes" value="ملاحظات الإصدار" />
                        <textarea id="release_notes" v-model="form.release_notes" rows="4" class="mt-1 block w-full rounded border p-2" />
                        <InputError :message="form.errors.release_notes" class="mt-2" />
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
