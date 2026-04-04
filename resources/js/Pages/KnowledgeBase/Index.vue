<script setup>
// KbArticle — KnowledgeBase/Index.vue
import { ref, watch } from 'vue'
import { useForm, router } from '@inertiajs/vue3'
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
import ToggleSwitch from '@/Components/ToggleSwitch.vue'
import DataTable from '@/Components/DataTable.vue'
import StatusBadge from '@/Components/StatusBadge.vue'
import Pagination from '@/Components/Pagination.vue'
import SearchFilter from '@/Components/SearchFilter.vue'
import Modal from '@/Components/Modal.vue'
import StatsCard from '@/Components/StatsCard.vue'

// Props
const props = defineProps({
    articles: Object,
    filters: Object,
    stats: Object,
    options: Object,
})

// نموذج البحث والفلترة
const filterForm = useForm({
    search: props.filters?.search || '',
    status: props.filters?.status || '',
    category_id: props.filters?.category_id || '',
    type: props.filters?.type || '',
    is_faq: props.filters?.is_faq || '',
    per_page: props.filters?.per_page || 15,
})

// نموذج الإنشاء/التعديل
const form = useForm({
    id: null,
    title: '',
    category_id: '',
    type: 'article',
    status: 'draft',
    excerpt: '',
    content: '',
    is_public: true,
    is_faq: false,
    is_featured: false,
    meta_title: '',
    meta_description: '',
})

// البحث مع debounce
let searchTimeout = null
const applyFilters = () => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        filterForm.get(route('articles.index'), {
            preserveState: true,
            preserveScroll: true,
        })
    }, 300)
}

watch(() => filterForm.search, applyFilters)

// الحفظ
const submit = () => {
    if (form.id) {
        form.put(route('articles.update', form.id), {
            onSuccess: () => {
                showModal.value = false
                form.reset()
            },
        })
    } else {
        form.post(route('articles.store'), {
            onSuccess: () => {
                showModal.value = false
                form.reset()
            },
        })
    }
}

// نشر مقالة
const publish = (id) => {
    if (confirm('هل تريد نشر هذه المقالة؟')) {
        router.patch(route('articles.publish', id))
    }
}

// الحذف
const destroy = (id) => {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        router.delete(route('articles.destroy', id))
    }
}

// Modal
const showModal = ref(false)
const openCreate = () => {
    form.reset()
    form.id = null
    showModal.value = true
}
const openEdit = (item) => {
    form.reset()
    form.id = item.id
    form.title = item.title || ''
    form.category_id = item.category_id || ''
    form.type = item.type || 'article'
    form.status = item.status || 'draft'
    form.excerpt = item.excerpt || ''
    form.content = item.content || ''
    form.is_public = item.is_public ?? true
    form.is_faq = item.is_faq ?? false
    form.is_featured = item.is_featured ?? false
    form.meta_title = item.meta_title || ''
    form.meta_description = item.meta_description || ''
    showModal.value = true
}

// الأعمدة
const columns = [
    { key: 'title', label: 'العنوان' },
    { key: 'type_label', label: 'النوع' },
    { key: 'status_label', label: 'الحالة' },
    { key: 'view_count', label: 'المشاهدات' },
    { key: 'helpful_count', label: 'مفيد' },
    { key: 'published_at', label: 'تاريخ النشر' },
]
</script>

