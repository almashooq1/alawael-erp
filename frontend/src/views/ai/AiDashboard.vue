<template>
  <div class="ai-dashboard p-6" dir="rtl">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">🤖 لوحة الذكاء الاصطناعي</h1>
        <p class="text-sm text-gray-500 mt-1">التحليلات التنبؤية والتنبيهات الاستباقية</p>
      </div>
      <div class="flex items-center gap-3">
        <select
          v-model="selectedBranch"
          @change="loadDashboard"
          class="text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">جميع الفروع</option>
          <option v-for="branch in branches" :key="branch._id" :value="branch._id">
            {{ branch.name_ar || branch.name }}
          </option>
        </select>
        <button
          @click="runManualChecks"
          :disabled="runningChecks"
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          <span v-if="runningChecks" class="animate-spin">⟳</span>
          <span v-else>▶</span>
          {{ runningChecks ? 'جارٍ الفحص...' : 'تشغيل الفحوصات' }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>

    <div v-else>
      <!-- KPI Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <!-- التنبيهات -->
        <div
          class="bg-white rounded-xl shadow-sm p-5 border-r-4 cursor-pointer hover:shadow-md transition-shadow"
          :class="alertsBorderClass"
          @click="activeTab = 'alerts'"
        >
          <div class="flex items-center justify-between mb-3">
            <span class="text-3xl">🔔</span>
            <span
              class="text-2xl font-bold"
              :class="dashboard?.alerts?.total_unread > 0 ? 'text-red-600' : 'text-gray-400'"
            >
              {{ dashboard?.alerts?.total_unread || 0 }}
            </span>
          </div>
          <p class="text-sm font-medium text-gray-700">تنبيهات غير مقروءة</p>
          <div class="mt-2 flex gap-2 text-xs">
            <span v-if="dashboard?.alerts?.urgent" class="text-red-600 font-semibold">
              {{ dashboard.alerts.urgent }} عاجل
            </span>
            <span v-if="dashboard?.alerts?.critical" class="text-orange-500">
              {{ dashboard.alerts.critical }} حرج
            </span>
            <span v-if="dashboard?.alerts?.warning" class="text-yellow-600">
              {{ dashboard.alerts.warning }} تحذير
            </span>
          </div>
        </div>

        <!-- التنبؤات النشطة -->
        <div
          class="bg-white rounded-xl shadow-sm p-5 border-r-4 border-blue-400 cursor-pointer hover:shadow-md transition-shadow"
          @click="activeTab = 'predictions'"
        >
          <div class="flex items-center justify-between mb-3">
            <span class="text-3xl">📈</span>
            <span class="text-2xl font-bold text-blue-600">
              {{ dashboard?.predictions?.total_active || 0 }}
            </span>
          </div>
          <p class="text-sm font-medium text-gray-700">تنبؤات نشطة</p>
          <div class="mt-2 text-xs text-gray-500">
            دقة النموذج:
            <span class="font-semibold text-blue-600">
              {{ formatPercent(dashboard?.predictions?.accuracy_last_month) }}
            </span>
          </div>
        </div>

        <!-- مستفيدون في خطر -->
        <div
          class="bg-white rounded-xl shadow-sm p-5 border-r-4 border-yellow-400 cursor-pointer hover:shadow-md transition-shadow"
          @click="activeTab = 'predictions'"
        >
          <div class="flex items-center justify-between mb-3">
            <span class="text-3xl">⚠️</span>
            <span class="text-2xl font-bold text-yellow-600">
              {{ dashboard?.predictions?.at_risk_count || 0 }}
            </span>
          </div>
          <p class="text-sm font-medium text-gray-700">مستفيدون في خطر</p>
          <div class="mt-2 text-xs text-gray-500">تقدم متوقع أقل من 40%</div>
        </div>

        <!-- الإيرادات المتوقعة -->
        <div
          class="bg-white rounded-xl shadow-sm p-5 border-r-4 border-green-400 cursor-pointer hover:shadow-md transition-shadow"
          @click="activeTab = 'financial'"
        >
          <div class="flex items-center justify-between mb-3">
            <span class="text-3xl">💰</span>
            <span class="text-lg font-bold text-green-600">
              {{ formatCurrency(dashboard?.financial?.predicted_revenue) }}
            </span>
          </div>
          <p class="text-sm font-medium text-gray-700">إيرادات متوقعة (الشهر القادم)</p>
          <div class="mt-2 text-xs text-gray-500">
            {{ dashboard?.financial?.next_month_scheduled_sessions || 0 }} جلسة مجدولة ·
            {{ dashboard?.financial?.expected_attendance_rate || 0 }}% حضور متوقع
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-white rounded-xl shadow-sm mb-6">
        <div class="flex border-b overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            class="px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px"
            :class="
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            "
          >
            {{ tab.icon }} {{ tab.label }}
            <span
              v-if="tab.badge && tab.badge > 0"
              class="ml-1 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full"
            >
              {{ tab.badge }}
            </span>
          </button>
        </div>

        <!-- Tab Content -->
        <div class="p-5">
          <!-- تنبيهات -->
          <div v-if="activeTab === 'alerts'">
            <div class="flex items-center justify-between mb-4">
              <div class="flex gap-2">
                <select
                  v-model="alertFilter.severity"
                  class="text-sm border rounded-lg px-3 py-1.5"
                  @change="loadAlerts"
                >
                  <option value="">جميع الأولويات</option>
                  <option value="urgent">عاجل 🔴</option>
                  <option value="critical">حرج 🟠</option>
                  <option value="warning">تحذير 🟡</option>
                  <option value="info">معلومات 🔵</option>
                </select>
                <select
                  v-model="alertFilter.alert_type"
                  class="text-sm border rounded-lg px-3 py-1.5"
                  @change="loadAlerts"
                >
                  <option value="">جميع الأنواع</option>
                  <option value="no_progress">عدم تقدم</option>
                  <option value="high_absence">غياب مرتفع</option>
                  <option value="insurance_expiring">تأمين منتهٍ</option>
                  <option value="dropout_risk">خطر انسحاب</option>
                  <option value="caseload_limit">سقف حالات</option>
                  <option value="financial_risk">خطر مالي</option>
                  <option value="vacant_slot">مقاعد شاغرة</option>
                </select>
                <button
                  @click="markAllRead"
                  class="text-sm text-blue-600 hover:underline px-2"
                >
                  تحديد الكل كمقروء
                </button>
              </div>
              <span class="text-sm text-gray-500">{{ alerts.total || 0 }} تنبيه</span>
            </div>

            <div class="space-y-3">
              <div
                v-for="alert in alerts.data"
                :key="alert._id"
                class="flex items-start gap-3 p-4 rounded-lg border hover:shadow-sm transition-shadow"
                :class="[alertBgClass(alert.severity), alert.is_read ? 'opacity-60' : '']"
              >
                <span class="text-xl mt-0.5">{{ alertIcon(alert.alert_type) }}</span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      :class="severityBadge(alert.severity)"
                    >
                      {{ severityLabel(alert.severity) }}
                    </span>
                    <span class="text-xs text-gray-400">{{ formatDate(alert.created_at) }}</span>
                    <span v-if="!alert.is_read" class="w-2 h-2 bg-blue-500 rounded-full"></span>
                  </div>
                  <p class="text-sm text-gray-800 font-medium">{{ alert.message_ar }}</p>
                  <div v-if="alert.suggested_actions?.length" class="mt-2 flex flex-wrap gap-2">
                    <button
                      v-for="action in alert.suggested_actions"
                      :key="action.action"
                      @click="takeAlertAction(alert, action.action)"
                      class="text-xs px-2 py-1 bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600"
                    >
                      {{ action.label_ar }}
                    </button>
                  </div>
                </div>
                <button
                  v-if="!alert.is_read"
                  @click="markAlertRead(alert._id)"
                  class="text-xs text-gray-400 hover:text-gray-600 shrink-0"
                  title="تحديد كمقروء"
                >
                  ✓
                </button>
              </div>
              <div v-if="!alerts.data?.length" class="text-center py-10 text-gray-400">
                <span class="text-4xl block mb-2">✅</span>
                لا توجد تنبيهات حالياً
              </div>
            </div>

            <!-- Pagination -->
            <div v-if="alerts.totalPages > 1" class="mt-4 flex justify-center gap-2">
              <button
                v-for="page in alerts.totalPages"
                :key="page"
                @click="loadAlerts(page)"
                class="px-3 py-1 text-sm rounded border"
                :class="alerts.page === page ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'"
              >
                {{ page }}
              </button>
            </div>
          </div>

          <!-- تنبؤات -->
          <div v-if="activeTab === 'predictions'">
            <div class="mb-4 flex items-center justify-between">
              <div class="flex gap-2">
                <input
                  v-model="predictionSearch"
                  type="text"
                  placeholder="بحث بالمستفيد..."
                  class="text-sm border rounded-lg px-3 py-1.5 w-48"
                />
                <select v-model="predictionTypeFilter" class="text-sm border rounded-lg px-3 py-1.5">
                  <option value="">جميع الأنواع</option>
                  <option value="progress">تقدم</option>
                  <option value="dropout_risk">خطر انسحاب</option>
                  <option value="attendance">حضور</option>
                </select>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-gray-50 text-gray-600">
                    <th class="text-right px-4 py-3 font-medium">المستفيد</th>
                    <th class="text-right px-4 py-3 font-medium">نوع التنبؤ</th>
                    <th class="text-center px-4 py-3 font-medium">القيمة المتوقعة</th>
                    <th class="text-center px-4 py-3 font-medium">الثقة</th>
                    <th class="text-center px-4 py-3 font-medium">تاريخ الهدف</th>
                    <th class="text-center px-4 py-3 font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr
                    v-for="pred in filteredPredictions"
                    :key="pred._id"
                    class="hover:bg-gray-50"
                  >
                    <td class="px-4 py-3">
                      {{ pred.beneficiary_id?.name_ar || '—' }}
                    </td>
                    <td class="px-4 py-3">
                      <span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
                        {{ predictionTypeLabel(pred.prediction_type) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <div class="flex items-center justify-center gap-2">
                        <div class="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            class="h-2 rounded-full"
                            :class="progressColor(pred.predicted_value)"
                            :style="{ width: `${pred.predicted_value * 100}%` }"
                          ></div>
                        </div>
                        <span>{{ Math.round(pred.predicted_value * 100) }}%</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center text-gray-600">
                      {{ Math.round(pred.confidence * 100) }}%
                    </td>
                    <td class="px-4 py-3 text-center text-gray-500">
                      {{ formatDateShort(pred.target_date) }}
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span
                        class="px-2 py-0.5 rounded-full text-xs"
                        :class="pred.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                      >
                        {{ pred.status === 'active' ? 'نشط' : 'منتهٍ' }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="!filteredPredictions.length">
                    <td colspan="6" class="text-center py-10 text-gray-400">لا توجد تنبؤات</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- الاقتراحات -->
          <div v-if="activeTab === 'suggestions'">
            <div class="space-y-4">
              <div
                v-for="suggestion in suggestions.data"
                :key="suggestion._id"
                class="border rounded-xl p-5 hover:shadow-sm transition-shadow"
                :class="suggestion.status === 'pending' ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-sm font-semibold text-gray-800">
                        {{ suggestion.beneficiary_id?.name_ar || 'عام' }}
                      </span>
                      <span
                        class="px-2 py-0.5 text-xs rounded-full"
                        :class="priorityBadge(suggestion.priority)"
                      >
                        {{ priorityLabel(suggestion.priority) }}
                      </span>
                      <span class="text-xs text-gray-400">
                        {{ Math.round(suggestion.confidence_score * 100) }}% ثقة
                      </span>
                    </div>
                    <p class="text-sm text-gray-600 mb-3">
                      {{ suggestionTypeLabel(suggestion.suggestion_type) }}
                      — بناءً على {{ suggestion.content?.based_on_similar_cases || 0 }} حالة مشابهة
                    </p>

                    <!-- الأهداف المقترحة -->
                    <div
                      v-if="suggestion.content?.suggested_goals?.length"
                      class="space-y-1"
                    >
                      <p class="text-xs font-medium text-gray-500 mb-1">الأهداف المقترحة:</p>
                      <div
                        v-for="(goal, idx) in suggestion.content.suggested_goals.slice(0, 3)"
                        :key="idx"
                        class="flex items-center gap-2 text-xs text-gray-700"
                      >
                        <span class="text-green-500">✓</span>
                        {{ goal.title_ar }}
                        <span class="text-gray-400">({{ goal.success_rate_in_similar_cases }}% نجاح)</span>
                      </div>
                      <p v-if="suggestion.content.suggested_goals.length > 3" class="text-xs text-blue-500">
                        + {{ suggestion.content.suggested_goals.length - 3 }} أهداف أخرى
                      </p>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div v-if="suggestion.status === 'pending'" class="flex flex-col gap-2 shrink-0">
                    <button
                      @click="reviewSuggestion(suggestion._id, 'accept')"
                      class="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                    >
                      ✓ قبول
                    </button>
                    <button
                      @click="reviewSuggestion(suggestion._id, 'reject')"
                      class="px-3 py-1.5 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200"
                    >
                      ✗ رفض
                    </button>
                  </div>
                  <div v-else class="shrink-0">
                    <span
                      class="px-2 py-1 text-xs rounded-full"
                      :class="
                        suggestion.status === 'accepted'
                          ? 'bg-green-100 text-green-700'
                          : suggestion.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      "
                    >
                      {{
                        suggestion.status === 'accepted'
                          ? '✓ مقبول'
                          : suggestion.status === 'rejected'
                          ? '✗ مرفوض'
                          : suggestion.status
                      }}
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="!suggestions.data?.length" class="text-center py-10 text-gray-400">
                <span class="text-4xl block mb-2">💡</span>
                لا توجد اقتراحات حالياً
              </div>
            </div>
          </div>

          <!-- التقارير المولدة -->
          <div v-if="activeTab === 'reports'">
            <div class="flex items-center justify-between mb-4">
              <div class="flex gap-2">
                <select v-model="reportTypeFilter" class="text-sm border rounded-lg px-3 py-1.5">
                  <option value="">جميع الأنواع</option>
                  <option value="monthly_parent">تقرير شهري للأسرة</option>
                  <option value="quarterly_parent">تقرير ربع سنوي</option>
                  <option value="progress_summary">ملخص التقدم</option>
                </select>
                <select v-model="reportStatusFilter" class="text-sm border rounded-lg px-3 py-1.5">
                  <option value="">جميع الحالات</option>
                  <option value="draft">مسودة</option>
                  <option value="generated">مولّد</option>
                  <option value="approved">معتمد</option>
                  <option value="sent">مُرسل</option>
                </select>
              </div>
              <button
                @click="showGenerateReportModal = true"
                class="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
              >
                ✨ توليد تقرير جديد
              </button>
            </div>

            <div class="space-y-3">
              <div
                v-for="report in generatedReports.data"
                :key="report._id"
                class="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm"
              >
                <div>
                  <p class="text-sm font-medium text-gray-800">
                    {{ report.beneficiary_id?.name_ar }} —
                    {{ reportTypeLabel(report.report_type) }}
                  </p>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ formatDateShort(report.period_start) }} حتى
                    {{ formatDateShort(report.period_end) }}
                  </p>
                </div>
                <div class="flex items-center gap-3">
                  <span
                    class="px-2 py-0.5 text-xs rounded-full"
                    :class="reportStatusBadge(report.status)"
                  >
                    {{ reportStatusLabel(report.status) }}
                  </span>
                  <button
                    v-if="report.pdf_path"
                    @click="downloadReport(report._id)"
                    class="text-xs text-blue-600 hover:underline"
                  >
                    ⬇ PDF
                  </button>
                  <button
                    v-if="report.status === 'generated'"
                    @click="approveReport(report._id)"
                    class="text-xs text-green-600 hover:underline"
                  >
                    ✓ اعتماد
                  </button>
                </div>
              </div>

              <div v-if="!generatedReports.data?.length" class="text-center py-10 text-gray-400">
                <span class="text-4xl block mb-2">📄</span>
                لا توجد تقارير مولدة
              </div>
            </div>
          </div>

          <!-- اتجاهات KPI -->
          <div v-if="activeTab === 'kpi'">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Chart: نسبة الحضور -->
              <div class="bg-gray-50 rounded-xl p-4">
                <h3 class="text-sm font-semibold text-gray-700 mb-4">نسبة الحضور الشهرية</h3>
                <div v-if="kpiTrends.length" class="space-y-2">
                  <div v-for="month in kpiTrends" :key="month.month" class="flex items-center gap-3">
                    <span class="text-xs text-gray-500 w-20 shrink-0">{{ month.label }}</span>
                    <div class="flex-1 bg-gray-200 rounded-full h-3">
                      <div
                        class="h-3 rounded-full bg-blue-500 transition-all"
                        :style="{ width: `${month.attendance_rate}%` }"
                      ></div>
                    </div>
                    <span class="text-xs font-medium text-gray-700 w-10 text-left">
                      {{ month.attendance_rate }}%
                    </span>
                  </div>
                </div>
              </div>

              <!-- Chart: متوسط الأداء -->
              <div class="bg-gray-50 rounded-xl p-4">
                <h3 class="text-sm font-semibold text-gray-700 mb-4">متوسط الأداء الشهري</h3>
                <div v-if="kpiTrends.length" class="space-y-2">
                  <div v-for="month in kpiTrends" :key="month.month" class="flex items-center gap-3">
                    <span class="text-xs text-gray-500 w-20 shrink-0">{{ month.label }}</span>
                    <div class="flex-1 bg-gray-200 rounded-full h-3">
                      <div
                        class="h-3 rounded-full transition-all"
                        :class="month.avg_performance >= 70 ? 'bg-green-500' : 'bg-yellow-500'"
                        :style="{ width: `${month.avg_performance}%` }"
                      ></div>
                    </div>
                    <span class="text-xs font-medium text-gray-700 w-10 text-left">
                      {{ month.avg_performance }}%
                    </span>
                  </div>
                </div>
              </div>

              <!-- Stats Cards -->
              <div class="bg-gray-50 rounded-xl p-4 lg:col-span-2">
                <h3 class="text-sm font-semibold text-gray-700 mb-4">الجلسات الشهرية</h3>
                <div class="flex items-end gap-2 h-24">
                  <div
                    v-for="month in kpiTrends"
                    :key="month.month"
                    class="flex-1 flex flex-col items-center gap-1"
                  >
                    <span class="text-xs text-gray-600">{{ month.total_sessions }}</span>
                    <div
                      class="w-full bg-blue-400 rounded-t"
                      :style="{
                        height: `${Math.max(8, (month.total_sessions / maxSessions) * 80)}px`,
                      }"
                    ></div>
                    <span class="text-xs text-gray-400 truncate w-full text-center">{{
                      month.label?.split(' ')[0]
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- الإعدادات -->
          <div v-if="activeTab === 'settings'">
            <div class="space-y-4">
              <div
                v-for="model in modelConfigs"
                :key="model._id"
                class="border rounded-xl p-5"
              >
                <div class="flex items-start justify-between">
                  <div>
                    <h3 class="font-semibold text-gray-800">{{ model.model_name }}</h3>
                    <p class="text-xs text-gray-500 mt-0.5">{{ model.description_ar || model.model_type }}</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      :checked="model.is_active"
                      @change="toggleModel(model._id, $event.target.checked)"
                      class="sr-only peer"
                    />
                    <div
                      class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
                    ></div>
                  </label>
                </div>

                <div v-if="model.accuracy_score" class="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div class="bg-gray-50 rounded-lg p-2">
                    <span class="text-gray-500">الدقة:</span>
                    <span class="font-semibold text-gray-800 mr-1">
                      {{ Math.round(model.accuracy_score * 100) }}%
                    </span>
                  </div>
                  <div class="bg-gray-50 rounded-lg p-2">
                    <span class="text-gray-500">آخر تقييم:</span>
                    <span class="font-semibold text-gray-800 mr-1">
                      {{ model.last_evaluated_at ? formatDateShort(model.last_evaluated_at) : '—' }}
                    </span>
                  </div>
                  <div class="bg-gray-50 rounded-lg p-2">
                    <span class="text-gray-500">بيانات التدريب:</span>
                    <span class="font-semibold text-gray-800 mr-1">
                      {{ model.training_data_count || 0 }}
                    </span>
                  </div>
                  <div class="bg-gray-50 rounded-lg p-2">
                    <span class="text-gray-500">الإصدار:</span>
                    <span class="font-semibold text-gray-800 mr-1">{{ model.version }}</span>
                  </div>
                </div>

                <div class="mt-3 flex items-center gap-3">
                  <label class="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      :checked="model.auto_retrain"
                      @change="updateModelAutoRetrain(model._id, $event.target.checked)"
                    />
                    إعادة تدريب تلقائية
                  </label>
                  <select
                    v-if="model.auto_retrain"
                    :value="model.retrain_frequency"
                    @change="updateModelFrequency(model._id, $event.target.value)"
                    class="text-xs border rounded px-2 py-1"
                  >
                    <option value="daily">يومياً</option>
                    <option value="weekly">أسبوعياً</option>
                    <option value="monthly">شهرياً</option>
                  </select>
                </div>
              </div>

              <div v-if="!modelConfigs.length" class="text-center py-10 text-gray-400">
                لا توجد نماذج مكوّنة
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Generate Report Modal -->
    <div
      v-if="showGenerateReportModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showGenerateReportModal = false"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 class="text-lg font-bold mb-5">✨ توليد تقرير بالذكاء الاصطناعي</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">المستفيد</label>
            <select
              v-model="generateForm.beneficiary_id"
              class="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">اختر المستفيد...</option>
              <option v-for="b in beneficiariesList" :key="b._id" :value="b._id">
                {{ b.name_ar }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">الشهر</label>
            <input
              type="month"
              v-model="generateForm.month"
              class="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">اللغة</label>
            <div class="flex gap-3">
              <label class="flex items-center gap-2 text-sm">
                <input type="radio" v-model="generateForm.language" value="ar" />
                عربي
              </label>
              <label class="flex items-center gap-2 text-sm">
                <input type="radio" v-model="generateForm.language" value="en" />
                English
              </label>
              <label class="flex items-center gap-2 text-sm">
                <input type="radio" v-model="generateForm.language" value="both" />
                كلاهما
              </label>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button
            @click="showGenerateReportModal = false"
            class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            إلغاء
          </button>
          <button
            @click="generateReport"
            :disabled="!generateForm.beneficiary_id || !generateForm.month || generatingReport"
            class="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {{ generatingReport ? 'جارٍ التوليد...' : '✨ توليد' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <transition name="fade">
      <div
        v-if="toast.show"
        class="fixed bottom-4 left-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm text-white"
        :class="toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'"
      >
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'

// ─── State ──────────────────────────────────────────────────────────────────
const loading = ref(true)
const dashboard = ref(null)
const alerts = ref({ data: [], total: 0, totalPages: 1, page: 1 })
const predictions = ref([])
const suggestions = ref({ data: [] })
const generatedReports = ref({ data: [] })
const modelConfigs = ref([])
const branches = ref([])
const beneficiariesList = ref([])

const selectedBranch = ref('')
const activeTab = ref('alerts')
const runningChecks = ref(false)
const showGenerateReportModal = ref(false)
const generatingReport = ref(false)

const alertFilter = ref({ severity: '', alert_type: '' })
const predictionSearch = ref('')
const predictionTypeFilter = ref('')
const reportTypeFilter = ref('')
const reportStatusFilter = ref('')

const generateForm = ref({
  beneficiary_id: '',
  month: new Date().toISOString().slice(0, 7),
  language: 'ar',
})

const toast = ref({ show: false, message: '', type: 'success' })

// ─── Computed ────────────────────────────────────────────────────────────────
const alertsBorderClass = computed(() => {
  const alerts = dashboard.value?.alerts
  if (!alerts) return 'border-gray-200'
  if (alerts.urgent > 0) return 'border-red-500'
  if (alerts.critical > 0) return 'border-orange-400'
  if (alerts.warning > 0) return 'border-yellow-400'
  return 'border-gray-200'
})

const tabs = computed(() => [
  {
    key: 'alerts',
    label: 'التنبيهات',
    icon: '🔔',
    badge: dashboard.value?.alerts?.total_unread,
  },
  { key: 'predictions', label: 'التنبؤات', icon: '📈', badge: null },
  {
    key: 'suggestions',
    label: 'الاقتراحات',
    icon: '💡',
    badge: dashboard.value?.suggestions?.pending,
  },
  { key: 'reports', label: 'التقارير', icon: '📄', badge: null },
  { key: 'kpi', label: 'مؤشرات الأداء', icon: '📊', badge: null },
  { key: 'settings', label: 'إعدادات النماذج', icon: '⚙️', badge: null },
])

const kpiTrends = computed(() => dashboard.value?.kpi_trends || [])

const maxSessions = computed(() => Math.max(...kpiTrends.value.map((m) => m.total_sessions), 1))

const filteredPredictions = computed(() => {
  let result = predictions.value
  if (predictionSearch.value) {
    const q = predictionSearch.value.toLowerCase()
    result = result.filter((p) => (p.beneficiary_id?.name_ar || '').toLowerCase().includes(q))
  }
  if (predictionTypeFilter.value) {
    result = result.filter((p) => p.prediction_type === predictionTypeFilter.value)
  }
  return result
})

// ─── Lifecycle ───────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([loadDashboard(), loadBranches(), loadBeneficiaries()])
  loading.value = false
  await Promise.all([loadAlerts(), loadPredictions(), loadSuggestions(), loadReports(), loadModels()])
})

watch(activeTab, (tab) => {
  if (tab === 'alerts') loadAlerts()
  if (tab === 'predictions') loadPredictions()
  if (tab === 'suggestions') loadSuggestions()
  if (tab === 'reports') loadReports()
  if (tab === 'settings') loadModels()
})

// ─── API Calls ───────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const params = selectedBranch.value ? { branch_id: selectedBranch.value } : {}
    const res = await axios.get('/api/ai-analytics/dashboard', { params })
    dashboard.value = res.data
  } catch (err) {
    console.error('Failed to load AI dashboard', err)
  }
}

