<script setup>
// مكون ويدجت الشات بوت القابل للتضمين
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const props = defineProps({
    position: { type: String, default: 'bottom-right' },
    primaryColor: { type: String, default: '#2563eb' },
    language: { type: String, default: 'ar' },
    branchId: { type: Number, required: true },
})

const isOpen = ref(false)
const messages = ref([])
const inputText = ref('')
const isTyping = ref(false)
const isLoading = ref(false)
const sessionId = ref(null)
const messagesContainer = ref(null)
const satisfactionShown = ref(false)
const rating = ref(0)

// توليد معرف الجلسة
const generateSessionId = () => {
    sessionId.value = 'chat_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
    localStorage.setItem('chatbot_session', sessionId.value)
}

// إرسال رسالة
const sendMessage = async () => {
    const text = inputText.value.trim()
    if (!text || isLoading.value) return

    messages.value.push({
        id: Date.now(),
        sender_type: 'user',
        content: text,
        created_at: new Date().toISOString(),
    })
    inputText.value = ''
    scrollToBottom()

    isTyping.value = true
    isLoading.value = true

    try {
        const res = await axios.post(route('conversations.sendMessage'), {
            session_id: sessionId.value,
            content: text,
            language: props.language,
            channel: 'web',
        })

        const botMsg = res.data.message
        messages.value.push({
            id: botMsg.id || Date.now(),
            sender_type: 'bot',
            content: botMsg.content,
            message_type: botMsg.message_type,
            buttons: botMsg.buttons,
            created_at: botMsg.created_at,
        })

        // عرض تقييم بعد 5 رسائل
        if (messages.value.length >= 10 && !satisfactionShown.value) {
            satisfactionShown.value = true
        }
    } catch (e) {
        messages.value.push({
            id: Date.now(),
            sender_type: 'bot',
            content: props.language === 'ar'
                ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
                : 'Sorry, an error occurred. Please try again.',
            created_at: new Date().toISOString(),
        })
    } finally {
        isTyping.value = false
        isLoading.value = false
        scrollToBottom()
    }
}

// النقر على زر سريع
const handleButtonClick = (payload) => {
    inputText.value = payload
    sendMessage()
}

// تقييم المحادثة
const submitRating = async () => {
    if (!rating.value) return
    await axios.post(route('conversations.rateSatisfaction', sessionId.value), {
        rating: rating.value
    })
    satisfactionShown.value = false
}

// التمرير للأسفل
const scrollToBottom = async () => {
    await nextTick()
    if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
}

// ضغط Enter لإرسال
const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
    }
}

// فتح الشات
const openChat = () => {
    isOpen.value = true
    if (messages.value.length === 0) {
        messages.value.push({
            id: 1,
            sender_type: 'bot',
            content: props.language === 'ar'
                ? 'مرحباً! 👋 كيف يمكنني مساعدتك اليوم؟'
                : 'Hello! 👋 How can I help you today?',
            message_type: 'quick_reply',
            buttons: [
                { title: props.language === 'ar' ? 'حجز موعد' : 'Book Appointment', payload: 'book_appointment' },
                { title: props.language === 'ar' ? 'الاستعلام عن طلب' : 'Check Status', payload: 'check_status' },
                { title: props.language === 'ar' ? 'الأسئلة الشائعة' : 'FAQs', payload: 'faq' },
                { title: props.language === 'ar' ? 'التحدث مع موظف' : 'Talk to Agent', payload: 'human_handoff' },
            ],
            created_at: new Date().toISOString(),
        })
    }
    scrollToBottom()
}

onMounted(() => {
    sessionId.value = localStorage.getItem('chatbot_session') || null
    if (!sessionId.value) generateSessionId()
})
</script>

