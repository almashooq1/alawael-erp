<script setup>
// لوحة مراقبة الأداء في الوقت الفعلي
import { ref, onMounted, onUnmounted, computed } from 'vue'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue'
import { Head } from '@inertiajs/vue3'
import StatsCard from '@/Components/StatsCard.vue'

const props = defineProps({
    stats: Object,
    recentMetrics: Object,
    openIncidents: Array,
    slaData: Object,
})

const refreshInterval = ref(null)
const lastUpdated = ref(new Date())
const isRefreshing = ref(false)

const cpuHistory = ref([])
const memoryHistory = ref([])
const responseHistory = ref([])

const fetchMetrics = async () => {
    isRefreshing.value = true
    try {
        const response = await fetch('/api/v1/monitoring/metrics?type=cpu,memory,response_time&hours=1')
        const data = await response.json()
        cpuHistory.value = data.cpu || []
        memoryHistory.value = data.memory || []
        responseHistory.value = data.response_time || []
        lastUpdated.value = new Date()
    } catch (error) {
        console.error('Failed to fetch metrics:', error)
    } finally {
        isRefreshing.value = false
    }
}

const getMetricColor = (value, thresholds = { warning: 70, critical: 90 }) => {
    if (value >= thresholds.critical) return 'text-red-600'
    if (value >= thresholds.warning) return 'text-yellow-600'
    return 'text-green-600'
}

const slaPercentage = computed(() => props.slaData?.uptime_percentage || 0)

const slaColor = computed(() => {
    if (slaPercentage.value >= 99.9) return 'text-green-600'
    if (slaPercentage.value >= 99.0) return 'text-yellow-600'
    return 'text-red-600'
})

onMounted(() => {
    fetchMetrics()
    refreshInterval.value = setInterval(fetchMetrics, 30000)
})

onUnmounted(() => {
    clearInterval(refreshInterval.value)
})
</script>

<template>
    <Head title="مراقبة الأداء" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex items-center justify-between">
                <h2 class="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    📊 لوحة مراقبة الأداء
                </h2>
                <div class="flex items-center gap-3">
                    <span class="text-sm text-gray-500">
                        آخر تحديث: {{ lastUpdated.toLocaleTimeString('ar-SA') }}
                    </span>
                    <span v-if="isRefreshing" class="animate-pulse text-sm text-blue-500">
                        جاري التحديث...
                    </span>
                </div>
            </div>
        </template>

        <div class="py-6">
            <div class="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">

                <!-- بطاقات الإحصائيات السريعة -->
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div
                        v-for="(stat, key) in stats"
                        :key="key"
                        class="rounded-lg bg-white p-4 shadow dark:bg-gray-800"
                    >
                        <div class="text-sm text-gray-500">{{ stat.title }}</div>
                        <div
                            class="mt-1 text-2xl font-bold"
                            :class="getMetricColor(parseFloat(stat.value))"
                        >
                            {{ stat.value }}
                        </div>
                    </div>
                </div>

                <!-- رسوم بيانية - مؤشرات بسيطة -->
                <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
                        <h3 class="mb-4 font-medium text-gray-700 dark:text-gray-300">استخدام المعالج — آخر ساعة</h3>
                        <div class="space-y-1">
                            <div v-for="(point, i) in cpuHistory.slice(-10)" :key="i" class="flex items-center gap-2">
                                <div class="h-3 rounded bg-red-400" :style="{ width: point.value + '%' }" />
                                <span class="text-xs text-gray-500">{{ point.value }}%</span>
                            </div>
                            <p v-if="!cpuHistory.length" class="text-sm text-gray-400">لا توجد بيانات</p>
                        </div>
                    </div>

                    <div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
                        <h3 class="mb-4 font-medium text-gray-700 dark:text-gray-300">استخدام الذاكرة — آخر ساعة</h3>
                        <div class="space-y-1">
                            <div v-for="(point, i) in memoryHistory.slice(-10)" :key="i" class="flex items-center gap-2">
                                <div class="h-3 rounded bg-yellow-400" :style="{ width: point.value + '%' }" />
                                <span class="text-xs text-gray-500">{{ point.value }}%</span>
                            </div>
                            <p v-if="!memoryHistory.length" class="text-sm text-gray-400">لا توجد بيانات</p>
                        </div>
                    </div>

                    <div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
                        <h3 class="mb-4 font-medium text-gray-700 dark:text-gray-300">زمن الاستجابة — آخر ساعة</h3>
                        <div class="space-y-1">
                            <div v-for="(point, i) in responseHistory.slice(-10)" :key="i" class="flex items-center gap-2">
                                <div class="h-3 rounded bg-blue-400" :style="{ width: Math.min(point.value / 20, 100) + '%' }" />
                                <span class="text-xs text-gray-500">{{ point.value }}ms</span>
                            </div>
                            <p v-if="!responseHistory.length" class="text-sm text-gray-400">لا توجد بيانات</p>
                        </div>
                    </div>
                </div>

                <!-- SLA + الحوادث المفتوحة -->
                <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <!-- SLA -->
                    <div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
                        <h3 class="mb-4 font-medium text-gray-700 dark:text-gray-300">
                            مستوى الخدمة SLA — هذا الشهر
                        </h3>
                        <div class="flex items-center gap-6">
                            <div class="text-center">
                                <div :class="['text-4xl font-bold', slaColor]">
                                    {{ slaPercentage.toFixed(2) }}%
                                </div>
                                <div class="mt-1 text-sm text-gray-500">وقت التشغيل</div>
                            </div>
                            <div class="flex-1 space-y-2">
                                <div class="flex justify-between text-sm">
                                    <span>الهدف</span>
                                    <span class="font-medium">{{ slaData?.target_uptime }}%</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span>وقت التوقف</span>
                                    <span class="font-medium text-red-600">
                                        {{ slaData?.downtime_minutes || 0 }} دقيقة
                                    </span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span>عدد الحوادث</span>
                                    <span class="font-medium">{{ slaData?.incident_count || 0 }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- الحوادث المفتوحة -->
                    <div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
                        <h3 class="mb-4 font-medium text-gray-700 dark:text-gray-300">
                            الحوادث المفتوحة
                            <span
                                v-if="openIncidents?.length"
                                class="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
                            >
                                {{ openIncidents.length }}
                            </span>
                        </h3>

                        <div v-if="openIncidents?.length" class="space-y-3">
                            <div
                                v-for="incident in openIncidents"
                                :key="incident.id"
                                class="flex items-start gap-3 rounded-lg bg-red-50 p-3 dark:bg-red-900/20"
                            >
                                <span class="mt-0.5 text-red-500">⚠</span>
                                <div class="flex-1">
                                    <div class="text-sm font-medium">{{ incident.alert?.name }}</div>
                                    <div class="mt-0.5 text-xs text-gray-500">
                                        القيمة: {{ incident.triggered_value }} |
                                        منذ: {{ incident.started_at }}
                                    </div>
                                </div>
                                <span class="rounded-full bg-red-200 px-2 py-1 text-xs text-red-800">
                                    {{ incident.alert?.severity }}
                                </span>
                            </div>
                        </div>
                        <div v-else class="py-8 text-center text-gray-400">
                            <span class="text-2xl">✅</span>
                            <p class="mt-2 text-sm">لا توجد حوادث مفتوحة</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </AuthenticatedLayout>
</template>