async function loadBranches() {
  try {
    const res = await axios.get('/api/branches')
    branches.value = res.data?.data || res.data || []
  } catch {}
}

async function loadBeneficiaries() {
  try {
    const res = await axios.get('/api/beneficiaries', { params: { limit: 200, status: 'active' } })
    beneficiariesList.value = res.data?.data || res.data || []
  } catch {}
}

async function loadAlerts(page = 1) {
  try {
    const params = {
      page,
      per_page: 15,
      branch_id: selectedBranch.value || undefined,
      severity: alertFilter.value.severity || undefined,
      alert_type: alertFilter.value.alert_type || undefined,
      is_read: false,
    }
    const res = await axios.get('/api/ai-analytics/alerts', { params })
    alerts.value = {
      data: res.data.data || res.data.docs || [],
      total: res.data.total || res.data.totalDocs || 0,
      totalPages: res.data.totalPages || res.data.pages || 1,
      page,
    }
  } catch (err) {
    console.error('Failed to load alerts', err)
  }
}

async function loadPredictions() {
  try {
    const res = await axios.get('/api/ai-analytics/predictions', {
      params: { branch_id: selectedBranch.value || undefined, per_page: 50 },
    })
    predictions.value = res.data?.data || res.data?.docs || []
  } catch {}
}

