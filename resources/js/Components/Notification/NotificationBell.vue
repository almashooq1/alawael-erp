<script setup>
// مكون جرس الإشعارات في الشريط العلوي
import { ref, onMounted, onUnmounted } from 'vue'
import { router, usePage } from '@inertiajs/vue3'
import axios from 'axios'

const page = usePage()
const notifications = ref([])
const unreadCount = ref(0)
const isOpen = ref(false)
const isLoading = ref(false)

// جلب الإشعارات
const fetchNotifications = async () => {
    isLoading.value = true
    try {
        const res = await axios.get(route('notifications.inbox'), {
            headers: { 'Accept': 'application/json' }
        })
        notifications.value = res.data.notifications?.data || []
        unreadCount.value = res.data.unread_count || 0
    } catch (e) {
        console.error('فشل جلب الإشعارات', e)
    } finally {
        isLoading.value = false
    }
}

// تحديد كمقروء
const markRead = async (id) => {
    await axios.patch(route('notifications.markRead', id))
    const notif = notifications.value.find(n => n.id === id)
    if (notif) {
        notif.read_at = new Date().toISOString()
        notif.is_read = true
        unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
}

// تحديد جميع كمقروءة
const markAllRead = async () => {
    await axios.post(route('notifications.markAllRead'))
    notifications.value.forEach(n => {
        n.read_at = new Date().toISOString()
        n.is_read = true
    })
    unreadCount.value = 0
}

// إغلاق القائمة عند النقر خارجها
const handleClickOutside = (e) => {
    if (!e.target.closest('.notification-bell-wrapper')) {
        isOpen.value = false
    }
}

// الاستماع للإشعارات عبر Echo/WebSocket
let echoChannel = null
let pollInterval = null

onMounted(() => {
    fetchNotifications()

    if (window.Echo) {
        echoChannel = window.Echo.private(`App.Models.User.${page.props.auth.user.id}`)
            .notification((notification) => {
                notifications.value.unshift(notification)
                unreadCount.value++
                // صوت الإشعار
                new Audio('/sounds/notification.mp3').play().catch(() => {})
            })
    }

    // جلب كل دقيقة
    pollInterval = setInterval(fetchNotifications, 60000)

    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    if (pollInterval) clearInterval(pollInterval)
    if (echoChannel) echoChannel.stopListening('.notification')
    document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
    <div class="notification-bell-wrapper relative" dir="rtl">
        <!-- زر الجرس -->
        <button
            @click="isOpen = !isOpen"
            class="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            aria-label="الإشعارات"
        >
            <span class="i-heroicons-bell-20-solid text-xl" />
            <!-- عداد الإشعارات غير المقروءة -->
            <span
                v-if="unreadCount > 0"
                class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white"
            >
                {{ unreadCount > 99 ? '99+' : unreadCount }}
            </span>
        </button>

        <!-- قائمة الإشعارات -->
        <Transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
        >
            <div
                v-if="isOpen"
                class="absolute left-0 top-full mt-2 w-80 rounded-xl bg-white shadow-xl ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 z-50"
            >
                <!-- الترويسة -->
                <div class="flex items-center justify-between border-b px-4 py-3 dark:border-gray-700">
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100">الإشعارات</h3>
                    <div class="flex items-center gap-2">
                        <button
                            v-if="unreadCount > 0"
                            @click="markAllRead"
                            class="text-xs text-blue-500 hover:text-blue-700"
                        >
                            تحديد الكل
                        </button>
                        <a
                            :href="route('notifications.inbox')"
                            class="text-xs text-gray-500 hover:text-gray-700"
                        >
                            عرض الكل
                        </a>
                    </div>
                </div>

                <!-- قائمة الإشعارات -->
                <div class="max-h-96 overflow-y-auto">
                    <div v-if="isLoading" class="flex justify-center py-8">
                        <div class="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    </div>

                    <template v-else>
                        <div
                            v-for="notif in notifications.slice(0, 10)"
                            :key="notif.id"
                            class="flex items-start gap-3 border-b px-4 py-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50 cursor-pointer"
                            :class="{ 'bg-blue-50 dark:bg-blue-900/20': !notif.is_read }"
                            @click="!notif.is_read && markRead(notif.id)"
                        >
                            <!-- نقطة القراءة -->
                            <div class="mt-1.5 flex-shrink-0">
                                <div
                                    class="h-2 w-2 rounded-full"
                                    :class="notif.is_read ? 'bg-transparent' : 'bg-blue-500'"
                                />
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" v-if="notif.subject">
                                    {{ notif.subject }}
                                </p>
                                <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                                    {{ notif.body }}
                                </p>
                                <p class="text-xs text-gray-400 mt-1">
                                    {{ notif.sent_at ? new Date(notif.sent_at).toLocaleString('ar-SA') : '' }}
                                </p>
                            </div>
                        </div>

                        <div v-if="notifications.length === 0" class="py-8 text-center text-sm text-gray-500">
                            لا توجد إشعارات
                        </div>
                    </template>
                </div>
            </div>
        </Transition>
    </div>
</template>