<template>
    <div :dir="language === 'ar' ? 'rtl' : 'ltr'">
        <!-- فقاعة فتح الشات -->
        <Transition name="bounce">
            <button
                v-if="!isOpen"
                @click="openChat"
                class="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg text-white text-2xl transition-transform hover:scale-110"
                :style="{ backgroundColor: primaryColor }"
                aria-label="فتح الدردشة"
            >
                💬
            </button>
        </Transition>

        <!-- نافذة الشات -->
        <Transition name="slide-up">
            <div
                v-if="isOpen"
                class="fixed bottom-6 right-6 z-50 flex w-80 flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
                style="height: 520px;"
            >
                <!-- الترويسة -->
                <div class="flex items-center justify-between px-4 py-3 text-white flex-shrink-0" :style="{ backgroundColor: primaryColor }">
                    <div class="flex items-center gap-2">
                        <div class="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">🤖</div>
                        <div>
                            <p class="text-sm font-semibold">{{ language === 'ar' ? 'المساعد الذكي' : 'Smart Assistant' }}</p>
                            <p class="text-xs opacity-80">{{ language === 'ar' ? 'متصل الآن' : 'Online now' }}</p>
                        </div>
                    </div>
                    <button @click="isOpen = false" class="rounded-full p-1 text-white/80 hover:text-white hover:bg-white/20 transition-colors">
                        ✕
                    </button>
                </div>

                <!-- الرسائل -->
                <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                    <div
                        v-for="msg in messages"
                        :key="msg.id"
                        class="flex"
                        :class="msg.sender_type === 'user' ? 'justify-end' : 'justify-start'"
                    >
                        <!-- رسالة البوت -->
                        <div v-if="msg.sender_type !== 'user'" class="flex items-end gap-2 max-w-[85%]">
                            <div class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm">🤖</div>
                            <div>
                                <div class="rounded-2xl rounded-bl-none bg-white px-3 py-2 shadow-sm text-sm text-gray-800">
                                    {{ msg.content }}
                                </div>
                                <!-- أزرار الرد السريع -->
                                <div v-if="msg.buttons?.length" class="mt-2 flex flex-wrap gap-1">
                                    <button
                                        v-for="btn in msg.buttons"
                                        :key="btn.payload"
                                        @click="handleButtonClick(btn.payload)"
                                        class="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
                                    >
                                        {{ btn.title }}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- رسالة المستخدم -->
                        <div
                            v-else
                            class="max-w-[85%] rounded-2xl rounded-br-none px-3 py-2 text-sm text-white shadow-sm"
                            :style="{ backgroundColor: primaryColor }"
                        >
                            {{ msg.content }}
                        </div>
                    </div>

                    <!-- مؤشر الكتابة -->
                    <div v-if="isTyping" class="flex items-end gap-2">
                        <div class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-sm">🤖</div>
                        <div class="rounded-2xl rounded-bl-none bg-white px-3 py-2 shadow-sm">
                            <div class="flex gap-1">
                                <div class="h-2 w-2 animate-bounce rounded-full bg-gray-400" style="animation-delay: 0ms" />
                                <div class="h-2 w-2 animate-bounce rounded-full bg-gray-400" style="animation-delay: 150ms" />
                                <div class="h-2 w-2 animate-bounce rounded-full bg-gray-400" style="animation-delay: 300ms" />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- تقييم الرضا -->
                <div v-if="satisfactionShown" class="border-t bg-yellow-50 p-3 text-center flex-shrink-0">
                    <p class="text-xs text-gray-600 mb-2">{{ language === 'ar' ? 'كيف كانت تجربتك؟' : 'How was your experience?' }}</p>
                    <div class="flex justify-center gap-1 mb-2">
                        <button
                            v-for="star in 5"
                            :key="star"
                            @click="rating = star"
                            class="text-xl transition-transform hover:scale-110"
                        >
                            {{ star <= rating ? '⭐' : '☆' }}
                        </button>
                    </div>
                    <div class="flex gap-2 justify-center">
                        <button @click="submitRating" class="rounded-lg bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600">
                            {{ language === 'ar' ? 'إرسال' : 'Submit' }}
                        </button>
                        <button @click="satisfactionShown = false" class="rounded-lg border px-3 py-1 text-xs text-gray-500 hover:bg-gray-100">
                            {{ language === 'ar' ? 'تخطي' : 'Skip' }}
                        </button>
                    </div>
                </div>

                <!-- حقل الإدخال -->
                <div class="border-t bg-white p-3 flex-shrink-0">
                    <div class="flex items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2">
                        <input
                            v-model="inputText"
                            @keydown="handleKeyDown"
                            type="text"
                            :placeholder="language === 'ar' ? 'اكتب رسالتك...' : 'Type your message...'"
                            class="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-400"
                            :disabled="isLoading"
                        />
                        <button
                            @click="sendMessage"
                            :disabled="!inputText.trim() || isLoading"
                            class="flex h-8 w-8 items-center justify-center rounded-full text-white transition-all disabled:opacity-50"
                            :style="{ backgroundColor: primaryColor }"
                        >
                            <span v-if="isLoading" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span v-else>{{ language === 'ar' ? '↑' : '↑' }}</span>
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.bounce-enter-active { animation: bounce-in 0.3s; }
@keyframes bounce-in {
    0% { transform: scale(0); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
}
.slide-up-enter-active { transition: all 0.3s ease-out; }
.slide-up-leave-active { transition: all 0.2s ease-in; }
.slide-up-enter-from,
.slide-up-leave-to { transform: translateY(20px); opacity: 0; }
</style>