async function loadSuggestions() {
  try {
    const res = await axios.get('/api/ai-analytics/suggestions', {
      params: { branch_id: selectedBranch.value || undefined, per_page: 20 },
    })
    suggestions.value = { data: res.data?.data || res.data?.docs || [] }
  } catch {}
}

async function loadReports() {
  try {
    const params = {
      branch_id: selectedBranch.value || undefined,
      report_type: reportTypeFilter.value || undefined,
      status: reportStatusFilter.value || undefined,
      per_page: 20,
    }
    const res = await axios.get('/api/ai-analytics/reports', { params })
    generatedReports.value = { data: res.data?.data || res.data?.docs || [] }
  } catch {}
}

async function loadModels() {
  try {
    const res = await axios.get('/api/ai-analytics/models')
    modelConfigs.value = res.data || []
  } catch {}
}

async function markAlertRead(alertId) {
  try {
    await axios.put(`/api/ai-analytics/alerts/${alertId}/read`)
    await loadAlerts()
    await loadDashboard()
  } catch {}
}

async function markAllRead() {
  try {
    await axios.post('/api/ai-analytics/alerts/read-all', {
      branch_id: selectedBranch.value || undefined,
    })
    await loadAlerts()
    await loadDashboard()
    showToast('تم تحديد جميع التنبيهات كمقروءة')
  } catch {}
}

