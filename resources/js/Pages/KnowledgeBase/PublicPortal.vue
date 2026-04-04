<script setup>
// بوابة قاعدة المعرفة العامة
import { ref, watch } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import axios from 'axios'

const props = defineProps({
    categories: Array,
    featured: Array,
    faqs: Array,
    filters: Object,
})

const searchQuery = ref(props.filters?.q || '')
const searchResults = ref([])
const isSearching = ref(false)
const selectedCategory = ref(null)
const expandedFaqs = ref([])

// البحث مع debounce
let searchTimer = null
watch(searchQuery, (val) => {
    clearTimeout(searchTimer)
    if (!val.trim()) {
        searchResults.value = []
        return
    }
    isSearching.value = true
    searchTimer = setTimeout(async () => {
        try {
            const res = await axios.get(route('articles.search'), { params: { q: val } })
            searchResults.value = res.data.results || []
        } catch (e) {
            console.error('خطأ في البحث', e)
        } finally {
            isSearching.value = false
        }
    }, 400)
})

// تصفية الفئات
const filteredFaqs = () => {
    if (!selectedCategory.value) return props.faqs || []
    return (props.faqs || []).filter(faq => faq.category_id === selectedCategory.value)
}

// توسيع/طي سؤال شائع
const toggleFaq = (id) => {
    const idx = expandedFaqs.value.indexOf(id)
    if (idx > -1) {
        expandedFaqs.value.splice(idx, 1)
    } else {
        expandedFaqs.value.push(id)
    }
}

// تقييم مقالة
const rateArticle = async (id, isHelpful) => {
    try {
        await axios.post(route('articles.rate', id), { is_helpful: isHelpful })
    } catch (e) {
        console.error('خطأ في التقييم', e)
    }
}

// إغلاق نتائج البحث
const clearSearch = () => {
    searchQuery.value = ''
    searchResults.value = []
}
</script>