<template>
    <Head title="قاعدة المعرفة" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex items-center justify-between">
                <h2 class="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    إدارة قاعدة المعرفة
                </h2>
                <div class="flex items-center gap-2">
                    <a :href="route('articles.faqs')" class="rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                        الأسئلة الشائعة
                    </a>
                    <PrimaryButton @click="openCreate">
                        <span class="i-heroicons-plus-20-solid me-1" />
                        مقالة جديدة
                    </PrimaryButton>
                </div>
            </div>
        </template>

        <div class="py-6">
            <div class="mx-auto max-w-7xl sm:px-6 lg:px-8">
                <!-- بطاقات الإحصائيات -->
                <div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4" v-if="stats">
                    <div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800 text-center">
                        <p class="text-2xl font-bold text-blue-600">{{ stats.total_articles }}</p>
                        <p class="text-sm text-gray-500">إجمالي المقالات</p>
                    </div>
                    <div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800 text-center">
                        <p class="text-2xl font-bold text-green-600">{{ stats.published }}</p>
                        <p class="text-sm text-gray-500">منشورة</p>
                    </div>
                    <div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800 text-center">
                        <p class="text-2xl font-bold text-purple-600">{{ stats.total_views?.toLocaleString() }}</p>
                        <p class="text-sm text-gray-500">إجمالي المشاهدات</p>
                    </div>
                    <div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800 text-center">
                        <p class="text-2xl font-bold text-yellow-600">{{ stats.helpful_percentage }}%</p>
                        <p class="text-sm text-gray-500">نسبة الفائدة</p>
                    </div>
                </div>

                <!-- فلاتر البحث -->
                <div class="mb-6 rounded-lg bg-white p-4 shadow dark:bg-gray-800">
                    <SearchFilter
                        v-model="filterForm.search"
                        :filters="filterForm"
                        @reset="filterForm.reset()"
                    >
                        <SelectInput v-model="filterForm.status" :options="options?.statuses" placeholder="كل الحالات" class="w-36" @change="applyFilters" />
                        <SelectInput v-model="filterForm.category_id" :options="options?.categories" placeholder="كل الفئات" class="w-36" @change="applyFilters" />
                        <SelectInput v-model="filterForm.type" :options="options?.types" placeholder="كل الأنواع" class="w-36" @change="applyFilters" />
                    </SearchFilter>
                </div>

                <!-- جدول البيانات -->
                <div class="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead class="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">العنوان</th>
                                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المشاهدات</th>
                                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                                <tr v-for="article in articles.data" :key="article.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td class="px-4 py-3">
                                        <div>
                                            <p class="font-medium text-gray-900 dark:text-gray-100">{{ article.title }}</p>
                                            <p class="text-xs text-gray-500 mt-1">{{ article.category?.name }}</p>
                                        </div>
                                    </td>
                                    <td class="px-4 py-3 text-sm text-gray-500">{{ article.type_label }}</td>
                                    <td class="px-4 py-3">
                                        <StatusBadge :status="article.status" :label="article.status_label" :color="article.status_color" />
                                    </td>
                                    <td class="px-4 py-3 text-sm text-gray-500">{{ article.view_count }}</td>
                                    <td class="px-4 py-3">
                                        <div class="flex items-center gap-2">
                                            <button
                                                v-if="article.status !== 'published'"
                                                @click="publish(article.id)"
                                                class="rounded px-2 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200"
                                            >
                                                نشر
                                            </button>
                                            <button @click="openEdit(article)" class="rounded px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200">تعديل</button>
                                            <button @click="destroy(article.id)" class="rounded px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200">حذف</button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <Pagination :links="articles.links" class="border-t p-4" />
                </div>
            </div>
        </div>

        <!-- Modal الإنشاء/التعديل -->
        <Modal :show="showModal" @close="showModal = false" max-width="3xl">
            <form @submit.prevent="submit" class="p-6">
                <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
                    {{ form.id ? 'تعديل المقالة' : 'إنشاء مقالة جديدة' }}
                </h3>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div class="sm:col-span-2">
                        <InputLabel for="title" value="العنوان *" />
                        <TextInput id="title" v-model="form.title" type="text" :error="form.errors.title" class="mt-1 block w-full" required />
                        <InputError :message="form.errors.title" class="mt-2" />
                    </div>

                    <div>
                        <InputLabel for="category_id" value="الفئة *" />
                        <SelectInput id="category_id" v-model="form.category_id" :options="options?.categories" :error="form.errors.category_id" class="mt-1 block w-full" />
                        <InputError :message="form.errors.category_id" class="mt-2" />
                    </div>

                    <div>
                        <InputLabel for="type" value="النوع *" />
                        <SelectInput id="type" v-model="form.type" :options="options?.types" :error="form.errors.type" class="mt-1 block w-full" />
                        <InputError :message="form.errors.type" class="mt-2" />
                    </div>

                    <div>
                        <InputLabel for="status" value="الحالة *" />
                        <SelectInput id="status" v-model="form.status" :options="options?.statuses" :error="form.errors.status" class="mt-1 block w-full" />
                        <InputError :message="form.errors.status" class="mt-2" />
                    </div>

                    <div class="sm:col-span-2">
                        <InputLabel for="excerpt" value="الملخص" />
                        <TextareaInput id="excerpt" v-model="form.excerpt" rows="2" class="mt-1 block w-full" />
                        <InputError :message="form.errors.excerpt" class="mt-2" />
                    </div>

                    <div class="sm:col-span-2">
                        <InputLabel for="content" value="المحتوى *" />
                        <TextareaInput id="content" v-model="form.content" rows="6" :error="form.errors.content" class="mt-1 block w-full" />
                        <InputError :message="form.errors.content" class="mt-2" />
                    </div>

                    <div class="flex items-center gap-6">
                        <ToggleSwitch v-model="form.is_public" label="عام" />
                        <ToggleSwitch v-model="form.is_faq" label="سؤال شائع" />
                        <ToggleSwitch v-model="form.is_featured" label="مميز" />
                    </div>

                    <div>
                        <InputLabel for="meta_title" value="عنوان SEO" />
                        <TextInput id="meta_title" v-model="form.meta_title" type="text" class="mt-1 block w-full" />
                    </div>

                    <div class="sm:col-span-2">
                        <InputLabel for="meta_description" value="وصف SEO" />
                        <TextareaInput id="meta_description" v-model="form.meta_description" rows="2" class="mt-1 block w-full" />
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