async function takeAlertAction(alert, action) {
  try {
    await axios.post(`/api/ai-analytics/alerts/${alert._id}/action`, { action })
    await loadAlerts()
    showToast('تم تسجيل الإجراء بنجاح')
  } catch {}
}

async function reviewSuggestion(suggestionId, action) {
  try {
    await axios.post(`/api/ai-analytics/suggestions/${suggestionId}/review`, { action })
    await loadSuggestions()
    await loadDashboard()
    showToast(action === 'accept' ? 'تم قبول الاقتراح' : 'تم رفض الاقتراح')
  } catch {}
}

async function approveReport(reportId) {
  try {
    await axios.put(`/api/ai-analytics/reports/${reportId}/approve`)
    await loadReports()
    showToast('تم اعتماد التقرير')
  } catch {}
}

async function generateReport() {
  if (!generateForm.value.beneficiary_id || !generateForm.value.month) return
  generatingReport.value = true
  try {
    await axios.post('/api/ai-analytics/reports/generate', generateForm.value)
    showGenerateReportModal.value = false
    await loadReports()
    showToast('تم توليد التقرير بنجاح')
  } catch (err) {
    showToast('فشل توليد التقرير', 'error')
  } finally {
    generatingReport.value = false
  }
}

async function downloadReport(reportId) {
  try {
    const res = await axios.get(`/api/ai-analytics/reports/${reportId}`)
    if (res.data?.pdf_path) {
      window.open(`/api/files/${res.data.pdf_path}`, '_blank')
    }
  } catch {}
}