<template>
    <Head title="قاعدة المعرفة - مركز المساعدة" />

    <div class="min-h-screen bg-gray-50" dir="rtl">
        <!-- ترويسة البحث -->
        <div class="bg-gradient-to-br from-blue-600 to-blue-800 py-16 text-white">
            <div class="mx-auto max-w-4xl px-4 text-center">
                <h1 class="mb-4 text-4xl font-bold">مركز المساعدة والدعم</h1>
                <p class="mb-8 text-lg text-blue-100">ابحث في قاعدة معرفتنا للحصول على إجابات سريعة</p>

                <!-- شريط البحث -->
                <div class="relative mx-auto max-w-2xl">
                    <span class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
                    <input
                        v-model="searchQuery"
                        type="search"
                        placeholder="ابحث عن سؤال أو موضوع..."
                        class="w-full rounded-xl py-4 pr-12 pl-4 text-gray-900 shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300"
                    />
                    <div v-if="isSearching" class="absolute left-4 top-1/2 -translate-y-1/2">
                        <div class="h-5 w-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                    </div>
                    <button
                        v-if="searchQuery"
                        @click="clearSearch"
                        class="absolute left-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                <!-- نتائج البحث -->
                <div v-if="searchResults.length > 0" class="mt-4 rounded-xl bg-white text-right shadow-xl overflow-hidden">
                    <a
                        v-for="result in searchResults"
                        :key="result.id"
                        :href="route('articles.publicShow', result.slug)"
                        class="flex items-start gap-3 border-b px-4 py-3 text-gray-800 hover:bg-blue-50 transition-colors last:border-0"
                    >
                        <span class="mt-1 text-blue-500">📄</span>
                        <div>
                            <p class="font-medium text-gray-900">{{ result.title }}</p>
                            <p class="text-sm text-gray-500 line-clamp-1 mt-0.5">{{ result.excerpt }}</p>
                        </div>
                    </a>
                </div>

                <!-- رسالة عدم وجود نتائج -->
                <div v-else-if="searchQuery && !isSearching && searchResults.length === 0" class="mt-4 rounded-xl bg-white/10 px-4 py-3 text-white text-sm">
                    لم يتم العثور على نتائج لـ "{{ searchQuery }}"
                </div>
            </div>
        </div>

        <!-- المحتوى الرئيسي -->
        <div class="mx-auto max-w-7xl px-4 py-12">

            <!-- التصنيفات -->
            <section v-if="categories?.length" class="mb-12">
                <h2 class="mb-6 text-2xl font-bold text-gray-900">تصفح حسب الفئة</h2>
                <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    <a
                        v-for="category in categories"
                        :key="category.id"
                        :href="`/knowledge-base?category_id=${category.id}`"
                        class="group flex flex-col items-center rounded-xl border bg-white p-6 text-center shadow-sm transition-all hover:shadow-md hover:border-blue-200"
                    >
                        <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                            :style="category.color ? `background-color: ${category.color}20; color: ${category.color}` : 'background-color: #EFF6FF; color: #2563EB'">
                            {{ category.icon || '📁' }}
                        </div>
                        <p class="font-semibold text-gray-800 group-hover:text-blue-600">{{ category.name }}</p>
                        <p class="mt-1 text-xs text-gray-400">{{ category.article_count }} مقالة</p>
                    </a>
                </div>
            </section>

            <!-- المقالات المميزة -->
            <section v-if="featured?.length" class="mb-12">
                <h2 class="mb-6 text-2xl font-bold text-gray-900">المقالات المميزة</h2>
                <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <a
                        v-for="article in featured"
                        :key="article.id"
                        :href="route('articles.publicShow', article.slug)"
                        class="group rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md"
                    >
                        <div class="mb-3 flex items-center gap-2">
                            <span class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{{ article.type_label }}</span>
                            <span v-if="article.is_faq" class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">FAQ</span>
                        </div>
                        <h3 class="font-semibold text-gray-900 group-hover:text-blue-600 mb-2">{{ article.title }}</h3>
                        <p class="text-sm text-gray-500 line-clamp-2">{{ article.excerpt }}</p>
                        <div class="mt-3 flex items-center gap-3 text-xs text-gray-400">
                            <span>👁 {{ article.view_count }}</span>
                            <span>👍 {{ article.helpful_count }}</span>
                        </div>
                    </a>
                </div>
            </section>

            <!-- الأسئلة الشائعة -->
            <section v-if="faqs?.length" class="mb-12">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">الأسئلة الشائعة</h2>
                    <!-- فلتر الفئات -->
                    <div class="flex gap-2 flex-wrap">
                        <button
                            @click="selectedCategory = null"
                            class="rounded-full px-3 py-1 text-sm transition-colors"
                            :class="selectedCategory === null ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:border-blue-300'"
                        >
                            الكل
                        </button>
                        <button
                            v-for="category in categories"
                            :key="category.id"
                            @click="selectedCategory = category.id"
                            class="rounded-full px-3 py-1 text-sm transition-colors"
                            :class="selectedCategory === category.id ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:border-blue-300'"
                        >
                            {{ category.name }}
                        </button>
                    </div>
                </div>

                <div class="space-y-3">
                    <div
                        v-for="faq in filteredFaqs()"
                        :key="faq.id"
                        class="overflow-hidden rounded-xl border bg-white shadow-sm"
                    >
                        <!-- السؤال -->
                        <button
                            @click="toggleFaq(faq.id)"
                            class="flex w-full items-center justify-between px-5 py-4 text-right"
                        >
                            <span class="font-medium text-gray-900">{{ faq.title }}</span>
                            <span class="ms-4 flex-shrink-0 text-gray-400 transition-transform" :class="expandedFaqs.includes(faq.id) ? 'rotate-180' : ''">
                                ▼
                            </span>
                        </button>

                        <!-- الجواب -->
                        <Transition
                            enter-active-class="transition-all duration-200 ease-out"
                            enter-from-class="opacity-0 max-h-0"
                            enter-to-class="opacity-100 max-h-screen"
                        >
                            <div v-if="expandedFaqs.includes(faq.id)" class="border-t px-5 py-4">
                                <p class="text-gray-600 leading-relaxed">{{ faq.excerpt || faq.content?.substring(0, 500) }}</p>
                                <div class="mt-4 flex items-center gap-4">
                                    <span class="text-sm text-gray-400">هل كانت هذه الإجابة مفيدة؟</span>
                                    <button
                                        @click="rateArticle(faq.id, true)"
                                        class="flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-gray-500 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
                                    >
                                        👍 نعم
                                    </button>
                                    <button
                                        @click="rateArticle(faq.id, false)"
                                        class="flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
                                    >
                                        👎 لا
                                    </button>
                                    <a
                                        :href="route('articles.publicShow', faq.slug)"
                                        class="text-xs text-blue-500 hover:text-blue-700"
                                    >
                                        قراءة المزيد ←
                                    </a>
                                </div>
                            </div>
                        </Transition>
                    </div>
                </div>
            </section>

            <!-- لم تجد ما تبحث عنه؟ -->
            <section class="rounded-2xl bg-blue-50 p-8 text-center">
                <h3 class="text-xl font-bold text-gray-900 mb-2">لم تجد ما تبحث عنه؟</h3>
                <p class="text-gray-500 mb-6">فريق الدعم لدينا مستعد لمساعدتك على مدار الساعة</p>
                <div class="flex justify-center gap-4">
                    <a
                        href="/contact"
                        class="rounded-xl bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
                    >
                        تواصل معنا
                    </a>
                    <button
                        onclick="document.querySelector('[aria-label=\'فتح الدردشة\']')?.click()"
                        class="rounded-xl border border-blue-200 bg-white px-6 py-3 text-blue-600 font-medium hover:bg-blue-50 transition-colors"
                    >
                        💬 الدردشة المباشرة
                    </button>
                </div>
            </section>
        </div>
    </div>
</template>