async function toggleModel(modelId, isActive) {
  try {
    await axios.put(`/api/ai-analytics/models/${modelId}`, { is_active: isActive })
    await loadModels()
  } catch {}
}

async function updateModelAutoRetrain(modelId, autoRetrain) {
  try {
    await axios.put(`/api/ai-analytics/models/${modelId}`, { auto_retrain: autoRetrain })
    await loadModels()
  } catch {}
}

async function updateModelFrequency(modelId, frequency) {
  try {
    await axios.put(`/api/ai-analytics/models/${modelId}`, { retrain_frequency: frequency })
  } catch {}
}

async function runManualChecks() {
  runningChecks.value = true
  try {
    const res = await axios.post('/api/ai-analytics/run-checks', {
      branch_id: selectedBranch.value || undefined,
    })
    const total = Object.values(res.data.alerts || {}).reduce((s, c) => s + c, 0)
    showToast(`اكتملت الفحوصات — ${total} تنبيه جديد`)
    await Promise.all([loadDashboard(), loadAlerts()])
  } catch {
    showToast('فشلت الفحوصات', 'error')
  } finally {
    runningChecks.value = false
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => (toast.value.show = false), 3000)
}

function formatPercent(val) {
  if (!val && val !== 0) return 'N/A'
  return `${Math.round(val * 100)}%`
}

function formatCurrency(val) {
  if (!val) return '0 ر.س'
  return `${Number(val).toLocaleString('ar-SA')} ر.س`
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
}

function alertBgClass(severity) {
  return {
    urgent: 'border-red-200 bg-red-50',
    critical: 'border-orange-200 bg-orange-50',
    warning: 'border-yellow-200 bg-yellow-50',
    info: 'border-blue-200 bg-blue-50',
  }[severity] || 'border-gray-200'
}

function severityBadge(severity) {
  return {
    urgent: 'bg-red-100 text-red-700',
    critical: 'bg-orange-100 text-orange-700',
    warning: 'bg-yellow-100 text-yellow-700',
    info: 'bg-blue-100 text-blue-700',
  }[severity] || 'bg-gray-100 text-gray-600'
}

function severityLabel(s) {
  return { urgent: 'عاجل', critical: 'حرج', warning: 'تحذير', info: 'معلومات' }[s] || s
}

function alertIcon(type) {
  const icons = {
    no_progress: '📉', high_absence: '📅', insurance_expiring: '🏥',
    vacant_slot: '💺', caseload_limit: '👤', performance_drop: '⬇️',
    pattern_detected: '🔍', financial_risk: '💳', dropout_risk: '🚪',
  }
  return icons[type] || '⚠️'
}

function predictionTypeLabel(type) {
  return {
    progress: 'تقدم علاجي', dropout_risk: 'خطر انسحاب',
    attendance: 'حضور', outcome: 'نتيجة', plan_completion: 'إتمام الخطة',
  }[type] || type
}

function progressColor(val) {
  if (val >= 0.7) return 'bg-green-500'
  if (val >= 0.4) return 'bg-yellow-500'
  return 'bg-red-500'
}

function priorityBadge(priority) {
  return {
    high: 'bg-red-100 text-red-700', medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-gray-100 text-gray-600',
  }[priority] || 'bg-gray-100 text-gray-600'
}

function priorityLabel(p) {
  return { high: 'عالي', medium: 'متوسط', low: 'منخفض' }[p] || p
}

function suggestionTypeLabel(type) {
  return {
    goals: 'اقتراح أهداف علاجية', session_count: 'عدد الجلسات المقترح',
    schedule_optimization: 'تحسين الجدول', activities: 'أنشطة مقترحة',
  }[type] || type
}

function reportTypeLabel(type) {
  return {
    monthly_parent: 'تقرير شهري للأسرة', quarterly_parent: 'تقرير ربع سنوي',
    regulatory: 'تقرير تنظيمي', progress_summary: 'ملخص التقدم', discharge: 'تقرير الخروج',
  }[type] || type
}

function reportStatusBadge(status) {
  return {
    draft: 'bg-gray-100 text-gray-600', generated: 'bg-blue-100 text-blue-700',
    reviewed: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700',
    sent: 'bg-purple-100 text-purple-700',
  }[status] || 'bg-gray-100 text-gray-600'
}

function reportStatusLabel(status) {
  return {
    draft: 'مسودة', generated: 'مولّد', reviewed: 'مراجَع',
    approved: 'معتمد', sent: 'مُرسل',
  }[status] || status
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
